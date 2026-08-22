import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import appApiRouter from './routes/appApi';
import publicApiRouter from './routes/publicApi';
import apiV1Router from './routes/apiV1';
import { appApiRateLimiter } from './middleware/rateLimit';
import { OllamaProvider } from './services/ai/ollamaProvider';
import { config } from './config/env';

export const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve static assets (widget.js, demo pages)
const clientPublicDir = path.resolve(__dirname, '../../client/public');
app.use(express.static(clientPublicDir));

// System Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Multi-Tenant RAG API',
  });
});

// Local AI (Ollama) Health Check
app.get('/api/health/ai', async (req: Request, res: Response) => {
  const ollama = new OllamaProvider(
    config.ollama.baseUrl,
    config.ollama.generationModel,
    config.ollama.embeddingModel
  );
  const health = await ollama.checkHealth();

  if (!health.available) {
    res.status(503).json(health);
    return;
  }

  res.json(health);
});

// 1. Public API (Rate-limited customer embed widget & public chat)
app.use('/api/public', publicApiRouter);

// 2. Business REST API v1 (API Key authenticated)
app.use('/api/v1', apiV1Router);

// 3. App API routes (Dashboard & authenticated user operations)
app.use('/api/app', appApiRateLimiter, appApiRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error Handler]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});
