# HTML-to-WordPress Converter

A Node.js/TypeScript web application that converts static HTML websites to WordPress format using Ollama AI for content transformation.

## Features

- **Multiple Input Sources**: Upload ZIP files, crawl URLs, or scan local directories
- **AI-Powered Analysis**: Uses Ollama (Llama 3) to analyze site structure and convert HTML to Gutenberg blocks
- **Preview Mode**: Review converted content before exporting (optional)
- **WXR Export**: Generate WordPress eXtended RSS files for easy import
- **React Frontend**: Clean, modern UI for managing conversions

## Prerequisites

- Node.js 20+
- Ollama running locally (`ollama serve`)
- Llama 3 model installed (`ollama pull llama3`)

## Installation

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

## Usage

### Start Development Servers

```bash
# Backend (port 3000)
npm run dev

# Frontend (port 5173) - in a separate terminal
cd frontend && npm run dev
```

### Convert a Website

1. Open http://localhost:5173
2. Enter a URL, upload a ZIP, or specify a local directory
3. Configure options:
   - **Output Format**: WXR (WordPress XML), Direct Install, or Complete Package
   - **Style Mode**: Faithful (replicate original design) or Theme-Native (Twenty Twenty-Five patterns)
   - **Preview Mode**: Enable to review content before export
4. Click "Start Conversion"
5. When complete, download the WXR file or view preview

### Import to WordPress

1. In WordPress admin, go to **Tools → Import**
2. Install the WordPress importer if prompted
3. Upload the downloaded `.xml` file
4. Assign authors and import attachments

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/convert` | POST | Create a new conversion job |
| `/api/job/:id/status` | GET | Get job status and progress |
| `/api/job/:id/preview` | GET | Get preview data for converted content |
| `/api/job/:id/result/:file` | GET | Download export file |

### Example API Usage

```bash
# Create conversion job
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -d '{
    "input": {"type": "url", "source": "https://example.com"},
    "options": {"outputFormat": ["wxr"], "styleMode": "native", "previewEnabled": false}
  }'

# Check job status
curl http://localhost:3000/api/job/<jobId>/status

# Download WXR file
curl -O http://localhost:3000/api/job/<jobId>/result/wordpress.xml
```

## Commands

```bash
# Run tests
npm test -- --run

# Run tests in watch mode
npm test

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

## Architecture

### Pipeline Services

1. **Ingest** - Handles ZIP upload, URL crawling (Playwright), and local directory scanning
2. **Analyze** - AI-powered structure detection using Ollama
3. **Transform** - Converts HTML to Gutenberg blocks via AI prompts
4. **Theme** - Generates Twenty Twenty-Five child theme
5. **Export** - Generates WXR files and optional direct WordPress installation

### Project Structure

```
HTML2WP/
├── src/
│   ├── api/              # Express server and routes
│   ├── pipeline/         # Conversion pipeline services
│   │   ├── ingest/       # Input handlers (ZIP, URL, local)
│   │   ├── analyze/      # AI site analysis
│   │   ├── transform/    # HTML to Gutenberg conversion
│   │   ├── theme/        # WordPress theme generation
│   │   └── export/       # WXR generation and WP installation
│   ├── ai/               # Ollama client and prompts
│   ├── wordpress/        # WordPress API client
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utilities and logger
├── frontend/
│   └── src/
│       ├── components/   # React components
│       ├── hooks/        # Custom hooks
│       └── api/          # API client
└── tests/
    ├── unit/             # Unit tests
    └── integration/      # Integration tests
```

## Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **AI**: Ollama (Llama 3)
- **Crawling**: Playwright
- **Frontend**: React, Vite, TypeScript
- **Testing**: Vitest
- **XML**: fast-xml-parser

## Known Limitations

- Ollama must be running locally on port 11434
- URL crawling may fail on sites with PDF downloads or complex JavaScript
- Direct WordPress installation requires REST API credentials or SSH access

## License

MIT
