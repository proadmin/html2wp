# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HTML-to-WordPress Converter — A Node.js/TypeScript service that converts static HTML websites to WordPress format using Ollama AI for content transformation.

## Commands

```bash
# Install dependencies
npm install

# Run tests
npm test -- --run

# Run tests in watch mode
npm test

# Type check
npx tsc --noEmit

# Run development server
npm run dev

# Build for production
npm run build
```

## Architecture

**Pipeline Services** (in `src/pipeline/`):
- `ingest/` — Handles ZIP upload, URL crawling (Playwright), and local directory scanning
- `analyze/` — AI-powered structure detection using Ollama (Llama 3)
- `transform/` — Converts HTML to Gutenberg blocks via AI prompts
- `export/` — Generates WXR (WordPress eXtended RSS) files for import

**AI Layer** (`src/ai/`):
- `ollama.client.ts` — HTTP client for Ollama API
- `prompts/` — Specialized prompts for structure analysis and block conversion

**API** (`src/api/`):
- Express server with job-based async processing
- Endpoints: `POST /api/convert`, `GET /api/job/:id/status`

## Tech Stack

- Node.js 20+, TypeScript, Express
- Playwright (URL crawling)
- Ollama (AI inference — requires `ollama serve` running on port 11434)
- Vitest (testing)
- fast-xml-parser (WXR generation)

## Development Notes

- Ollama must be running locally: `ollama serve` (pull `llama3` model first)
- Jobs run asynchronously via EventEmitter-based orchestrator
- Output files stored in `output/<jobId>/`
