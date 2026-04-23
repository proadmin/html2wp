import { EventEmitter } from 'events';
import { join } from 'path';
import { IngestService } from './ingest/index.js';
import { AnalyzeService } from './analyze/analyze.service.js';
import { TransformService } from './transform/transform.service.js';
import { WxrGenerator } from './export/wxr.generator.js';
import { ThemeService } from './theme/theme.service.js';
import { WpInstaller } from './export/wp-installer.js';
import { OllamaClient } from '../ai/ollama.client.js';
import { logger } from '../utils/logger.js';
import type { JobState, JobInput, JobOptions } from '../types/index.js';

const PIPELINE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    )
  ]);
}

export class PipelineOrchestrator extends EventEmitter {
  private ingestService: IngestService;
  private analyzeService: AnalyzeService;
  private transformService: TransformService;
  private wxrGenerator: WxrGenerator;
  private themeService: ThemeService;
  private ollama: OllamaClient;

  constructor() {
    super();
    this.ollama = new OllamaClient();
    this.ingestService = new IngestService();
    this.analyzeService = new AnalyzeService(this.ollama);
    this.transformService = new TransformService(this.ollama);
    this.wxrGenerator = new WxrGenerator();
    this.themeService = new ThemeService();
  }

  async run(jobId: string, input: JobInput, options: JobOptions): Promise<JobState> {
    const state: JobState = {
      jobId,
      status: 'pending',
      input,
      options,
      progress: { currentStep: 'starting', percent: 0, message: 'Starting pipeline' },
      results: {}
    };

    const outputDir = join(process.cwd(), 'output', jobId);

    try {
      // Step 1: Ingest
      state.status = 'ingesting';
      state.progress = { currentStep: 'ingesting', percent: 10, message: 'Ingesting source files' };
      this.emit('update', state);

      const manifest = await withTimeout(this.ingestService.ingest(input, outputDir), PIPELINE_TIMEOUT_MS, 'Ingest');
      state.results.assetCount = manifest.files.length;

      // Step 2: Analyze
      state.status = 'analyzing';
      state.progress = { currentStep: 'analyzing', percent: 30, message: 'Analyzing site structure' };
      this.emit('update', state);

      const siteMap = await withTimeout(this.analyzeService.analyze(manifest), PIPELINE_TIMEOUT_MS, 'Analyze');
      state.results.pageCount = siteMap.pages.length;
      state.results.postCount = siteMap.posts.length;
      state.results.pages = siteMap.pages.map(p => ({ id: p.id, title: p.title, slug: p.slug }));
      state.results.posts = siteMap.posts.map(p => ({ id: p.id, title: p.title, slug: p.slug }));
      state.results.assets = manifest.files.map(f => ({ id: f, path: f, type: 'file' }));
      state.results.menus = [];

      // Step 3: Transform
      state.status = 'transforming';
      state.progress = { currentStep: 'transforming', percent: 60, message: 'Converting to WordPress format' };
      this.emit('update', state);

      const transformedSiteMap = await withTimeout(this.transformService.transform(siteMap), PIPELINE_TIMEOUT_MS, 'Transform');

      // Step 4: Build Theme
      state.status = 'building';
      state.progress = { currentStep: 'building', percent: 70, message: 'Generating WordPress theme' };
      this.emit('update', state);

      await withTimeout(this.themeService.generate(outputDir, transformedSiteMap, {
        styleMode: options.styleMode,
        siteName: 'HTML2WP Site'
      }), PIPELINE_TIMEOUT_MS, 'Theme generation');

      // Step 5: Export
      state.status = 'exporting';
      state.progress = { currentStep: 'exporting', percent: 90, message: 'Generating export files' };
      this.emit('update', state);

      const { writeFile, mkdir } = await import('fs/promises');
      await mkdir(join(outputDir, 'export'), { recursive: true });

      if (options.outputFormat.includes('wxr')) {
        const wxrContent = this.wxrGenerator.generate(transformedSiteMap);
        await writeFile(join(outputDir, 'export', 'wordpress.xml'), wxrContent);
        state.results.outputUrls = ['/output/' + jobId + '/export/wordpress.xml'];
      }

      // Step 6: Direct Install (optional)
      if (options.outputFormat.includes('direct') && options.wordpressConfig) {
        state.progress = { currentStep: 'installing', percent: 95, message: 'Installing to WordPress' };
        this.emit('update', state);

        const installer = new WpInstaller({
          siteUrl: options.wordpressConfig.siteUrl,
          appPassword: options.wordpressConfig.appPassword,
          sshConnection: options.wordpressConfig.sshConnection,
          method: options.wordpressConfig.installMethod || 'rest-api'
        });

        await withTimeout(installer.install(transformedSiteMap, outputDir), PIPELINE_TIMEOUT_MS, 'WordPress install');
      }

      state.status = 'complete';
      state.progress = { currentStep: 'complete', percent: 100, message: 'Export complete' };
      this.emit('update', state);

      return state;
    } catch (error) {
      logger.error('Pipeline failed', error);
      state.status = 'error';
      state.error = {
        code: 'PIPELINE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false
      };
      this.emit('update', state);
      return state;
    }
  }
}
