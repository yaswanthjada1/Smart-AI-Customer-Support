import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // Database (PostgreSQL + pgvector)
  databaseUrl: process.env.DATABASE_URL || '',
  pgliteDir: process.env.PGLITE_DIR || path.resolve(__dirname, '../../data/pglite_db'),

  // Firebase Admin SDK
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'smart-ai-customer-suppor-24d0e',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'smart-ai-customer-suppor-24d0e.firebasestorage.app',
  },

  // Local AI (Ollama)
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    generationModel: process.env.OLLAMA_GENERATION_MODEL || 'qwen3:1.7b',
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'qwen3-embedding:0.6b',
  },

  // AI & Embeddings Provider Selection (Standardized on 1024 dimensions)
  llm: {
    provider: (process.env.LLM_PROVIDER || 'ollama') as 'ollama' | 'gemini' | 'openai' | 'mock',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'qwen3:1.7b',
  },
  embedding: {
    provider: (process.env.EMBEDDING_PROVIDER || 'ollama') as 'ollama' | 'gemini' | 'openai' | 'mock',
    apiKey: process.env.EMBEDDING_API_KEY || '',
    model: process.env.EMBEDDING_MODEL || 'qwen3-embedding:0.6b',
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1024', 10),
  },

  // File storage
  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'firebase') as 'firebase' | 'local',
    localDir: path.resolve(__dirname, '../../uploads'),
  },
};
