import { createOllama } from 'ollama-ai-provider';
import { createOpenAI } from '@ai-sdk/openai';

const provider = process.env.LLM_PROVIDER || 'ollama';

const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api',
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export function getModel() {
  if (provider === 'openai') {
    return openai('gpt-4o-mini');
  }
  return ollama(process.env.OLLAMA_CHAT_MODEL || 'qwen2.5:7b');
}

export function getEmbeddingModel() {
  if (provider === 'openai') {
    return openai.textEmbeddingModel('text-embedding-3-small');
  }
  return ollama.textEmbeddingModel(process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text');
}
