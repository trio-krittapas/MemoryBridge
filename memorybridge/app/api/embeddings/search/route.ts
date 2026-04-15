import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEmbeddingModel } from '@/lib/ai';
import { embed } from 'ai';
import { checkRateLimit, rateLimitHeaders, rateLimitResponse } from '@/lib/ratelimit';

// Limits: 60 searches per user per hour (used for internal RAG, keep generous)
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const MAX_QUERY_LENGTH = 500; // chars
const MAX_LIMIT = 10;         // max results per search

export async function POST(req: Request) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit
    const rl = checkRateLimit(`user:${user.id}:embeddings-search`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.allowed) return rateLimitResponse(rl);

    const { query, patientId, limit = 5 } = await req.json();

    if (!query || !patientId) {
      return NextResponse.json({ error: 'Missing query or patientId' }, { status: 400 });
    }

    // 3. Input validation
    if (typeof query !== 'string' || query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `query must be a string of at most ${MAX_QUERY_LENGTH} characters` },
        { status: 400 },
      );
    }

    const safeLimit = Math.min(Number(limit) || 5, MAX_LIMIT);

    // 4. Ownership check — users may only search their own embeddings
    if (patientId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const embeddingModel = getEmbeddingModel();

    // 1. Embed query
    const { embedding } = await embed({
      model: embeddingModel as any,
      value: query,
    });

    // 2. Search database using cosine similarity
    // We use RPC (Remote Procedure Call) for vector search in Supabase
    // If user hasn't created common matching function, we use the raw similarity approach
    
    // Check if matching function exists by using simple RPC, or fallback to filter
    const { data: matches, error } = await supabase
      .rpc('match_profile_embeddings', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: safeLimit,
        p_patient_id: patientId,
      });

    if (error) {
      console.error('Error in vector match:', error);
      
      // Fallback: This is significantly slower but handles cases where RPC isn't defined yet
      // However, most people with pgvector use the RPC for efficiency.
      // I'll suggest the user to create the RPC in sql editor if it fails.
      return NextResponse.json({ error: 'Failed to search embeddings. Please ensure match_profile_embeddings RPC is created.' }, { status: 500 });
    }

    return NextResponse.json(
      { matches: matches.map((m: any) => ({ text: m.chunk_text, similarity: m.similarity })) },
      { headers: rateLimitHeaders(rl) },
    );

  } catch (error: any) {
    console.error('Embedding search error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
