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

// 1. Iframe & Security Headers Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // If public widget route, embed script, or public API, permit iframe embedding from any host
  if (
    req.path.startsWith('/api/public') ||
    req.path.startsWith('/widget') ||
    req.path.endsWith('widget.js') ||
    req.path.endsWith('demo.html') ||
    req.path.endsWith('test-embed.html')
  ) {
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.removeHeader('X-Frame-Options');
  } else if (req.path.startsWith('/api/app')) {
    // Private authenticated dashboard APIs must not be embedded in iframes
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  }
  next();
});

// 2. Global Parsers
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 3. Serve static client assets (widget.js, demo.html, test-embed.html)
const clientPublicDir = path.resolve(__dirname, '../../client/public');
app.use(express.static(clientPublicDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('widget.js') || filePath.endsWith('.html')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Security-Policy', "frame-ancestors *");
      res.removeHeader('X-Frame-Options');
    }
  }
}));

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

// 4. Public API (Public CORS open to any customer website domain)
app.use(
  '/api/public',
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
  publicApiRouter
);

// 5. Business REST API v1 (API Key authenticated)
app.use(
  '/api/v1',
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
  apiV1Router
);

// 6. App API routes (Private dashboard operations with credentials)
app.use(
  '/api/app',
  cors({
    origin: true,
    credentials: true,
  }),
  appApiRateLimiter,
  appApiRouter
);

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
