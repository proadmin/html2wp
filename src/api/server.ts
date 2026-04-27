import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { timingSafeEqual } from 'node:crypto';
import { logger } from '../utils/logger.js';
import { router, MAX_SOURCE_SIZE_MB } from './routes.js';
import { OllamaClient } from '../ai/ollama.client.js';

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// CORS: restrict to configured origin
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin }));

app.use(express.json({ limit: `${MAX_SOURCE_SIZE_MB}mb` }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Optional API key authentication
if (API_KEY) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/health') return next();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const providedKey = authHeader.slice(7);
    if (providedKey.length !== API_KEY.length) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const providedBuf = Buffer.from(providedKey);
    const apiKeyBuf = Buffer.from(API_KEY);
    if (!timingSafeEqual(providedBuf, apiKeyBuf)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });
}

app.use('/api', router);

app.get('/health', async (_req, res) => {
  const ollama = new OllamaClient();
  const ollamaHealth = await ollama.healthCheck();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ollama: ollamaHealth
  });
});

// Express error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', err);
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Graceful shutdown
function shutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
