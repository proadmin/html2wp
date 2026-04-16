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
