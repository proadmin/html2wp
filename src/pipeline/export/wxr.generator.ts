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
