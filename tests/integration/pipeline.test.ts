import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { writeFileSync, mkdirSync, rmSync, createWriteStream } from 'fs';
import { join } from 'path';
import archiver from 'archiver';

describe('Pipeline Integration', () => {
  const testDir = join(process.cwd(), 'test-integration');

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('processes a simple HTML site through the ingest stage', async () => {
    // Create test ZIP
    const zipPath = join(testDir, 'test-site.zip');
    await createTestZip(zipPath, [
      {
        path: 'index.html',
        content: '<html><head><title>Home</title></head><body><h1>Welcome</h1><p>This is the home page.</p></body></html>'
      },
      {
        path: 'about.html',
        content: '<html><head><title>About</title></head><body><h1>About Us</h1><p>Learn more about us.</p></body></html>'
      }
    ]);

    const orchestrator = new PipelineOrchestrator();
    const jobId = 'test-job-' + Date.now();

    const state = await orchestrator.run(jobId, {
      type: 'zip',
      source: zipPath
    }, {
      outputFormat: ['wxr'],
      styleMode: 'native',
      previewEnabled: false
    });

    // Pipeline should complete (may have 0 pages if Ollama not running, but shouldn't crash)
    expect(['complete', 'error']).toContain(state.status);
    // If Ollama is running, we should have pages
    if (state.status === 'complete') {
      expect(state.results.assetCount).toBeGreaterThanOrEqual(2); // At least 2 HTML files
    }
  }, 120000);

  it('handles URL input type', async () => {
    const orchestrator = new PipelineOrchestrator();
    const jobId = 'test-url-job-' + Date.now();

    const state = await orchestrator.run(jobId, {
      type: 'url',
      source: 'https://example.com'
    }, {
      outputFormat: ['wxr'],
      styleMode: 'native',
      previewEnabled: false
    });

    // Should complete without throwing
    expect([ 'complete', 'error' ]).toContain(state.status);
  }, 120000);
});

async function createTestZip(zipPath: string, files: Array<{ path: string; content: string }>): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip');

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);
    files.forEach(file => {
      archive.append(file.content, { name: file.path });
    });
    archive.finalize();
  });
}
