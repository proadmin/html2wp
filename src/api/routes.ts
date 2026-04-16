import { Router } from 'express';
import { logger } from '../utils/logger.js';

export const router = Router();

// Job storage (in-memory for now)
const jobs = new Map<string, unknown>();

router.post('/convert', (req, res) => {
  const { input, options } = req.body;

  if (!input || !input.type || !input.source) {
    return res.status(400).json({ error: 'Missing input.type or input.source' });
  }

  const jobId = crypto.randomUUID();
  const job = {
    jobId,
    status: 'pending' as const,
    input,
    options,
    progress: { currentStep: 'queued', percent: 0, message: 'Job queued' },
    results: {}
  };

  jobs.set(jobId, job);
  logger.info(`Job ${jobId} created`, { input, options });

  res.json({ jobId });
});

router.get('/job/:jobId/status', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

router.get('/job/:jobId/preview', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId) as any;

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // TODO: Return preview data
  res.json({ pages: [], menus: [], assets: [] });
});

router.post('/job/:jobId/export', (req, res) => {
  const { jobId } = req.params;
  const { outputFormats } = req.body;
  const job = jobs.get(jobId) as any;

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // TODO: Trigger export
  res.json({ downloadUrl: `/api/job/${jobId}/result`, exportResults: {} });
});

router.get('/job/:jobId/result/:file', (req, res) => {
  const { jobId, file } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // TODO: Return file
  res.send('File content placeholder');
});
