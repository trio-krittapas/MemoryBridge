import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEmbeddingModel } from '@/lib/ai';
import { embed } from 'ai';

export async function POST(req: Request) {
  try {
    const { query, patientId, limit = 5 } = await req.json();

    if (!query || !patientId) {
      return NextResponse.json({ error: 'Missing query or patientId' }, { status: 400 });
    }

    const supabase = await createClient();
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
        match_count: limit,
        p_patient_id: patientId,
      });

    if (error) {
      console.error('Error in vector match:', error);
      
      // Fallback: This is significantly slower but handles cases where RPC isn't defined yet
      // However, most people with pgvector use the RPC for efficiency.
      // I'll suggest the user to create the RPC in sql editor if it fails.
      return NextResponse.json({ error: 'Failed to search embeddings. Please ensure match_profile_embeddings RPC is created.' }, { status: 500 });
    }

    return NextResponse.json({ 
      matches: matches.map((m: any) => ({
        text: m.chunk_text,
        similarity: m.similarity,
      }))
    });

  } catch (error: any) {
    console.error('Embedding search error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
