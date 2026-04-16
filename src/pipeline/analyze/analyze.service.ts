import { readFile } from 'fs/promises';
import { join } from 'path';
import { OllamaClient } from '../../ai/ollama.client.js';
import { PageDetector } from './page.detector.js';
import { logger } from '../../utils/logger.js';
import type { SiteMap, Page, Post, Menu, Asset } from '../../types/index.js';
import type { FileManifest } from '../ingest/zip.handler.js';

export class AnalyzeService {
  private pageDetector: PageDetector;

  constructor(ollama: OllamaClient) {
    this.pageDetector = new PageDetector(ollama);
  }

  async analyze(manifest: FileManifest): Promise<SiteMap> {
    logger.info('Starting site analysis');

    const pages: Page[] = [];
    const posts: Post[] = [];
    const menus: Menu[] = [];
    const assets: Asset[] = [];

    const htmlFiles = manifest.files.filter((f: { path: string; type: string; size: number }) => f.type === 'html');

    for (const file of htmlFiles) {
      const content = await readFile(join(manifest.extractDir, file.path), 'utf-8');
      const url = `file://${file.path}`;

      try {
        const result = await this.pageDetector.analyzePage(content, url);

        pages.push({
          id: file.path,
          title: result.page.title || file.path,
          slug: result.page.slug || file.path.replace('.html', ''),
          content: result.page.content || content,
          parent: undefined
        });

        menus.push(...result.menus);
        assets.push(...result.assets);
      } catch (error) {
        logger.warn(`Failed to analyze ${file.path}`, error);
      }
    }

    logger.info(`Analysis complete: ${pages.length} pages, ${menus.length} menus, ${assets.length} assets`);

    return { pages, posts, menus, assets };
  }
}
