import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEmbeddingModel } from '@/lib/ai';
import { embedMany } from 'ai';
import { checkRateLimit, rateLimitHeaders, rateLimitResponse } from '@/lib/ratelimit';

// Limits: 5 create requests per user per day (this is a heavy, one-time-ish operation)
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cap total profile text to prevent enormous embedding jobs
const MAX_PROFILE_TEXT_LENGTH = 20_000; // chars

export async function POST(req: Request) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit
    const rl = checkRateLimit(`user:${user.id}:embeddings-create`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.allowed) return rateLimitResponse(rl);

    const { patientId, profileData } = await req.json();

    if (!patientId || !profileData) {
      return NextResponse.json({ error: 'Missing patientId or profileData' }, { status: 400 });
    }

    // 3. Ownership check — only allow users to index their own profile
    if (patientId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Validate profileData — each field is a string, cap total length
    if (typeof profileData !== 'object' || Array.isArray(profileData)) {
      return NextResponse.json({ error: 'profileData must be an object' }, { status: 400 });
    }

    const totalLength = Object.values(profileData as Record<string, unknown>)
      .filter((v): v is string => typeof v === 'string')
      .reduce((sum, s) => sum + s.length, 0);

    if (totalLength > MAX_PROFILE_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Profile text exceeds the ${MAX_PROFILE_TEXT_LENGTH.toLocaleString()} character limit` },
        { status: 400 },
      );
    }

    const embeddingModel = getEmbeddingModel();

    // 1. Delete old embeddings for this patient
    const { error: deleteError } = await supabase
      .from('profile_embeddings')
      .delete()
      .eq('patient_id', patientId);

    if (deleteError) {
      console.error('Error deleting old embeddings:', deleteError);
      return NextResponse.json({ error: 'Failed to clear old context' }, { status: 500 });
    }

    // 2. Prepare chunks for embedding
    const chunks: { section: string; text: string }[] = [];
    
    Object.entries(profileData).forEach(([section, content]) => {
      if (!content || typeof content !== 'string') return;

      // Simple paragraph-based chunking
      const sections = content.split(/\n\s*\n/).filter(s => s.trim().length > 0);
      
      sections.forEach(text => {
        // If a section is very long, we could further split it, but usually these are short
        if (text.length > 1000) {
          // Rudimentary sentence-based splitting for long paragraphs
          const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
          let currentChunk = '';
          sentences.forEach(sentence => {
            if ((currentChunk + sentence).length > 1000) {
              chunks.push({ section, text: currentChunk.trim() });
              currentChunk = sentence;
            } else {
              currentChunk += sentence;
            }
          });
          if (currentChunk) chunks.push({ section, text: currentChunk.trim() });
        } else {
          chunks.push({ section, text: text.trim() });
        }
      });
    });

    if (chunks.length === 0) {
      return NextResponse.json({ message: 'No content to index' });
    }

    // 3. Generate embeddings
    const { embeddings } = await embedMany({
      model: embeddingModel as any,
      values: chunks.map(c => c.text),
    });

    // 4. Store in database
    const insertData = chunks.map((chunk, i) => ({
      patient_id: patientId,
      chunk_text: chunk.text,
      embedding: embeddings[i],
    }));

    const { error: insertError } = await supabase
      .from('profile_embeddings')
      .insert(insertData);

    if (insertError) {
      console.error('Error storing embeddings:', insertError);
      return NextResponse.json({ error: 'Failed to store context' }, { status: 500 });
    }

    return NextResponse.json(
      { message: 'Successfully indexed life story', chunkCount: chunks.length },
      { headers: rateLimitHeaders(rl) },
    );

  } catch (error: any) {
    console.error('Embedding creation error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
