import { embed } from 'ai';
import { getEmbeddingModel } from '../lib/ai';

// Mock Supabase RPC call for testing logic
async function mockMatchProfileEmbeddings(query: string) {
  console.log(`[Test] Searching for: "${query}"`);
  
  const embeddingModel = getEmbeddingModel();
  
  // 1. Generate embedding for query
  const { embedding } = await embed({
    model: embeddingModel as any,
    value: query,
  });

  console.log(`[Test] Generated embedding with length: ${embedding.length}`);

  // 2. Mock some "results" that would come from pgvector
  const mockMatches = [
    { chunk_text: "Ah Ma grew up in Chinatown and loves sewing.", similarity: 0.85 },
    { chunk_text: "Her grandson's name is Wei Kang.", similarity: 0.78 },
    { chunk_text: "She enjoys dim sum at Red Star Restaurant.", similarity: 0.72 },
  ];

  // Filter by threshold (mocking the SQL behavior)
  const threshold = 0.7;
  const filtered = mockMatches.filter(m => m.similarity > threshold).slice(0, 5);

  console.log(`[Test] Found ${filtered.length} matches above threshold ${threshold}`);
  return filtered;
}

async function runTest() {
  try {
    const results = await mockMatchProfileEmbeddings("Tell me about my grandson");
    console.log("[Test] Results:", JSON.stringify(results, null, 2));
    
    if (results.some(r => r.chunk_text.includes("Wei Kang"))) {
      console.log("✅ RAG logic test PASSED: Correct context found.");
    } else {
      console.log("❌ RAG logic test FAILED: Context not found.");
    }
  } catch (err) {
    console.error("Test error:", err);
  }
}

runTest();
