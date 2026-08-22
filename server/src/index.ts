import { app } from './app';
import { config } from './config/env';
import { getDb } from './db';

async function startServer() {
  try {
    // 1. Initialize DB & execute migrations
    console.log('[Server] Connecting to database and running migrations...');
    await getDb();

    // 2. Start HTTP server
    app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(`🚀 Multi-Tenant RAG Backend Server running on port ${config.port}`);
      console.log(`📡 Environment: ${config.nodeEnv}`);
      console.log(`🧠 LLM Provider: ${config.llm.provider}`);
      console.log(`📊 Embedding Provider: ${config.embedding.provider}`);
      console.log(`====================================================`);
    });
  } catch (err: any) {
    console.error('[Server Start Error]', err);
    process.exit(1);
  }
}

startServer();
