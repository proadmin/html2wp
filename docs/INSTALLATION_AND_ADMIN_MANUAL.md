# HTML2WP Installation & Administration Manual

## What You're Getting Into

HTML2WP converts static HTML websites into WordPress-ready formats. It uses AI (via Ollama) to analyze your site's structure, then generates Gutenberg blocks, a custom WordPress theme, and a WXR import file. It's a Node.js service with a React frontend and a REST API.

This manual covers everything an administrator needs: getting it running, keeping it secure, and troubleshooting when things go sideways.

---

## System Requirements

Before you start, make sure your machine can actually handle this.

### Minimum Requirements
- **Node.js 20+** (we use modern features; 18 won't cut it)
- **npm 10+** or **pnpm 8+**
- **4GB RAM** (Ollama alone needs a couple gigs)
- **10GB free disk space** (for models, temporary files, and extracted sites)

### Recommended
- **8GB+ RAM** (Llama 3 runs much smoother with room to breathe)
- **SSD storage** (the pipeline generates a lot of small files)
- **Stable internet** (for URL crawling and fetching media)

### macOS Specifics
- Works great on Apple Silicon, though Ollama runs natively and is quite fast
- Intel Macs are fine but model loading takes longer

### Linux Specifics
- Tested on Ubuntu 22.04 and Debian 12
- Make sure `unzip` is available in your PATH
- SSH client (`openssh-client`) is needed for WP-CLI remote installs

---

## Prerequisites

### 1. Install Ollama

HTML2WP won't do anything useful without Ollama running. It's the brain that analyzes your HTML and writes WordPress blocks.

```bash
# macOS
curl -fsSL https://ollama.com/install.sh | sh

# Linux (see https://ollama.com/download for latest)
curl -fsSL https://ollama.com/install.sh | sh
```

Then pull the model we use:

```bash
ollama pull llama3
```

> **Note:** The first pull downloads several gigabytes. Grab coffee. Or tea. We don't judge.

Verify it's working:

```bash
ollama run llama3 "Hello"
```

You should see a response. If you get connection errors, make sure Ollama is running:

```bash
ollama serve
```

It needs to stay running on port 11434. HTML2WP connects to `http://localhost:11434` by default.

### 2. Node.js

If you don't have Node.js 20+, install it:

```bash
# macOS with Homebrew
brew install node@20

# Or use nvm
nvm install 20
nvm use 20
```

Verify:

```bash
node --version  # Should print v20.x.x
npm --version   # Should print 10.x.x
```

---

## Installation

### Standard Installation

```bash
# Clone the repository
git clone https://github.com/proadmin/html2wp.git
cd html2wp

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

That's it. No global packages, no Python dependencies, no drama.

### Environment Configuration

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

Here's what each variable does:

| Variable | Default | What It Does |
|----------|---------|--------------|
| `PORT` | `3000` | The port the Express server listens on |
| `API_KEY` | *(none)* | If set, requires Bearer token auth on all endpoints except `/health` |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin. Change this in production |
| `MAX_SOURCE_SIZE_MB` | `500` | Maximum request body size in megabytes |
| `OLLAMA_HOST` | `http://localhost:11434` | Where to find Ollama |
| `OLLAMA_MODEL` | `llama3` | Which model to use for analysis and transformation |

A minimal production `.env`:

```env
PORT=3000
API_KEY=your-super-secret-long-random-key-here
CORS_ORIGIN=https://yourdomain.com
MAX_SOURCE_SIZE_MB=1000
```

> **Security tip:** Generate your API key with `openssl rand -hex 32`. Don't use something guessable like "password123". We've seen it happen.

### Build for Production

```bash
# Build the frontend
npm run build

# Build the TypeScript backend
npm run build:backend  # or: npx tsc
```

The backend compiles to `dist/`, and the frontend builds to `frontend/dist/`.

---

## Running the Service

### Development Mode

This is what you'll use when developing or testing:

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start the dev server
npm run dev
```

The dev server uses `tsx` to watch for changes and auto-restart. The frontend Vite dev server runs separately on port 5173.

### Production Mode

```bash
# Build everything first
npm run build

# Start the server
node dist/api/server.js
```

For production deployments, use a process manager like `pm2` or `systemd`:

```bash
# With pm2
pm2 start dist/api/server.js --name html2wp
pm2 save
pm2 startup
```

### Health Checks

The server exposes a health endpoint:

```bash
curl http://localhost:3000/health
```

Response includes:
- Server status
- Timestamp
- Ollama connectivity status

Use this for load balancer health checks and monitoring.

---

## Architecture Overview

It helps to know how the pieces fit together.

```
Frontend (React + Vite)
    |
    | HTTP /api/*
    v
API Layer (Express)
    |
    | Job Events
    v
Pipeline Orchestrator (EventEmitter)
    |
    +-- Ingest Service  (ZIP extract, URL crawl, local scan)
    +-- Analyze Service (AI structure detection via Ollama)
    +-- Transform Service (HTML → Gutenberg blocks via AI)
    +-- Theme Service   (WordPress theme generation)
    +-- Export Service  (WXR file generation)
    |
    v
Output Directory (./output/<jobId>/)
```

Jobs are processed asynchronously. The client polls `/api/job/:id/status` for progress updates.

---

## Security Considerations

### API Key Authentication

If `API_KEY` is set, every request (except `/health`) must include:

```
Authorization: Bearer <your-api-key>
```

The comparison is timing-safe, so don't worry about brute-force timing attacks.

### CORS

By default, CORS is restricted to `http://localhost:5173`. In production, set `CORS_ORIGIN` to your actual frontend domain. Don't set it to `*` unless you enjoy reading security incident reports.

### Rate Limiting

The `/api/convert` endpoint is rate-limited to 5 requests per minute per IP. This is an in-memory limiter, so it resets on server restart and doesn't share state across instances. For multi-instance deployments, you'll want to add a Redis-backed rate limiter.

### Input Validation

The service validates:
- URL inputs against SSRF (blocks private IPs, localhost, etc.)
- File paths for path traversal (`..`, null bytes)
- ZIP files must have a `.zip` extension
- Request body size is limited by `MAX_SOURCE_SIZE_MB`

### SSH Commands

WP-CLI installation over SSH validates connection strings and WXR paths with strict regex patterns. Commands timeout after 60 seconds by default.

---

## Maintenance

### Log Files

Logs go to stdout/stderr. In production, pipe them somewhere useful:

```bash
node dist/api/server.js 2>&1 | tee -a /var/log/html2wp.log
```

Or let pm2 handle it:

```bash
pm2 logs html2wp
```

### Temporary Files

The `output/` directory accumulates job results. Each job gets its own subdirectory. Old jobs are cleaned up automatically after 24 hours, but you might want to add a cron job for more aggressive cleanup if disk space is tight.

```bash
# Add to crontab for daily cleanup of files older than 7 days
0 2 * * * find /path/to/html2wp/output -type d -mtime +7 -exec rm -rf {} +
```

### Updating

```bash
git pull origin main
npm install
cd frontend && npm install && cd ..
npm run build
```

Then restart the service.

---

## Troubleshooting

### "Ollama connection refused"

Ollama isn't running. Start it:

```bash
ollama serve
```

### "Model not found"

You forgot to pull the model:

```bash
ollama pull llama3
```

### Pipeline timeouts

The default pipeline timeout is 10 minutes. For very large sites, increase `PIPELINE_TIMEOUT_MS` in `src/pipeline/orchestrator.ts` (requires rebuild).

### Out of memory

Large ZIP files or deep URL crawls can exhaust memory. Increase Node.js heap:

```bash
node --max-old-space-size=4096 dist/api/server.js
```

### CORS errors in browser

Your `CORS_ORIGIN` doesn't match where you're accessing the frontend from. Check the browser console for the exact origin and update `.env`.

---

## Advanced: Docker Deployment

There's no official Docker image yet, but here's a Dockerfile that works:

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    unzip \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/api/server.js"]
```

Note: Ollama needs to run separately. The container connects to it via `OLLAMA_HOST`.

---

## Getting Help

- Check the logs first — they're surprisingly informative
- Make sure Ollama is healthy: `curl http://localhost:11434/api/tags`
- Verify your `.env` configuration
- Run the test suite: `npm test -- --run`

If you're stuck, open an issue with:
1. Your Node.js version
2. Your Ollama version (`ollama --version`)
3. The relevant log output
4. What you were trying to do when it broke
