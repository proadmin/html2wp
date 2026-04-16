import { OllamaClient } from '../../ai/ollama.client.js';
import { HtmlToBlocksConverter } from './html-to-blocks.js';
import { logger } from '../../utils/logger.js';
import type { SiteMap } from '../../types/index.js';

export class TransformService {
  private blocksConverter: HtmlToBlocksConverter;

  constructor(ollama: OllamaClient) {
    this.blocksConverter = new HtmlToBlocksConverter(ollama);
  }

  async transform(siteMap: SiteMap): Promise<SiteMap> {
    logger.info('Starting content transformation');

    const transformedPages = await Promise.all(
      siteMap.pages.map(page => this.transformPage(page))
    );

    const transformedPosts = await Promise.all(
      siteMap.posts.map(post => this.transformPost(post))
    );

    logger.info(`Transformed ${transformedPages.length} pages, ${transformedPosts.length} posts`);

    return {
      pages: transformedPages,
      posts: transformedPosts,
      menus: siteMap.menus,
      assets: siteMap.assets
    };
  }

  private async transformPage(page: any): Promise<any> {
    const blocks = await this.blocksConverter.convert(page.content);
    return { ...page, content: blocks };
  }

  private async transformPost(post: any): Promise<any> {
    const blocks = await this.blocksConverter.convert(post.content);
    return { ...post, content: blocks };
  }
}
