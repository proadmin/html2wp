import express from 'express';
import cors from 'cors';
import { logger } from '../utils/logger.js';
import { router } from './routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', router);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
