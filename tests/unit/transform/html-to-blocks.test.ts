import { describe, it, expect, vi } from 'vitest';
import { HtmlToBlocksConverter } from '../../../src/pipeline/transform/html-to-blocks.js';
import { OllamaClient } from '../../../src/ai/ollama.client.js';

// Mock global fetch
global.fetch = vi.fn();

describe('HtmlToBlocksConverter', () => {
  it('converts simple HTML to Gutenberg blocks', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '<!-- wp:paragraph -->Hello World<!-- /wp:paragraph -->' })
    } as any);

    const converter = new HtmlToBlocksConverter(new OllamaClient());
    const html = '<p>Hello World</p>';

    const result = await converter.convert(html);

    expect(result).toContain('<!-- wp:paragraph -->');
  });

  it('handles empty HTML gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '' })
    } as any);

    const converter = new HtmlToBlocksConverter(new OllamaClient());
    const result = await converter.convert('');

    // Empty response returns empty string (AI returned empty, not an error)
    expect(result).toBe('');
  });

  it('falls back to HTML block on AI failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const converter = new HtmlToBlocksConverter(new OllamaClient({ baseUrl: 'http://invalid', model: 'test' }));
    const html = '<p>Test content</p>';

    // Should not throw, should return fallback
    const result = await converter.convert(html);

    expect(result).toContain('<!-- wp:html -->');
    expect(result).toContain(html);
  });
});
