# HTML-to-WordPress Converter - Design Specification

**Date:** 2026-04-16  
**Status:** Draft

---

## Overview

A Node.js/TypeScript web application that converts static HTML websites to WordPress format using Ollama-based AI for content transformation, structure analysis, and asset handling.

---

## Requirements Summary

| Requirement | Decision |
|-------------|----------|
| **Type** | Service/platform with web UI |
| **Input Methods** | ZIP upload, URL crawl, local directory |
| **Output Formats** | WXR XML, direct WP install, complete package (user selectable) |
| **AI Pipeline** | Hybrid: general models + specialized prompts |
| **Content Types** | Pages, posts, custom post types, categories, tags |
| **Menus** | Auto-detect and convert via AI |
| **Styling** | User choice: faithful reproduction or theme-native |
| **Assets** | All uploaded to WordPress media library |
| **Scale** | Scalable architecture for all site sizes |
| **Stack** | Node.js/TypeScript |
| **Deployment** | Self-hosted and cloud-hosted options |
| **UX** | Automatic with optional preview mode |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Web UI (React)                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │   Upload    │ │  Configure  │ │   Preview   │ │    Download     │   │
│  │   (ZIP/URL) │ │  Options    │ │  (Optional) │ │    Export       │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API Layer (Express)                             │
│  POST /api/convert  POST /api/preview  GET /api/status  GET /api/result│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Conversion Pipeline (Orchestrator)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Ingest   │→ │ Analyze  │→ │ Transform│→ │  Build   │→ │ Export   │  │
│  │ Service  │  │ Service  │  │ Service  │  │  Theme   │  │ Service  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Ollama AI Services                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ Structure Parser │  │ Content Cleaner  │  │ Menu Classifier  │      │
│  │ (page detection) │  │ (HTML→Blocks)    │  │ (nav hierarchy)  │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Ingest Service

Handles all input methods uniformly:

- **ZIP Handler**: Extracts to temp directory, validates structure
- **URL Crawler**: Uses Playwright to crawl and download static sites
- **Local Dir Reader**: Scans and copies local files to processing directory
- **Output**: Normalized file tree with metadata (paths, sizes, types)

### 2. Analyze Service

AI-powered structure detection:

- **Page Detector**: Identifies HTML files vs. assets, detects page templates
- **Content Classifier**: Distinguishes pages, posts, archives, custom post types
- **Navigation Parser**: Finds `<nav>` elements, extracts menu hierarchy
- **Asset Mapper**: Catalogs images, CSS, JS with dependency graphs
- **AI Model**: Ollama (Llama 3) with specialized prompts for pattern recognition

### 3. Transform Service

Core conversion logic:

- **HTML→Blocks Converter**: Transforms HTML content to Gutenberg block format
- **Asset Processor**: Prepares media for WordPress upload (renaming, metadata)
- **Menu Builder**: Converts nav structures to WordPress menu format
- **Style Handler**: Two modes — faithful (CSS extraction) or theme-native (block patterns)
- **AI Model**: Ollama for semantic HTML cleanup and block structure optimization

### 4. Build Theme Service

Twenty Twenty-Five integration:

- **Child Theme Generator**: Creates theme files with custom templates
- **Block Pattern Library**: Maps original designs to WP block patterns
- **CSS Processor**: Extracts and adapts styles based on user mode selection
- **Template Parts**: Generates header, footer, sidebar templates

### 5. Export Service

Multiple output formats:

- **WXR Generator**: Creates WordPress XML import file
- **WP-CLI Executor**: Direct installation via REST API or SSH
- **Package Builder**: Bundles theme + SQL + assets into deployable ZIP
- **Media Uploader**: Handles asset uploads to WordPress media library

---

## Data Flow

### Conversion Pipeline Sequence

```
1. UPLOAD         User provides site (ZIP/URL/local)
       │
       ▼
2. INGEST         Files extracted → temp storage with manifest
       │
       ▼
3. ANALYZE        AI scans structure → site map JSON
       │           - Pages/posts classification
       │           - Menu hierarchy
       │           - Asset dependency graph
       ▼
4. TRANSFORM      AI converts content → WordPress format
       │           - HTML → Gutenberg blocks
       │           - Images → media library entries
       │           - Nav → WordPress menu structure
       ▼
5. BUILD THEME    Twenty Twenty-Five child theme generated
       │           - Custom templates
       │           - Extracted CSS (if faithful mode)
       │           - Block patterns
       ▼
6. EXPORT         Output generated (user's selected format)
       │
       ├─→ WXR XML + media ZIP
       ├─→ Direct WP install (API push)
       └─→ Complete package (theme + SQL dump)
       ▼
7. DOWNLOAD       User receives files or confirmation
```

### Job State Object

```typescript
{
  jobId: string;
  status: 'pending' | 'ingesting' | 'analyzing' | 'transforming' | 'building' | 'exporting' | 'complete' | 'error';
  input: { type: 'zip' | 'url' | 'local'; source: string };
  options: { outputFormat: OutputFormat[]; styleMode: 'faithful' | 'native'; previewEnabled: boolean };
  progress: { currentStep: string; percent: number; message: string };
  results: { pageCount: number; postCount: number; assetCount: number; outputUrls: string[] };
  error?: { code: string; message: string; recoverable: boolean };
}
```

---

## Error Handling

### Error Categories

| Category | Handling |
|----------|----------|
| **Invalid Input** (corrupt ZIP, unreachable URL) | Immediate error, user notified with retry option |
| **AI Processing Failure** (Ollama timeout, malformed response) | Retry with fallback prompt, then graceful degradation |
| **Asset Errors** (broken image links, unsupported formats) | Skip with warning, include in error report |
| **WordPress Export Errors** (WP API auth failure, disk full) | Pause job, allow user to resolve and resume |
| **Large Site Limits** (memory, timeout) | Batch processing with checkpoint/resume |

### Recovery Strategies

- **Checkpoint System**: Each pipeline stage writes intermediate results — can resume from failure point
- **Dry Run Mode**: Analyze-only mode shows what would be converted before committing
- **Partial Export**: If full conversion fails, allow exporting successfully converted portions
- **Error Report**: Downloadable JSON with all warnings/errors for debugging

### Edge Cases Handled

- Relative vs. absolute URLs in HTML
- Multi-level navigation menus (dropdowns, mega-menus)
- Dynamic content (JS-rendered elements via crawler)
- Non-standard HTML structures
- Duplicate slugs/permalinks
- Missing or broken internal links

---

## API Design

### Core Endpoints

```
POST /api/convert
  Body: { input: { type, source }, options }
  → { jobId }

GET /api/job/:jobId/status
  → { status, progress, error? }

GET /api/job/:jobId/preview
  → { pages: [], menus: [], assets: [] }

POST /api/job/:jobId/export
  Body: { outputFormats: [] }
  → { downloadUrl, exportResults }

GET /api/job/:jobId/result/:file
  → File download
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Framework | Express + TypeScript |
| Frontend | React + Vite |
| HTML Parsing | `node-html-parser` / `cheerio` |
| Crawling | Playwright (for JS sites) |
| AI | Ollama (Llama 3 + custom prompts) |
| WordPress | WP-CLI / REST API |
| Packaging | `archiver` for ZIP generation |
| Queue | `bull` for job processing (optional for scale) |

---

## Next Steps

1. Create implementation plan via writing-plans skill
2. Set up project scaffolding
3. Implement pipeline stages incrementally
4. Test with sample HTML sites
