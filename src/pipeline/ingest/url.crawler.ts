import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, parse } from 'path';
import { logger } from '../../utils/logger.js';
import type { FileManifest } from './zip.handler.js';

export interface CrawlerOptions {
  maxPages: number;
  maxDepth: number;
  waitTime: number;
}

export class UrlCrawler {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private visitedUrls = new Set<string>();
  private pendingUrls: Array<{ url: string; depth: number }> = [];
  private downloadedFiles: FileManifest['files'] = [];

  constructor(private options: CrawlerOptions) {}

  async crawl(baseUrl: string, outputDir: string): Promise<FileManifest> {
    logger.info(`Starting crawl: ${baseUrl}`);

    mkdirSync(outputDir, { recursive: true });
    this.pendingUrls.push({ url: baseUrl, depth: 0 });

    try {
      this.browser = await chromium.launch({ headless: true });
      // Browser context with downloads enabled
      this.context = await this.browser.newContext({
        acceptDownloads: true
      });

      while (this.pendingUrls.length > 0 && this.visitedUrls.size < this.options.maxPages) {
        const { url, depth } = this.pendingUrls.shift()!;
        await this.processUrl(url, depth, outputDir, baseUrl);
      }

      logger.info(`Crawl complete: ${this.downloadedFiles.length} files`);

      return {
        files: this.downloadedFiles,
        extractDir: outputDir
      };
    } finally {
      await this.context?.close();
      await this.browser?.close();
    }
  }

  private async processUrl(url: string, depth: number, outputDir: string, baseUrl: string): Promise<void> {
    if (this.visitedUrls.has(url) || depth > this.options.maxDepth) {
      return;
    }

    this.visitedUrls.add(url);
    logger.debug(`Crawling: ${url} (depth: ${depth})`);

    const page = await this.context!.newPage();

    try {
      // Handle PDF and other download files
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const contentType = response?.headers()['content-type'] || '';

      // Skip PDF files - they're not HTML pages
      if (contentType.includes('application/pdf') || url.endsWith('.pdf')) {
        logger.debug(`Skipping PDF: ${url}`);
        await page.close();
        return;
      }

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(this.options.waitTime);

      // Save HTML
      const html = await page.content();
      const urlPath = new URL(url).pathname;
      const filename = urlPath === '/' ? 'index.html' : urlPath.replace(/\/$/, '') + '.html';
      const filePath = join(outputDir, filename);

      mkdirSync(join(outputDir, parse(filename).dir), { recursive: true });
      writeFileSync(filePath, html);

      this.downloadedFiles.push({
        path: filename,
        type: 'html',
        size: html.length
      });

      // Extract and download assets
      const assets = await page.evaluate(() => {
        const getAttr = (sel: string, attr: string) =>
          Array.from(document.querySelectorAll(sel))
            .map(el => el.getAttribute(attr))
            .filter((v): v is string => v !== null);
        return {
          images: getAttr('img[src]', 'src'),
          stylesheets: getAttr('link[rel="stylesheet"]', 'href'),
          scripts: getAttr('script[src]', 'src')
        };
      });

      await this.downloadAssets(assets, outputDir, url, baseUrl);

      // Extract links for further crawling
      const links = await page.evaluate((baseUrl) => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(el => el.getAttribute('href'))
          .filter((href): href is string => {
            if (!href) return false;
            const absolute = new URL(href, baseUrl).href;
            return absolute.startsWith(baseUrl);
          })
          .map(href => new URL(href, baseUrl).href);
      }, baseUrl);

      for (const link of links) {
        if (!this.visitedUrls.has(link)) {
          this.pendingUrls.push({ url: link, depth: depth + 1 });
        }
      }
    } finally {
      await page.close();
    }
  }

  private async downloadAssets(
    assets: { images: (string | null)[]; stylesheets: (string | null)[]; scripts: (string | null)[] },
    outputDir: string,
    pageUrl: string,
    baseUrl: string
  ): Promise<void> {
    const page = await this.context!.newPage();

    try {
      const allUrls = [
        ...assets.images.filter((s): s is string => !!s),
        ...assets.stylesheets.filter((s): s is string => !!s),
        ...assets.scripts.filter((s): s is string => !!s)
      ];

      for (const assetUrl of allUrls) {
        const absoluteUrl = new URL(assetUrl, pageUrl).href;

        if (!absoluteUrl.startsWith(baseUrl) && !absoluteUrl.startsWith('http')) {
          continue; // Skip external resources
        }

        try {
          const response = await page.request.get(absoluteUrl);
          const body = await response.body();
          const urlPath = new URL(absoluteUrl).pathname;
          const relativeAssetPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
          const filename = relativeAssetPath.split('/').pop() || 'asset';
          const filePath = join(outputDir, 'assets', relativeAssetPath);

          mkdirSync(join(outputDir, 'assets', ...relativeAssetPath.split('/').slice(0, -1)), { recursive: true });
          writeFileSync(filePath, body);

          this.downloadedFiles.push({
            path: join('assets', relativeAssetPath),
            type: this.getAssetType(filename),
            size: body.length
          });
        } catch (error) {
          logger.warn(`Failed to download asset: ${absoluteUrl}`);
        }
      }
    } finally {
      await page.close();
    }
  }

  private getAssetType(filename: string): FileManifest['files'][number]['type'] {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['css', 'scss', 'sass', 'less'].includes(ext || '')) return 'css';
    if (['js', 'mjs', 'cjs'].includes(ext || '')) return 'js';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext || '')) return 'image';
    if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(ext || '')) return 'font';
    return 'other';
  }
}
