import { EventEmitter } from 'events';
import { join } from 'path';
import { IngestService } from './ingest/index.js';
import { AnalyzeService } from './analyze/analyze.service.js';
import { TransformService } from './transform/transform.service.js';
import { WxrGenerator } from './export/wxr.generator.js';
import { OllamaClient } from '../ai/ollama.client.js';
import { logger } from '../utils/logger.js';
import type { JobState, JobInput, JobOptions } from '../types/index.js';

export class PipelineOrchestrator extends EventEmitter {
  private ingestService: IngestService;
  private analyzeService: AnalyzeService;
  private transformService: TransformService;
  private wxrGenerator: WxrGenerator;
  private ollama: OllamaClient;

  constructor() {
    super();
    this.ollama = new OllamaClient();
    this.ingestService = new IngestService();
    this.analyzeService = new AnalyzeService(this.ollama);
    this.transformService = new TransformService(this.ollama);
    this.wxrGenerator = new WxrGenerator();
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

      const manifest = await this.ingestService.ingest(input, outputDir);
      state.results.assetCount = manifest.files.length;

      // Step 2: Analyze
      state.status = 'analyzing';
      state.progress = { currentStep: 'analyzing', percent: 30, message: 'Analyzing site structure' };
      this.emit('update', state);

      const siteMap = await this.analyzeService.analyze(manifest);
      state.results.pageCount = siteMap.pages.length;
      state.results.postCount = siteMap.posts.length;

      // Step 3: Transform
      state.status = 'transforming';
      state.progress = { currentStep: 'transforming', percent: 60, message: 'Converting to WordPress format' };
      this.emit('update', state);

      const transformedSiteMap = await this.transformService.transform(siteMap);

      // Step 4: Export
      state.status = 'exporting';
      state.progress = { currentStep: 'exporting', percent: 80, message: 'Generating export files' };
      this.emit('update', state);

      if (options.outputFormat.includes('wxr')) {
        const wxrContent = this.wxrGenerator.generate(transformedSiteMap);
        // Save WXR file
        state.results.outputUrls = ['/output/' + jobId + '/export.xml'];
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
