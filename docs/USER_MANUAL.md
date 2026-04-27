# HTML2WP User Manual

## Welcome

HTML2WP takes a static HTML website — whether it's a ZIP file, a live URL, or a folder on your computer — and converts it into something WordPress can understand. That means:

- Your pages become WordPress pages
- Your blog posts become WordPress posts
- Your navigation menus become WordPress menus
- Your styles get packaged into a custom WordPress theme
- Everything gets wrapped up in a WXR file you can import directly

You don't need to know code. You don't need to understand WordPress internals. You just need a website you want to migrate.

---

## What You Can Feed It

HTML2WP accepts three kinds of input. Each has its quirks, so pick the one that matches your situation.

### 1. ZIP File

**Best for:** Sites you've already downloaded, template packages, or exports from other platforms.

Just drag and drop (or select) a ZIP containing your HTML files. The service will extract it, scan all the files, and figure out what's a page, what's a post, and what's an image or stylesheet.

**Requirements:**
- The ZIP should contain HTML files at the root or in a single directory
- CSS and images should be in the ZIP too, or the preview won't look right
- Max size is set by your administrator (default 500MB)

**Pro tip:** If your ZIP came from a "Save Page As" in a browser, it might not include all the assets. For best results, use a proper site export or the URL crawler.

### 2. Live URL

**Best for:** Sites that are currently online and you want to convert directly.

Paste the URL of the homepage (or any page), and HTML2WP will crawl the site using a headless browser. It follows links, downloads assets, and builds a complete picture of your site structure.

**Requirements:**
- The site must be publicly accessible
- JavaScript-rendered content is supported (we use Playwright)
- Private IPs and localhost URLs are blocked for security

**What gets crawled:**
- Up to 100 pages by default
- Up to 5 levels deep from the starting URL
- Images, CSS, JavaScript, and fonts

**Heads up:** Crawling takes time. A 50-page site might take 2-3 minutes. The progress bar will keep you updated.

### 3. Local Directory

**Best for:** Development sites, sites built with static generators like Hugo or Jekyll, or anything you have locally.

Provide the absolute path to a directory containing your HTML files. The service scans it the same way it scans extracted ZIPs.

**Requirements:**
- The server needs read access to the directory
- Use absolute paths (starting with `/` on Unix or a drive letter on Windows)

---

## The Conversion Pipeline

When you hit "Convert," your site goes through five stages. Understanding them helps you know what to expect and where things might go wrong.

### Stage 1: Ingest (0-20%)

We grab your files. ZIPs get extracted, URLs get crawled, local directories get scanned. At the end of this stage, we have a complete inventory of every HTML file, image, stylesheet, and script.

**What could go wrong:**
- ZIP is corrupted → "Invalid ZIP file"
- URL is unreachable → "Failed to crawl URL"
- Directory doesn't exist → "Path not found"

### Stage 2: Analyze (20-40%)

This is where the AI kicks in. We send your HTML to Ollama (running locally), and it figures out:
- Which pages are "real" pages vs. blog posts
- What your navigation structure looks like
- Which pages are probably duplicates or utility pages
- The overall hierarchy of your site

**What could go wrong:**
- Ollama isn't running → "AI service unavailable"
- The model is still loading → Might take an extra minute on first run
- HTML is extremely unusual → AI might misclassify pages

**Note:** The AI isn't perfect. It does a remarkably good job on standard sites, but if you have a very unusual structure, you might need to review and adjust the results.

### Stage 3: Transform (40-70%)

Now we convert your HTML into WordPress Gutenberg blocks. The AI reads each page's content and decides:
- This paragraph becomes a Paragraph block
- This image gallery becomes a Gallery block
- This heading becomes a Heading block
- This embedded video becomes an Embed block

The result is clean, semantic WordPress content — not a blob of pasted HTML.

**What could go wrong:**
- Complex JavaScript widgets → AI might not know what to do with them
- Inline styles → Might get stripped or converted to block settings
- Third-party embeds → Might need manual adjustment after import

### Stage 4: Theme Generation (70-90%)

We build a custom WordPress theme based on your site's styles. This includes:
- `style.css` with your colors, fonts, and spacing
- `index.php` and other template files
- `functions.php` with theme setup
- Block patterns for reusable layouts

The theme is generated in the output directory and can be installed as a ZIP.

### Stage 5: Export (90-100%)

Everything gets packaged:
- WXR file for WordPress import
- Theme ZIP file
- Asset files organized by type

You'll get download links for all of these.

---

## Using the Web Interface

### Starting a Conversion

1. Open the HTML2WP frontend in your browser
2. Choose your input type (ZIP, URL, or Local)
3. Provide the input:
   - **ZIP:** Click "Choose File" and select your ZIP
   - **URL:** Paste the full URL including `https://`
   - **Local:** Type the absolute path to your directory
4. Choose your output format(s):
   - **WXR:** WordPress eXtended RSS file for import
   - **Direct:** Install directly to a WordPress site via REST API or WP-CLI
   - **Package:** Everything bundled as a downloadable ZIP
5. Choose style mode:
   - **Faithful:** Tries to match your original design pixel-for-pixel
   - **Native:** Adapts your design to feel more like a native WordPress theme
6. Click "Convert"

### Monitoring Progress

The progress bar updates in real-time as each pipeline stage completes. You can also see the current step name and a description of what's happening.

If something fails, you'll see an error message with (hopefully) a clear description of what went wrong.

### Previewing Results

Once analysis is complete, you can preview:
- The detected page structure
- The detected posts
- The navigation menus
- The asset inventory

This is a great time to check if the AI correctly identified your pages and posts. If it didn't, you can cancel and try again — sometimes tweaking the source HTML helps.

### Downloading Results

After conversion completes:

1. Click "Export" to generate downloadable files
2. Download the WXR file for WordPress import
3. Download the theme ZIP if you want to install it manually

---

## Using the API Directly

If you're building this into a workflow or just prefer curl, here's how to use the REST API.

### Authentication

If your administrator has set an API key, include it in every request:

```bash
curl -H "Authorization: Bearer your-api-key" http://localhost:3000/api/convert
```

### Creating a Conversion Job

**ZIP upload:**

```bash
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "input": {
      "type": "zip",
      "source": "/path/to/your-site.zip"
    },
    "options": {
      "outputFormat": ["wxr", "package"],
      "styleMode": "faithful",
      "previewEnabled": true
    }
  }'
```

**URL crawl:**

```bash
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "input": {
      "type": "url",
      "source": "https://example.com"
    },
    "options": {
      "outputFormat": ["wxr"],
      "styleMode": "native",
      "previewEnabled": false
    }
  }'
```

**Local directory:**

```bash
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "input": {
      "type": "local",
      "source": "/home/user/my-website"
    },
    "options": {
      "outputFormat": ["wxr", "package"],
      "styleMode": "faithful",
      "previewEnabled": true
    }
  }'
```

Response:

```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Checking Job Status

```bash
curl http://localhost:3000/api/job/a1b2c3d4-e5f6-7890-abcd-ef1234567890/status \
  -H "Authorization: Bearer your-api-key"
```

Response while running:

```json
{
  "jobId": "a1b2c3d4...",
  "status": "transforming",
  "progress": {
    "currentStep": "transforming",
    "percent": 60,
    "message": "Converting to WordPress format"
  },
  "results": {
    "pageCount": 12,
    "postCount": 5,
    "assetCount": 47
  }
}
```

Response when complete:

```json
{
  "jobId": "a1b2c3d4...",
  "status": "complete",
  "progress": {
    "currentStep": "complete",
    "percent": 100,
    "message": "Export complete"
  },
  "results": {
    "pageCount": 12,
    "postCount": 5,
    "assetCount": 47,
    "outputUrls": ["/output/a1b2c3d4.../export/wordpress.xml"]
  }
}
```

### Previewing Results

```bash
curl http://localhost:3000/api/job/a1b2c3d4-e5f6-7890-abcd-ef1234567890/preview \
  -H "Authorization: Bearer your-api-key"
```

Returns the detected pages, posts, menus, and assets.

### Exporting and Downloading

Generate export files:

```bash
curl -X POST http://localhost:3000/api/job/a1b2c3d4-e5f6-7890-abcd-ef1234567890/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "outputFormats": ["wxr"]
  }'
```

Response:

```json
{
  "downloadUrl": "/api/job/a1b2c3d4.../result",
  "exportResults": {
    "wxr": "/api/job/a1b2c3d4.../result/wordpress.xml"
  }
}
```

Download the file:

```bash
curl -O http://localhost:3000/api/job/a1b2c3d4-e5f6-7890-abcd-ef1234567890/result/wordpress.xml \
  -H "Authorization: Bearer your-api-key"
```

---

## Installing to WordPress

### Method 1: WXR Import (Recommended for most users)

1. Download the `wordpress.xml` file from HTML2WP
2. Log into your WordPress admin panel
3. Go to **Tools → Import**
4. Click "Install Now" under WordPress (if not already installed)
5. Click "Run Importer"
6. Choose the `wordpress.xml` file
7. Map authors or create a new one
8. Check "Download and import file attachments" if you want media imported too
9. Click "Submit"

**After import:**
- Activate the generated theme in **Appearance → Themes**
- Check your menus in **Appearance → Menus** and assign them to locations
- Review pages and posts for any formatting issues

### Method 2: Direct REST API Install

For automated workflows, you can have HTML2WP install directly to your WordPress site:

1. Create an Application Password in WordPress:
   - Go to your WordPress profile
   - Scroll to "Application Passwords"
   - Create one named "HTML2WP"
   - Copy the generated password

2. In HTML2WP, when configuring your conversion, expand "WordPress Configuration":
   - Site URL: `https://yoursite.com`
   - Application Password: (the one you just created)
   - Install Method: REST API

3. After the pipeline completes, it will automatically create pages, posts, and media on your site.

### Method 3: WP-CLI over SSH

For developers who prefer the command line:

1. In HTML2WP, configure:
   - SSH Connection: `user@yourserver.com`
   - Install Method: WP-CLI

2. Make sure WP-CLI is installed on the server

3. The service will SSH in and run:
   - `wp import ... --authors=create`
   - `wp media regenerate --yes`

**Requirements:**
- SSH key authentication (password auth isn't supported)
- WP-CLI installed on the remote server
- The WXR file path must be accessible on that server

---

## Understanding the Output

### WXR File

This is a standard WordPress eXtended RSS file. It contains:
- All pages with their content (as Gutenberg blocks)
- All posts with categories and tags
- Navigation menus
- Media references (but not the actual media files)

You can inspect it with any text editor. It's just XML.

### Theme Package

The generated theme includes:

| File | Purpose |
|------|---------|
| `style.css` | Theme header, custom properties, base styles |
| `index.php` | Fallback template |
| `functions.php` | Theme setup, block styles, enqueue scripts |
| `templates/` | Block templates for pages, posts, archives |
| `patterns/` | Reusable block patterns |
| `assets/` | Images, fonts, and compiled CSS |

### Assets Directory

All downloaded/crawled assets are organized by type:
- `images/` — JPG, PNG, SVG, etc.
- `css/` — Stylesheets
- `js/` — JavaScript files
- `fonts/` — Web fonts

---

## Tips for Best Results

### Before You Convert

1. **Clean up your HTML** if you can. Remove tracking scripts, analytics, and ad code. The AI doesn't need to see those.
2. **Make sure navigation is semantic** — actual `<nav>` elements or at least `<ul>` lists of links. The AI uses these to detect menus.
3. **Use consistent heading structure** — one H1 per page, logical H2/H3 hierarchy. This helps the AI understand content structure.

### After You Convert

1. **Always review the preview** before downloading. Check if pages and posts were detected correctly.
2. **Test the WXR import on a staging site first.** Don't import directly to production.
3. **Check media references.** If images were hotlinked, they'll still point to the original site. Download them and update references if needed.
4. **Review the generated theme.** It captures your styles, but you might want to tweak spacing, breakpoints, or colors.

### Common Pitfalls

- **Single-page apps (SPAs):** HTML2WP is designed for static HTML. SPAs that render everything with JavaScript won't convert well.
- **Password-protected sites:** The URL crawler can't log in. Use a ZIP or local directory instead.
- **Very large sites:** Sites with thousands of pages will hit the crawl limit. Consider converting in chunks.
- **Dynamic content:** Content loaded by AJAX after page load won't be captured. Make sure critical content is in the initial HTML.

---

## Troubleshooting for Users

### "The preview doesn't look like my site"

The preview shows the *detected structure*, not a pixel-perfect rendering. The actual WordPress site will look much closer to your original once the theme is active.

### "Some pages are missing"

The crawler has limits (100 pages, 5 levels deep). If your site is larger, the crawler stops at the limit. Try:
- Converting specific sections separately
- Using a ZIP that contains all files
- Increasing the crawl limits (requires code change)

### "Images are broken after import"

The WXR file references images, but WordPress needs to import them. Make sure you check "Download and import file attachments" during WXR import. If images were hotlinked, they might fail to download.

### "The AI classified everything as pages (or posts)"

This happens when the site structure is ambiguous. The AI looks for clues like:
- Dates in URLs (`/2024/01/my-post`)
- "Blog" or "News" in navigation
- Article-style formatting

If your site doesn't have these clues, the AI defaults to pages. You can manually change post types after import.

### "Conversion is taking forever"

- URL crawling is usually the slowest part. Be patient.
- The AI analysis step depends on your machine's speed. On an M1 Mac, it's pretty fast. On older hardware, it takes longer.
- First-time model loading adds 30-60 seconds. Subsequent runs reuse the loaded model.

---

## FAQ

**Q: Will this work with my [specific framework] site?**
A: If it outputs static HTML, probably yes. We've tested with plain HTML, Bootstrap sites, Tailwind sites, Hugo, Jekyll, and 11ty. React/Vue/Angular SPAs won't work well.

**Q: Can I convert multiple sites at once?**
A: Yes, each conversion is an independent job. Just start multiple conversions.

**Q: Does it handle forms?**
A: Forms are converted to HTML blocks, but they won't work without a backend. You'll need to install a form plugin (like Contact Form 7 or WPForms) and recreate them.

**Q: What about e-commerce?**
A: Don't use this for e-commerce sites. Product pages, carts, and checkout flows won't translate properly.

**Q: Is my data sent to the cloud?**
A: No. Ollama runs locally on your machine. Your HTML never leaves your server.

---

## That's It

You're now equipped to convert HTML sites to WordPress. Start with a small site to get a feel for the process, then work your way up to larger projects.

If something doesn't work the way you expect, check the logs, try a different input method, or simplify your source HTML. The AI is smart, but it's not magic — clean, well-structured HTML gives the best results.
