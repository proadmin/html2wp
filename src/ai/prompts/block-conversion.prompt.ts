export const BLOCK_CONVERSION_PROMPT = `Convert this HTML content to WordPress Gutenberg blocks.

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
