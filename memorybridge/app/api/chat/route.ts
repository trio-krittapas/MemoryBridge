import { streamText } from 'ai';
import { getModel } from '@/lib/ai';
import { SYSTEM_PROMPT } from '@/lib/prompts/system';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitHeaders, rateLimitResponse } from '@/lib/ratelimit';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

// Limits: 20 chat messages per user per hour
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Input guardrails
const MAX_MESSAGES = 40;          // max conversation history entries
const MAX_MESSAGE_LENGTH = 2000;  // chars per individual message

export async function POST(req: Request) {
  // 1. Authenticate — reject unauthenticated requests immediately
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Rate limiting (per authenticated user)
  const rl = checkRateLimit(`user:${user.id}:chat`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.allowed) return rateLimitResponse(rl);

  // 3. Parse & validate body
  let messages: any[], language: string | undefined;
  try {
    ({ messages, language } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages must be a non-empty array' }, { status: 400 });
  }

  // Clamp history length to prevent massive token payloads
  if (messages.length > MAX_MESSAGES) {
    messages = messages.slice(-MAX_MESSAGES);
  }

  // Truncate oversized message content
  messages = messages.map((m: any) => ({
    ...m,
    content: typeof m.content === 'string' && m.content.length > MAX_MESSAGE_LENGTH
      ? m.content.slice(0, MAX_MESSAGE_LENGTH)
      : m.content,
  }));

  // 0. Fetch Playlist Information
  let playlistContext = '';
  {
    const { data: playlists } = await supabase
      .from('memory_playlist')
      .select('spotify_track_id, track_name, artist, associated_memory')
      .eq('patient_id', user.id);

    if (playlists && playlists.length > 0) {
      playlistContext = "\n\nYou have access to the patient's favorite music:\n" +
        playlists.map(p => `- "${p.track_name}" by ${p.artist}. (Memory: ${p.associated_memory || 'No memory recorded'}) [ID: ${p.spotify_track_id}]`).join('\n') +
        "\nTo suggest playing a song, end your response with [PLAY_SONG:track_id]. Only do this when naturally relevant to the memory being discussed.";
    }
  }

  // Incorporate language preference if provided into the system prompt
  const languageContext = language ? `\nThe user prefers the following language/dialect: ${language}. Adapt your responses cleanly into this language.` : '';

  const model = getModel() as any;

  // 1. Current Date Context
  const currentDate = new Date().toLocaleDateString('en-SG', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const dateContext = `\n\nToday's date is ${currentDate}.`;

  // 1. RAG Search Logic
  let ragContext = '';
  const lastMessage = messages[messages.length - 1];

  if (lastMessage?.role === 'user' && lastMessage.content.split(' ').length > 5) {
    try {
      const { embed } = await import('ai');
      const { getEmbeddingModel } = await import('@/lib/ai');
      
      const { embedding } = await embed({
        model: getEmbeddingModel() as any,
        value: lastMessage.content,
      });

      const { data: matches } = await supabase.rpc('match_profile_embeddings', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5,
        p_patient_id: user.id,
      });

      if (matches && matches.length > 0) {
        ragContext = "\n\nRelevant patient background for this conversation:\n" + 
          matches.map((m: any) => `- ${m.chunk_text}`).join('\n');
      }
    } catch (err) {
      console.error('RAG Search failed:', err);
    }
  }

  // 2. Save the latest user message
  if (lastMessage?.role === 'user') {
    await supabase.from('chat_messages').insert({
      patient_id: user.id,
      role: 'user',
      content: lastMessage.content,
      language: language || null,
    });
  }

  let result;
  try {
    result = streamText({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + dateContext + languageContext + ragContext + playlistContext },
        ...messages
      ],
      async onFinish({ text }) {
        await supabase.from('chat_messages').insert({
          patient_id: user.id,
          role: 'assistant',
          content: text,
          language: language || null,
          metadata: ragContext ? { rag_used: true } : null,
        });
      },
    });
  } catch (err: any) {
    // Catch connection errors (e.g. Ollama not running)
    const isConnectionError =
      err?.cause?.code === 'ECONNREFUSED' ||
      err?.message?.includes('ECONNREFUSED') ||
      err?.message?.includes('fetch failed') ||
      err?.message?.includes('connect ECONNREFUSED');

    if (isConnectionError) {
      console.error('LLM provider unreachable:', err?.message);
      return NextResponse.json(
        { error: 'The chat service is currently unavailable. Please ensure Ollama is running, or contact support.' },
        { status: 503 }
      );
    }
    console.error('streamText error:', err);
    return NextResponse.json({ error: 'Failed to generate response. Please try again.' }, { status: 500 });
  }

  // Attach rate-limit headers to the streaming response
  const response = result.toTextStreamResponse();
  const headers = new Headers(response.headers);
  Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}
