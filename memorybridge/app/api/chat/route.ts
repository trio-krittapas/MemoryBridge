import { streamText } from 'ai';
import { getModel } from '@/lib/ai';
import { SYSTEM_PROMPT } from '@/lib/prompts/system';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, language } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 0. Fetch Playlist Information
  let playlistContext = '';
  if (user) {
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

  // 1. RAG Search Logic
  let ragContext = '';
  const lastMessage = messages[messages.length - 1];
  
  if (user && lastMessage?.role === 'user' && lastMessage.content.split(' ').length > 5) {
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
  if (user && lastMessage?.role === 'user') {
    await supabase.from('chat_messages').insert({
      patient_id: user.id,
      role: 'user',
      content: lastMessage.content,
      language: language || null,
    });
  }

  const result = streamText({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + languageContext + ragContext + playlistContext },
      ...messages
    ],
    async onFinish({ text }) {
      if (user) {
        await supabase.from('chat_messages').insert({
          patient_id: user.id,
          role: 'assistant',
          content: text,
          language: language || null,
          metadata: ragContext ? { rag_used: true } : null
        });
      }
    }
  });

  return (result as any).toDataStreamResponse ? (result as any).toDataStreamResponse() : (result as any).toTextStreamResponse();
}
