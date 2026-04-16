import { ZipHandler } from './zip.handler.js';
import { UrlCrawler } from './url.crawler.js';
import { LocalHandler } from './local.handler.js';
import type { FileManifest } from './zip.handler.js';
import type { JobInput } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class IngestService {
  private zipHandler = new ZipHandler();
  private urlCrawler = new UrlCrawler({ maxPages: 100, maxDepth: 5, waitTime: 1000 });
  private localHandler = new LocalHandler();

  async ingest(input: JobInput, outputDir: string): Promise<FileManifest> {
    logger.info('Starting ingest', { type: input.type });

    switch (input.type) {
      case 'zip':
        return this.zipHandler.extract(input.source, outputDir);
      case 'url':
        return this.urlCrawler.crawl(input.source, outputDir);
      case 'local':
        return this.localHandler.scan(input.source, outputDir);
      default:
        throw new Error(`Unknown input type: ${input.type}`);
    }
  }
}
