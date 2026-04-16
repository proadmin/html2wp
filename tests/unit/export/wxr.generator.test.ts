import { describe, it, expect } from 'vitest';
import { WxrGenerator } from '../../../src/pipeline/export/wxr.generator.js';
import type { SiteMap, Page, Post } from '../../../src/types/index.js';

describe('WxrGenerator', () => {
  it('generates valid WXR XML for pages', () => {
    const generator = new WxrGenerator();
    const siteMap: SiteMap = {
      pages: [{ id: '1', title: 'Home', slug: 'home', content: '<!-- wp:paragraph -->Hello<!-- /wp:paragraph -->' }] as Page[],
      posts: [] as Post[],
      menus: [],
      assets: []
    };

    const result = generator.generate(siteMap);

    expect(result).toContain('<?xml');
    expect(result).toContain('<rss');
    expect(result).toContain('wp:wxr_version');
    expect(result).toContain('wp:post_type');
    expect(result).toContain('Home');
    expect(result).toContain('wp:base_site_url');
  });

  it('generates WXR with posts and categories', () => {
    const generator = new WxrGenerator();
    const siteMap: SiteMap = {
      pages: [] as Page[],
      posts: [{
        id: '2',
        title: 'Blog Post',
        slug: 'blog-post',
        content: 'Content',
        date: '2024-01-01',
        categories: ['News'],
        tags: ['update']
      }] as Post[],
      menus: [],
      assets: []
    };

    const result = generator.generate(siteMap);

    expect(result).toContain('<wp:post_type>post</wp:post_type>');
    expect(result).toContain('Blog Post');
  });

  it('handles empty site map', () => {
    const generator = new WxrGenerator();
    const siteMap: SiteMap = { pages: [], posts: [], menus: [], assets: [] };

    const result = generator.generate(siteMap);

    expect(result).toContain('<?xml');
    expect(result).toContain('<rss');
  });
});
