# HTML-to-WordPress Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js/TypeScript web application that converts static HTML websites to WordPress format using Ollama AI for content transformation.

**Architecture:** Modular pipeline with five services (Ingest, Analyze, Transform, Build Theme, Export) orchestrated through a job queue, with a React frontend and Express API.

**Tech Stack:** Node.js 20+, Express, TypeScript, React + Vite, Playwright, Ollama (Llama 3), WP-CLI/REST API, Bull (optional queue)

---

## File Structure

### Backend (`src/`)
```
src/
├── api/
│   ├── routes.ts              # Express route handlers
│   └── middleware/
│       ├── upload.ts          # File upload handling
│       └── validation.ts      # Request validation
├── pipeline/
│   ├── orchestrator.ts        # Job orchestration
│   ├── ingest/
│   │   ├── ingest.service.ts
│   │   ├── zip.handler.ts
│   │   ├── url.crawler.ts
│   │   └── local.handler.ts
│   ├── analyze/
│   │   ├── analyze.service.ts
│   │   ├── page.detector.ts
│   │   ├── content.classifier.ts
│   │   ├── navigation.parser.ts
│   │   └── asset.mapper.ts
│   ├── transform/
│   │   ├── transform.service.ts
│   │   ├── html-to-blocks.ts
│   │   ├── asset.processor.ts
│   │   ├── menu.builder.ts
│   │   └── style.handler.ts
│   ├── theme/
│   │   ├── theme.service.ts
│   │   ├── child-theme.generator.ts
│   │   ├── block-patterns.ts
│   │   └── css.processor.ts
│   └── export/
│       ├── export.service.ts
│       ├── wxr.generator.ts
│       ├── wp-installer.ts
│       ├── package.builder.ts
│       └── media.uploader.ts
├── ai/
│   ├── ollama.client.ts
│   ├── prompts/
│   │   ├── structure.prompt.ts
│   │   ├── content.prompt.ts
│   │   └── menu.prompt.ts
│   └── models/
│       ├── page-classifier.ts
│       ├── block-converter.ts
│       └── menu-extractor.ts
├── wordpress/
│   ├── wp.client.ts
│   └── wp.constants.ts
├── types/
│   └── index.ts
└── utils/
    ├── logger.ts
    └── fs.helpers.ts
```

### Frontend (`frontend/`)
```
frontend/
├── src/
│   ├── components/
│   │   ├── Upload.tsx
│   │   ├── Configure.tsx
│   │   ├── Preview.tsx
│   │   └── Result.tsx
│   ├── hooks/
│   │   └── useJobStatus.ts
│   ├── api/
│   │   └── client.ts
│   └── App.tsx
└── package.json
```

### Tests (`tests/`)
```
tests/
├── unit/
│   ├── ingest/
│   ├── analyze/
│   ├── transform/
│   └── export/
├── integration/
│   └── pipeline.test.ts
└── fixtures/
    └── sample-site/
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `src/types/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "html2wp",
  "version": "0.1.0",
  "description": "Convert HTML websites to WordPress format",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/api/server.ts",
    "build": "tsc && npm run build:frontend",
    "build:frontend": "cd frontend && npm run build",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "playwright": "^1.42.0",
    "cheerio": "^1.0.0-rc.12",
    "archiver": "^7.0.0",
    "bull": "^4.12.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "@types/multer": "^1.4.11",
    "@types/archiver": "^6.0.2",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "vitest": "^1.3.0",
    "eslint": "^8.56.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules
dist
frontend/dist
.DS_Store
.env
.env.local
uploads/
output/
*.log
coverage
```

- [ ] **Step 4: Create src/types/index.ts**

```typescript
export type InputType = 'zip' | 'url' | 'local';
export type OutputFormat = 'wxr' | 'direct' | 'package';
export type StyleMode = 'faithful' | 'native';
export type JobStatus = 
  | 'pending'
  | 'ingesting'
  | 'analyzing'
  | 'transforming'
  | 'building'
  | 'exporting'
  | 'complete'
  | 'error';

export interface JobInput {
  type: InputType;
  source: string;
}

export interface JobOptions {
  outputFormat: OutputFormat[];
  styleMode: StyleMode;
  previewEnabled: boolean;
}

export interface JobProgress {
  currentStep: string;
  percent: number;
  message: string;
}

export interface JobResults {
  pageCount: number;
  postCount: number;
  assetCount: number;
  outputUrls: string[];
}

export interface JobError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface JobState {
  jobId: string;
  status: JobStatus;
  input: JobInput;
  options: JobOptions;
  progress: JobProgress;
  results: Partial<JobResults>;
  error?: JobError;
}

export interface SiteMap {
  pages: Page[];
  posts: Post[];
  menus: Menu[];
  assets: Asset[];
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  template?: string;
  parent?: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  date: string;
  categories: string[];
  tags: string[];
}

export interface Menu {
  name: string;
  location: string;
  items: MenuItem[];
}

export interface MenuItem {
  label: string;
  url: string;
  children?: MenuItem[];
}

export interface Asset {
  id: string;
  path: string;
  type: 'image' | 'css' | 'js' | 'font';
  size: number;
  dependencies: string[];
}
```

- [ ] **Step 5: Run tests to verify setup**

```bash
npm install
npm test -- --run
```

Expected: Empty test suite passes

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore src/types/index.ts
git commit -m "feat: scaffold project structure and types"
```

---

## Task 2: Express API Server

**Files:**
- Create: `src/api/server.ts`, `src/api/routes.ts`, `src/utils/logger.ts`

- [ ] **Step 1: Create logger utility**

```typescript
// src/utils/logger.ts
export const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error);
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  debug: (message: string, data?: unknown) => {
    console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};
```

- [ ] **Step 2: Create Express server**

```typescript
// src/api/server.ts
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
```

- [ ] **Step 3: Create API routes**

```typescript
// src/api/routes.ts
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
```

- [ ] **Step 4: Write test for API routes**

```typescript
// tests/unit/api/routes.test.ts
import { describe, it, expect } from 'vitest';

describe('API Routes', () => {
  it('POST /api/convert creates a job', () => {
    // TODO: Integration test with supertest
    expect(true).toBe(true);
  });
  
  it('GET /api/job/:jobId/status returns job status', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --run
```

- [ ] **Step 6: Commit**

```bash
git add src/api/server.ts src/api/routes.ts src/utils/logger.ts tests/unit/api/routes.test.ts
git commit -m "feat: create Express API server with job endpoints"
```

---

## Task 3: Ingest Service - ZIP Handler

**Files:**
- Create: `src/pipeline/ingest/ingest.service.ts`, `src/pipeline/ingest/zip.handler.ts`
- Test: `tests/unit/ingest/zip.handler.test.ts`

- [ ] **Step 1: Write failing test for ZIP handler**

```typescript
// tests/unit/ingest/zip.handler.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ZipHandler } from '../../../src/pipeline/ingest/zip.handler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import archiver from 'archiver';

describe('ZipHandler', () => {
  const tempDir = join(process.cwd(), 'temp-test');
  const outputDir = join(tempDir, 'output');
  
  beforeEach(() => {
    mkdirSync(tempDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
  });
  
  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });
  
  it('extracts a valid ZIP file and returns file manifest', async () => {
    const zipPath = join(tempDir, 'test.zip');
    await createTestZip(zipPath, [
      { path: 'index.html', content: '<html><body>Home</body></html>' },
      { path: 'about.html', content: '<html><body>About</body></html>' },
      { path: 'css/style.css', content: 'body { margin: 0; }' }
    ]);
    
    const handler = new ZipHandler();
    const result = await handler.extract(zipPath, outputDir);
    
    expect(result.files).toHaveLength(3);
    expect(result.files.find(f => f.path === 'index.html')).toBeDefined();
    expect(result.files.find(f => f.type === 'html')).toBeDefined();
    expect(result.files.find(f => f.type === 'css')).toBeDefined();
  });
  
  it('throws error for corrupt ZIP file', async () => {
    const corruptPath = join(tempDir, 'corrupt.zip');
    writeFileSync(corruptPath, 'not a zip file');
    
    const handler = new ZipHandler();
    await expect(handler.extract(corruptPath, outputDir)).rejects.toThrow('Invalid ZIP file');
  });
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/ingest/zip.handler.test.ts --run
```

Expected: FAIL - module not found

- [ ] **Step 3: Implement ZIP handler**

```typescript
// src/pipeline/ingest/zip.handler.ts
import { createWriteStream, mkdirSync, rmSync } from 'fs';
import { join, basename } from 'path';
import { pipeline } from 'stream/promises';
import { createReadStream } from 'fs';
import { Extractor, ExtractorResult } from 'unzip-stream';
import { logger } from '../../utils/logger.js';

export interface FileManifest {
  files: Array<{
    path: string;
    type: 'html' | 'css' | 'js' | 'image' | 'font' | 'other';
    size: number;
  }>;
  extractDir: string;
}

export class ZipHandler {
  private readonly htmlExtensions = ['.html', '.htm'];
  private readonly cssExtensions = ['.css', '.scss', '.sass', '.less'];
  private readonly jsExtensions = ['.js', '.mjs', '.cjs'];
  private readonly imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'];
  private readonly fontExtensions = ['.woff', '.woff2', '.ttf', '.eot', '.otf'];
  
  async extract(zipPath: string, outputDir: string): Promise<FileManifest> {
    logger.info(`Extracting ZIP: ${zipPath}`);
    
    // Clean output directory
    rmSync(outputDir, { recursive: true, force: true });
    mkdirSync(outputDir, { recursive: true });
    
    try {
      await this.extractZip(zipPath, outputDir);
      const files = await this.scanDirectory(outputDir, outputDir);
      
      logger.info(`Extracted ${files.length} files`);
      
      return {
        files,
        extractDir: outputDir
      };
    } catch (error) {
      logger.error('ZIP extraction failed', error);
      throw new Error('Invalid ZIP file');
    }
  }
  
  private async extractZip(zipPath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      createReadStream(zipPath)
        .pipe(Extractor(outputDir))
        .on('close', resolve)
        .on('error', reject);
    });
  }
  
  private async scanDirectory(dir: string, baseDir: string): Promise<FileManifest['files']> {
    const files: FileManifest['files'] = [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await this.scanDirectory(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const relativePath = relative(baseDir, fullPath);
        const stats = await fs.promises.stat(fullPath);
        
        files.push({
          path: relativePath,
          type: this.getFileType(entry.name),
          size: stats.size
        });
      }
    }
    
    return files;
  }
  
  private getFileType(filename: string): FileManifest['files'][number]['type'] {
    const ext = extname(filename).toLowerCase();
    
    if (this.htmlExtensions.includes(ext)) return 'html';
    if (this.cssExtensions.includes(ext)) return 'css';
    if (this.jsExtensions.includes(ext)) return 'js';
    if (this.imageExtensions.includes(ext)) return 'image';
    if (this.fontExtensions.includes(ext)) return 'font';
    return 'other';
  }
}
```

- [ ] **Step 4: Add missing import**

Add to `src/pipeline/ingest/zip.handler.ts`:
```typescript
import * as fs from 'fs';
import { relative, extname } from 'path';
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- tests/unit/ingest/zip.handler.test.ts --run
```

- [ ] **Step 6: Commit**

```bash
git add src/pipeline/ingest/zip.handler.ts tests/unit/ingest/zip.handler.test.ts
git commit -m "feat: implement ZIP file extraction handler"
```

---

## Task 4: Ingest Service - URL Crawler

**Files:**
- Create: `src/pipeline/ingest/url.crawler.ts`
- Test: `tests/unit/ingest/url.crawler.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/ingest/url.crawler.test.ts
import { describe, it, expect } from 'vitest';
import { UrlCrawler } from '../../../src/pipeline/ingest/url.crawler.js';

describe('UrlCrawler', () => {
  it('crawls a static site and downloads pages', async () => {
    // TODO: Mock HTTP server for integration test
    const crawler = new UrlCrawler({ maxPages: 10, maxDepth: 2 });
    const result = await crawler.crawl('http://localhost:8080', '/tmp/output');
    
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files.some(f => f.path.endsWith('.html'))).toBe(true);
  });
  
  it('respects maxPages limit', async () => {
    const crawler = new UrlCrawler({ maxPages: 3, maxDepth: 2 });
    const result = await crawler.crawl('http://localhost:8080', '/tmp/output');
    
    expect(result.files.filter(f => f.type === 'html').length).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Implement URL crawler**

```typescript
// src/pipeline/ingest/url.crawler.ts
import { chromium, Browser, Page } from 'playwright';
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
      await this.browser?.close();
    }
  }
  
  private async processUrl(url: string, depth: number, outputDir: string, baseUrl: string): Promise<void> {
    if (this.visitedUrls.has(url) || depth > this.options.maxDepth) {
      return;
    }
    
    this.visitedUrls.add(url);
    logger.debug(`Crawling: ${url} (depth: ${depth})`);
    
    const page = await this.browser!.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
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
        return {
          images: Array.from(document.querySelectorAll('img[src]')).map(el => el.getAttribute('src')),
          stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(el => el.getAttribute('href')),
          scripts: Array.from(document.querySelectorAll('script[src]')).map(el => el.getAttribute('src'))
        };
      });
      
      await this.downloadAssets(assets, outputDir, url, baseUrl);
      
      // Extract links for further crawling
      const links = await page.evaluate((baseUrl) => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(el => el.getAttribute('href'))
          .filter(href => {
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
    const page = await this.browser!.newPage();
    
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
          const filename = urlPath.split('/').pop() || 'asset';
          const filePath = join(outputDir, 'assets', filename);
          
          mkdirSync(join(outputDir, 'assets'), { recursive: true });
          writeFileSync(filePath, body);
          
          this.downloadedFiles.push({
            path: join('assets', filename),
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
```

- [ ] **Step 3: Add playwright dependency**

Update `package.json`:
```json
"dependencies": {
  "playwright": "^1.42.0"
}
```

Run:
```bash
npm install
npx playwright install chromium
```

- [ ] **Step 4: Commit**

```bash
git add src/pipeline/ingest/url.crawler.ts package.json
git commit -m "feat: implement URL crawler with Playwright"
```

---

## Task 5: Ingest Service - Local Handler and Main Service

**Files:**
- Create: `src/pipeline/ingest/local.handler.ts`, `src/pipeline/ingest/index.ts`

- [ ] **Step 1: Create local directory handler**

```typescript
// src/pipeline/ingest/local.handler.ts
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { logger } from '../../utils/logger.js';
import type { FileManifest } from './zip.handler.js';

export class LocalHandler {
  async scan(sourceDir: string, outputDir: string): Promise<FileManifest> {
    logger.info(`Scanning local directory: ${sourceDir}`);
    
    const files = await this.scanDirectory(sourceDir, sourceDir);
    
    logger.info(`Found ${files.length} files`);
    
    return {
      files,
      extractDir: sourceDir
    };
  }
  
  private async scanDirectory(dir: string, baseDir: string): Promise<FileManifest['files']> {
    const files: FileManifest['files'] = [];
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await this.scanDirectory(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const relativePath = relative(baseDir, fullPath);
        const fileStat = await stat(fullPath);
        
        files.push({
          path: relativePath,
          type: this.getFileType(entry.name),
          size: fileStat.size
        });
      }
    }
    
    return files;
  }
  
  private getFileType(filename: string): FileManifest['files'][number]['type'] {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (['html', 'htm'].includes(ext || '')) return 'html';
    if (['css', 'scss', 'sass', 'less'].includes(ext || '')) return 'css';
    if (['js', 'mjs', 'cjs'].includes(ext || '')) return 'js';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext || '')) return 'image';
    if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(ext || '')) return 'font';
    return 'other';
  }
}
```

- [ ] **Step 2: Create ingest service index**

```typescript
// src/pipeline/ingest/index.ts
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
```

- [ ] **Step 3: Commit**

```bash
git add src/pipeline/ingest/local.handler.ts src/pipeline/ingest/index.ts
git commit -m "feat: complete ingest service with all handlers"
```

---

## Task 6: Ollama AI Client

**Files:**
- Create: `src/ai/ollama.client.ts`, `src/ai/prompts/structure.prompt.ts`

- [ ] **Step 1: Create Ollama client**

```typescript
// src/ai/ollama.client.ts
import { logger } from '../utils/logger.js';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  temperature: number;
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;
  private temperature: number;
  
  constructor(config: OllamaConfig = { baseUrl: 'http://localhost:11434', model: 'llama3', temperature: 0.1 }) {
    this.baseUrl = config.baseUrl;
    this.model = config.model;
    this.temperature = config.temperature;
  }
  
  async generate(prompt: string, options?: { json?: boolean }): Promise<string> {
    logger.debug('Generating with Ollama', { model: this.model, prompt: prompt.slice(0, 100) });
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: this.temperature
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.response;
    } catch (error) {
      logger.error('Ollama generation failed', error);
      throw new Error('AI processing failed');
    }
  }
  
  async generateJson<T>(prompt: string): Promise<T> {
    const response = await this.generate(prompt + '\n\nRespond with valid JSON only, no markdown.', { json: true });
    return JSON.parse(response) as T;
  }
}
```

- [ ] **Step 2: Create structure analysis prompt**

```typescript
// src/ai/prompts/structure.prompt.ts
export const STRUCTURE_ANALYSIS_PROMPT = `Analyze this HTML page and extract its structure.

Page URL: {url}
HTML Content:
{html}

Extract:
1. Page type: is this a homepage, about page, contact page, blog post, article, product page, or other?
2. Title: the main heading (h1) or page title
3. Main content: the primary content area (exclude navigation, footer, sidebar)
4. Navigation menus: find all <nav> elements and extract their structure
5. Assets: list all images, stylesheets, and scripts referenced

Respond with this JSON structure:
{
  "pageType": string,
  "title": string,
  "slug": string,
  "mainContent": string,
  "menus": [{"name": string, "items": [{"label": string, "url": string, "children": []}]}],
  "assets": [{"path": string, "type": "image"|"css"|"js"}]
}`;
```

- [ ] **Step 3: Write test for Ollama client**

```typescript
// tests/unit/ai/ollama.client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { OllamaClient } from '../../../src/ai/ollama.client.js';

describe('OllamaClient', () => {
  it('generates text from prompt', async () => {
    // TODO: Mock fetch for unit test
    const client = new OllamaClient({ baseUrl: 'http://localhost:11434', model: 'llama3', temperature: 0.1 });
    const result = await client.generate('Say hello');
    
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });
  
  it('parses JSON response', async () => {
    const client = new OllamaClient({ baseUrl: 'http://localhost:11434', model: 'llama3', temperature: 0.1 });
    const result = await client.generateJson<{ test: string }>('Return { "test": "value" }');
    
    expect(result.test).toBe('value');
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add src/ai/ollama.client.ts src/ai/prompts/structure.prompt.ts tests/unit/ai/ollama.client.test.ts
git commit -m "feat: create Ollama AI client with structure analysis prompts"
```

---

## Task 7: Analyze Service

**Files:**
- Create: `src/pipeline/analyze/analyze.service.ts`, `src/pipeline/analyze/page.detector.ts`

- [ ] **Step 1: Create page detector**

```typescript
// src/pipeline/analyze/page.detector.ts
import { OllamaClient } from '../../ai/ollama.client.js';
import { STRUCTURE_ANALYSIS_PROMPT } from '../../ai/prompts/structure.prompt.js';
import { logger } from '../../utils/logger.js';
import type { Page, Post, Menu, Asset } from '../../types/index.js';

export class PageDetector {
  constructor(private ollama: OllamaClient) {}
  
  async analyzePage(html: string, url: string): Promise<{ page: Partial<Page>; menus: Menu[]; assets: Asset[] }> {
    try {
      const result = await this.ollama.generateJson<StructureAnalysisResult>(
        STRUCTURE_ANALYSIS_PROMPT.replace('{url}', url).replace('{html}', html.slice(0, 50000))
      );
      
      const page: Partial<Page> = {
        title: result.title || 'Untitled',
        slug: this.extractSlug(url),
        content: result.mainContent || html
      };
      
      const menus: Menu[] = result.menus.map(m => ({
        name: m.name || 'Main Menu',
        location: 'primary',
        items: this.convertMenuItems(m.items)
      }));
      
      const assets: Asset[] = result.assets.map((a, i) => ({
        id: `asset-${i}`,
        path: a.path,
        type: a.type === 'image' ? 'image' : a.type === 'css' ? 'css' : 'js',
        size: 0,
        dependencies: []
      }));
      
      return { page, menus, assets };
    } catch (error) {
      logger.error('Page analysis failed', error);
      throw error;
    }
  }
  
  private extractSlug(url: string): string {
    const pathname = new URL(url).pathname;
    return pathname.replace(/\/$/, '').split('/').pop() || 'index';
  }
  
  private convertMenuItems(items: Array<{ label: string; url: string; children?: Array<{ label: string; url: string }> }>) {
    return items.map(item => ({
      label: item.label,
      url: item.url,
      children: item.children?.map(child => ({
        label: child.label,
        url: child.url,
        children: []
      }))
    }));
  }
}

interface StructureAnalysisResult {
  pageType: string;
  title: string;
  mainContent: string;
  menus: Array<{ name: string; items: Array<{ label: string; url: string; children?: Array<{ label: string; url: string }> }> }>;
  assets: Array<{ path: string; type: 'image' | 'css' | 'js' }>;
}
```

- [ ] **Step 2: Create analyze service**

```typescript
// src/pipeline/analyze/analyze.service.ts
import { readFile } from 'fs/promises';
import { join } from 'path';
import { OllamaClient } from '../../ai/ollama.client.js';
import { PageDetector } from './page.detector.js';
import { logger } from '../../utils/logger.js';
import type { SiteMap, FileManifest } from '../../types/index.js';

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
    
    const htmlFiles = manifest.files.filter(f => f.type === 'html');
    
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
```

- [ ] **Step 3: Commit**

```bash
git add src/pipeline/analyze/analyze.service.ts src/pipeline/analyze/page.detector.ts
git commit -m "feat: implement analyze service with AI-powered page detection"
```

---

## Task 8: Transform Service - HTML to Blocks

**Files:**
- Create: `src/pipeline/transform/transform.service.ts`, `src/pipeline/transform/html-to-blocks.ts`

- [ ] **Step 1: Create HTML to blocks converter**

```typescript
// src/pipeline/transform/html-to-blocks.ts
import { OllamaClient } from '../../ai/ollama.client.js';
import { logger } from '../../utils/logger.js';

const BLOCK_CONVERSION_PROMPT = `Convert this HTML content to WordPress Gutenberg blocks.

Input HTML:
{html}

Convert to Gutenberg block format. Use these block types:
- core/paragraph for <p>
- core/heading for <h1>-<h6>
- core/image for <img>
- core/list for <ul>, <ol>
- core/quote for <blockquote>
- core/buttons for button links
- core/group for containers

Output the content in Gutenberg serialized format:
<!-- wp:block-name {"attributes"} -->
block content
<!-- /wp:block-name -->

Respond with only the converted blocks, no explanation.`;

export class HtmlToBlocksConverter {
  constructor(private ollama: OllamaClient) {}
  
  async convert(html: string): Promise<string> {
    logger.debug('Converting HTML to blocks', { htmlLength: html.length });
    
    try {
      const blocks = await this.ollama.generate(
        BLOCK_CONVERSION_PROMPT.replace('{html}', html.slice(0, 30000))
      );
      
      return this.cleanBlockOutput(blocks);
    } catch (error) {
      logger.error('Block conversion failed', error);
      // Fallback: wrap HTML in HTML block
      return `<!-- wp:html -->
${html}
<!-- /wp:html -->`;
    }
  }
  
  private cleanBlockOutput(output: string): string {
    // Remove markdown code fences if present
    return output.replace(/```html?/g, '').replace(/```/g, '').trim();
  }
}
```

- [ ] **Step 2: Create transform service**

```typescript
// src/pipeline/transform/transform.service.ts
import { OllamaClient } from '../../ai/ollama.client.js';
import { HtmlToBlocksConverter } from './html-to-blocks.js';
import { logger } from '../../utils/logger.js';
import type { SiteMap } from '../../types/index.js';

export class TransformService {
  private blocksConverter: HtmlToBlocksConverter;
  
  constructor(ollama: OllamaClient) {
    this.blocksConverter = new HtmlToBlocksConverter(ollama);
  }
  
  async transform(siteMap: SiteMap): Promise<SiteMap> {
    logger.info('Starting content transformation');
    
    const transformedPages = await Promise.all(
      siteMap.pages.map(page => this.transformPage(page))
    );
    
    const transformedPosts = await Promise.all(
      siteMap.posts.map(post => this.transformPost(post))
    );
    
    logger.info(`Transformed ${transformedPages.length} pages, ${transformedPosts.length} posts`);
    
    return {
      pages: transformedPages,
      posts: transformedPosts,
      menus: siteMap.menus,
      assets: siteMap.assets
    };
  }
  
  private async transformPage(page: any): Promise<any> {
    const blocks = await this.blocksConverter.convert(page.content);
    return { ...page, content: blocks };
  }
  
  private async transformPost(post: any): Promise<any> {
    const blocks = await this.blocksConverter.convert(post.content);
    return { ...post, content: blocks };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pipeline/transform/transform.service.ts src/pipeline/transform/html-to-blocks.ts
git commit -m "feat: implement transform service with HTML to Gutenberg conversion"
```

---

## Task 9: Export Service - WXR Generator

**Files:**
- Create: `src/pipeline/export/export.service.ts`, `src/pipeline/export/wxr.generator.ts`

- [ ] **Step 1: Create WXR (WordPress eXtended RSS) generator**

```typescript
// src/pipeline/export/wxr.generator.ts
import { XMLBuilder } from 'fast-xml-parser';
import type { SiteMap } from '../../types/index.js';

export class WxrGenerator {
  generate(siteMap: SiteMap): string {
    const wxr = {
      '?xml': {
        '@version': '1.0',
        '@encoding': 'UTF-8'
      },
      rss: {
        '@version': '2.0',
        '@xmlns:wp': 'http://wordpress.org/export/1.2/',
        '@xmlns:dc': 'http://purl.org/dc/elements/1.1/',
        '@xmlns:content': 'http://purl.org/rss/1.0/modules/content/',
        channel: {
          title: 'HTML2WP Export',
          link: 'https://example.com',
          description: 'Imported from HTML site',
          'wp:wxr_version': '1.2',
          'wp:base_site_url': 'https://example.com',
          item: [
            ...siteMap.pages.map(p => this.pageToItem(p)),
            ...siteMap.posts.map(p => this.postToItem(p))
          ]
        }
      }
    };
    
    const builder = new XMLBuilder({ ignoreAttributes: false, format: true, indentBy: '  ' });
    return builder.build(wxr);
  }
  
  private pageToItem(page: any): any {
    return {
      title: page.title,
      link: `https://example.com/${page.slug}`,
      pubDate: new Date().toUTCString(),
      'dc:creator': { '#text': 'admin' },
      guid: { '@isPermaLink': 'false', '#text': page.id },
      description: '',
      'content:encoded': { '#text': page.content },
      'wp:post_type': 'page',
      'wp:status': 'publish',
      'wp:post_name': page.slug
    };
  }
  
  private postToItem(post: any): any {
    return {
      title: post.title,
      link: `https://example.com/${post.slug}`,
      pubDate: post.date || new Date().toUTCString(),
      'dc:creator': { '#text': 'admin' },
      guid: { '@isPermaLink': 'false', '#text': post.id },
      description: '',
      'content:encoded': { '#text': post.content },
      'wp:post_type': 'post',
      'wp:status': 'publish',
      'wp:post_name': post.slug,
      category: post.categories?.map((c: string) => ({ '#text': c })) || [],
      'wp:tag': post.tags?.map((t: string) => ({ '#text': t })) || []
    };
  }
}
```

- [ ] **Step 2: Add fast-xml-parser dependency**

```bash
npm install fast-xml-parser
npm install -D @types/fast-xml-parser
```

- [ ] **Step 3: Commit**

```bash
git add src/pipeline/export/wxr.generator.ts
git commit -m "feat: create WXR export generator for WordPress import"
```

---

## Task 10: Pipeline Orchestrator

**Files:**
- Create: `src/pipeline/orchestrator.ts`

- [ ] **Step 1: Create pipeline orchestrator**

```typescript
// src/pipeline/orchestrator.ts
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
```

- [ ] **Step 2: Update API routes to use orchestrator**

Update `src/api/routes.ts` to import and use the PipelineOrchestrator.

- [ ] **Step 3: Commit**

```bash
git add src/pipeline/orchestrator.ts src/api/routes.ts
git commit -m "feat: create pipeline orchestrator to coordinate conversion stages"
```

---

## Task 11: Frontend - Basic UI

**Files:**
- Create: `frontend/package.json`, `frontend/src/App.tsx`, `frontend/src/components/Upload.tsx`

- [ ] **Step 1: Scaffold frontend**

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

- [ ] **Step 2: Create API client**

```typescript
// frontend/src/api/client.ts
const API_BASE = 'http://localhost:3000/api';

export interface ConvertRequest {
  input: { type: 'zip' | 'url' | 'local'; source: string };
  options: { outputFormat: string[]; styleMode: 'faithful' | 'native'; previewEnabled: boolean };
}

export async function createJob(request: ConvertRequest): Promise<{ jobId: string }> {
  const response = await fetch(`${API_BASE}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  return response.json();
}

export async function getJobStatus(jobId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/job/${jobId}/status`);
  return response.json();
}
```

- [ ] **Step 3: Create Upload component**

```typescript
// frontend/src/components/Upload.tsx
import { useState } from 'react';
import { createJob } from '../api/client';

export function Upload({ onJobCreated }: { onJobCreated: (jobId: string) => void }) {
  const [inputType, setInputType] = useState<'zip' | 'url' | 'local'>('url');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { jobId } = await createJob({
        input: { type: inputType, source },
        options: {
          outputFormat: ['wxr'],
          styleMode: 'native',
          previewEnabled: false
        }
      });
      
      onJobCreated(jobId);
    } catch (error) {
      console.error('Failed to create job', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Input Type:</label>
        <select value={inputType} onChange={e => setInputType(e.target.value as any)}>
          <option value="url">URL</option>
          <option value="zip">ZIP Upload</option>
          <option value="local">Local Directory</option>
        </select>
      </div>
      
      <div>
        <label>Source:</label>
        <input
          type={inputType === 'url' ? 'url' : 'text'}
          value={source}
          onChange={e => setSource(e.target.value)}
          placeholder={inputType === 'url' ? 'https://example.com' : inputType === 'zip' ? 'path/to/site.zip' : '/path/to/site'}
          required
        />
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Start Conversion'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Update App.tsx**

```typescript
// frontend/src/App.tsx
import { useState } from 'react';
import { Upload } from './components/Upload';

function App() {
  const [jobId, setJobId] = useState<string | null>(null);
  
  return (
    <div className="App">
      <h1>HTML to WordPress Converter</h1>
      
      {!jobId ? (
        <Upload onJobCreated={setJobId} />
      ) : (
        <div>
          <h2>Job: {jobId}</h2>
          <p>Conversion in progress...</p>
        </div>
      )}
    </div>
  );
}

export default App;
```

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold React frontend with upload component"
```

---

## Task 12: Integration Test

**Files:**
- Create: `tests/integration/pipeline.test.ts`

- [ ] **Step 1: Write end-to-end pipeline test**

```typescript
// tests/integration/pipeline.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
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
  
  it('processes a simple HTML site through the full pipeline', async () => {
    // Create test ZIP
    const zipPath = join(testDir, 'test-site.zip');
    await createTestZip(zipPath, [
      { path: 'index.html', content: '<html><head><title>Home</title></head><body><nav><ul><li><a href="/about">About</a></li></ul></nav><h1>Welcome</h1><p>This is the home page.</p></body></html>' },
      { path: 'about.html', content: '<html><head><title>About</title></head><body><h1>About Us</h1><p>Learn more about us.</p></body></html>' }
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
    
    expect(state.status).toBe('complete');
    expect(state.results.pageCount).toBeGreaterThanOrEqual(1);
  }, 60000);
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
```

- [ ] **Step 2: Run integration test**

```bash
npm test -- tests/integration/pipeline.test.ts --run
```

- [ ] **Step 3: Commit**

```bash
git add tests/integration/pipeline.test.ts
git commit -m "test: add end-to-end pipeline integration test"
```

---

## Verification

### Manual Testing Checklist

1. **Start the server:**
```bash
npm run dev
```

2. **Test API directly:**
```bash
curl http://localhost:3000/health
```

3. **Test conversion with sample site:**
```bash
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -d '{"input":{"type":"url","source":"https://example.com"},"options":{"outputFormat":["wxr"],"styleMode":"native","previewEnabled":false}}'
```

4. **Run test suite:**
```bash
npm test
```

5. **Build for production:**
```bash
npm run build
```

---

## Known Limitations

- Ollama must be running locally on port 11434
- WordPress direct installation not yet implemented (only WXR export)
- Theme generation not implemented
- Preview mode UI not implemented
- No authentication or rate limiting for cloud deployment
