import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { PipelineOrchestrator } from '../pipeline/orchestrator.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { JobState, JobInput, JobOptions } from '../types/index.js';

export const router = Router();

// Job storage (in-memory for now)
const jobs = new Map<string, JobState>();
const orchestrators = new Map<string, PipelineOrchestrator>();

router.post('/convert', async (req: Request, res: Response) => {
  const { input, options } = req.body as { input: JobInput; options: JobOptions };

  if (!input || !input.type || !input.source) {
    return res.status(400).json({ error: 'Missing input.type or input.source' });
  }

  const jobId = crypto.randomUUID();
  const job: JobState = {
    jobId,
    status: 'pending',
    input,
    options,
    progress: { currentStep: 'queued', percent: 0, message: 'Job queued' },
    results: {}
  };

  jobs.set(jobId, job);

  // Create and run orchestrator
  const orchestrator = new PipelineOrchestrator();
  orchestrators.set(jobId, orchestrator);

  orchestrator.on('update', (state: JobState) => {
    jobs.set(jobId, state);
  });

  // Run pipeline in background
  orchestrator.run(jobId, input, options).catch(err => {
    logger.error('Pipeline execution failed', err);
  });

  logger.info(`Job ${jobId} created`, { input, options });

  res.json({ jobId });
});

router.get('/job/:jobId/status', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

router.get('/job/:jobId/preview', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // TODO: Return preview data
  res.json({ pages: [], menus: [], assets: [] });
});

router.post('/job/:jobId/export', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const { outputFormats } = req.body;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({ downloadUrl: `/api/job/${jobId}/result`, exportResults: {} });
});

router.get('/job/:jobId/result/:file', async (req: Request, res: Response) => {
  const { jobId, file } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // TODO: Return file
  res.send('File content placeholder');
});
