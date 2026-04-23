import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { PipelineOrchestrator } from '../pipeline/orchestrator.js';
import { writeFile, mkdir } from 'fs/promises';
import { join, basename, resolve, relative } from 'path';
import type { JobState, JobInput, JobOptions } from '../types/index.js';

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return false;
    if (/^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(hostname)) return false;
    if (hostname === '0.0.0.0' || hostname === '::1') return false;
    return true;
  } catch {
    return false;
  }
}

export const router = Router();

// Simple in-memory rate limiter for /convert
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

const MAX_SOURCE_SIZE_MB = parseInt(process.env.MAX_SOURCE_SIZE_MB || '500', 10);

function validateSource(input: JobInput): string | null {
  if (!input.source || typeof input.source !== 'string') return 'Missing or invalid source';

  if (input.type === 'url') {
    if (!isValidUrl(input.source)) return 'Invalid or restricted URL';
    return null;
  }

  if (input.type === 'zip' || input.type === 'local') {
    // Prevent path traversal in file paths
    if (input.source.includes('..')) return 'Path traversal detected in source';
    if (input.source.includes('\0')) return 'Null byte detected in source';
    // Basic path format validation
    if (input.type === 'zip' && !input.source.toLowerCase().endsWith('.zip')) {
      return 'ZIP source must end with .zip';
    }
    return null;
  }

  return 'Unknown input type';
}

function validateJobOptions(options: JobOptions): string | null {
  if (!options || typeof options !== 'object') return 'Missing options';
  if (!Array.isArray(options.outputFormat) || options.outputFormat.length === 0) {
    return 'outputFormat must be a non-empty array';
  }
  const validFormats = ['wxr', 'direct', 'package'];
  for (const f of options.outputFormat) {
    if (!validFormats.includes(f)) return `Invalid outputFormat: ${f}`;
  }
  if (!options.styleMode || !['faithful', 'native'].includes(options.styleMode)) {
    return 'styleMode must be faithful or native';
  }
  return null;
}

// Job storage (in-memory with TTL cleanup)
const jobs = new Map<string, JobState>();
const orchestrators = new Map<string, PipelineOrchestrator>();
const jobCompletionTimes = new Map<string, number>();
const JOB_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cleanupJobs(): void {
  const now = Date.now();
  for (const [jobId, completedAt] of jobCompletionTimes) {
    if (now - completedAt > JOB_TTL_MS) {
      jobs.delete(jobId);
      orchestrators.delete(jobId);
      jobCompletionTimes.delete(jobId);
    }
  }
}

setInterval(cleanupJobs, 60 * 60 * 1000); // run every hour

router.post('/convert', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    }

    const { input, options } = req.body as { input: JobInput; options: JobOptions };

    const sourceError = validateSource(input);
    if (sourceError) {
      return res.status(400).json({ error: sourceError });
    }

    const optionsError = validateJobOptions(options);
    if (optionsError) {
      return res.status(400).json({ error: optionsError });
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
      if (state.status === 'complete' || state.status === 'error') {
        jobCompletionTimes.set(jobId, Date.now());
      }
    });

    // Run pipeline in background
    orchestrator.run(jobId, input, options).catch(err => {
      logger.error('Pipeline execution failed', err);
    });

    logger.info(`Job ${jobId} created`, { input, options });

    res.json({ jobId });
  } catch (err) {
    logger.error('Failed to create job', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
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

  // Return preview data from job results
  res.json({
    pages: job.results.pages || [],
    posts: job.results.posts || [],
    menus: job.results.menus || [],
    assets: job.results.assets || [],
    outputUrls: job.results.outputUrls || []
  });
});

router.post('/job/:jobId/export', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { outputFormats } = req.body as { outputFormats?: string[] };
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const formats = outputFormats || job.options?.outputFormat || [];
    const exportResults: Record<string, string> = {};

    const { writeFile, mkdir } = await import('fs/promises');
    const { WxrGenerator } = await import('../pipeline/export/wxr.generator.js');
    const outputDir = join(process.cwd(), 'output', jobId, 'export');
    await mkdir(outputDir, { recursive: true });

    for (const format of formats) {
      if (format === 'wxr') {
        const wxr = new WxrGenerator();
        const xml = wxr.generate({
          pages: (job.results.pages || []).map(p => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            content: '',
            date: new Date().toISOString(),
            categories: [],
            tags: []
          })),
          posts: (job.results.posts || []).map(p => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            content: '',
            date: new Date().toISOString(),
            categories: [],
            tags: []
          })),
          menus: (job.results.menus || []),
          assets: (job.results.assets || []).map(a => ({
            id: a.id,
            path: a.path,
            type: a.type as 'image' | 'css' | 'js' | 'font',
            size: 0,
            dependencies: []
          }))
        });
        await writeFile(join(outputDir, 'wordpress.xml'), xml);
        exportResults.wxr = `/api/job/${jobId}/result/wordpress.xml`;
      }
    }

    res.json({ downloadUrl: `/api/job/${jobId}/result`, exportResults });
  } catch (err) {
    logger.error('Export failed', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

router.get('/job/:jobId/result/:file', async (req: Request, res: Response) => {
  const { jobId, file } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const { readFile } = await import('fs/promises');
  const outputDir = resolve(join(process.cwd(), 'output', jobId, 'export'));
  const safeFile = basename(file);
  const filePath = resolve(join(outputDir, safeFile));

  // Prevent path traversal
  const rel = relative(outputDir, filePath);
  if (rel.startsWith('..') || rel === '') {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    res.send(content);
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});
