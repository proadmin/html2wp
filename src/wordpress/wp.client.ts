import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

export interface WordPressConfig {
  siteUrl: string;
  adminUrl?: string;
  username?: string;
  password?: string;
  appPassword?: string;
  sshConnection?: string;
}

export class WordPressClient {
  constructor(private config: WordPressConfig) {}

  /**
   * Install WordPress content via WP-CLI over SSH
   */
  async installViaWpCli(wxrPath: string, sshConnection: string): Promise<void> {
    logger.info('Installing via WP-CLI', { sshConnection, wxrPath });

    try {
      // Import WXR file
      await execAsync(`ssh ${sshConnection} "wp import ${wxrPath} --authors=create"`);

      // Regenerate thumbnails
      await execAsync(`ssh ${sshConnection} "wp media regenerate --yes"`);

      logger.info('WP-CLI installation complete');
    } catch (error) {
      logger.error('WP-CLI installation failed', error);
      throw new Error(`WP-CLI failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Install content via WordPress REST API
   */
  async installViaRestApi(content: WordPressContent): Promise<InstallResult> {
    logger.info('Installing via REST API', { url: this.config.siteUrl });

    const baseUrl = this.config.siteUrl.replace(/\/$/, '') + '/wp-json/wp/v2';
    const authHeader = this.getAuthHeader();

    const result: InstallResult = {
      pages: [],
      posts: [],
      media: []
    };

    try {
      // Upload media first
      for (const media of content.media || []) {
        const mediaId = await this.uploadMedia(baseUrl, media, authHeader);
        result.media.push({ originalId: media.id, wpId: mediaId });
      }

      // Create pages
      for (const page of content.pages) {
        const pageId = await this.createPage(baseUrl, page, authHeader);
        result.pages.push({ originalId: page.id, wpId: pageId });
      }

      // Create posts
      for (const post of content.posts) {
        const postId = await this.createPost(baseUrl, post, authHeader);
        result.posts.push({ originalId: post.id, wpId: postId });
      }

      // Create menus
      if (content.menus) {
        await this.createMenus(baseUrl, content.menus, authHeader);
      }

      logger.info('REST API installation complete', result);

      return result;
    } catch (error) {
      logger.error('REST API installation failed', error);
      throw new Error(`REST API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getAuthHeader(): string {
    if (this.config.appPassword) {
      const credentials = Buffer.from(`admin:${this.config.appPassword}`).toString('base64');
      return `Basic ${credentials}`;
    }
    throw new Error('No authentication provided');
  }

  private async uploadMedia(baseUrl: string, media: MediaItem, authHeader: string): Promise<number> {
    const response = await fetch(`${baseUrl}/media`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${media.filename}"`
      },
      body: Buffer.from(media.content)
    });

    if (!response.ok) {
      throw new Error(`Failed to upload media: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  private async createPage(baseUrl: string, page: PageData, authHeader: string): Promise<number> {
    const response = await fetch(`${baseUrl}/pages`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: page.title,
        content: page.content,
        slug: page.slug,
        status: 'publish'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create page: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  private async createPost(baseUrl: string, post: PostData, authHeader: string): Promise<number> {
    const response = await fetch(`${baseUrl}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: post.title,
        content: post.content,
        slug: post.slug,
        status: 'publish',
        categories: post.categories,
        tags: post.tags
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create post: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  private async createMenus(baseUrl: string, menus: MenuData[], authHeader: string): Promise<void> {
    // WordPress menus require creating nav_menu_items via REST API
    // This is more complex and may require custom endpoint or WP-CLI
    logger.info('Menu creation via REST API requires additional setup');

    for (const menu of menus) {
      // Create menu terms first
      const termResponse = await fetch(`${baseUrl}/menus`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: menu.name,
          slug: menu.slug || menu.name.toLowerCase().replace(/\s+/g, '-')
        })
      });

      if (!termResponse.ok) {
        logger.warn(`Failed to create menu: ${menu.name}`);
      }
    }
  }
}

export interface WordPressContent {
  pages: PageData[];
  posts: PostData[];
  media?: MediaItem[];
  menus?: MenuData[];
}

export interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string;
}

export interface PostData {
  id: string;
  title: string;
  slug: string;
  content: string;
  categories?: number[];
  tags?: number[];
}

export interface MediaItem {
  id: string;
  filename: string;
  content: Buffer;
  mimeType: string;
}

export interface MenuData {
  name: string;
  slug?: string;
  items?: MenuItemData[];
}

export interface MenuItemData {
  title: string;
  url: string;
  parentId?: number;
  order: number;
}

export interface InstallResult {
  pages: Array<{ originalId: string; wpId: number }>;
  posts: Array<{ originalId: string; wpId: number }>;
  media: Array<{ originalId: string; wpId: number }>;
}
