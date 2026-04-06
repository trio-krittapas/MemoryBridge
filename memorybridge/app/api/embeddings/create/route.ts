import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEmbeddingModel } from '@/lib/ai';
import { embedMany } from 'ai';

export async function POST(req: Request) {
  try {
    const { patientId, profileData } = await req.json();

    if (!patientId || !profileData) {
      return NextResponse.json({ error: 'Missing patientId or profileData' }, { status: 400 });
    }

    const supabase = await createClient();
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

    return NextResponse.json({ 
      message: 'Successfully indexed life story', 
      chunkCount: chunks.length 
    });

  } catch (error: any) {
    console.error('Embedding creation error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
