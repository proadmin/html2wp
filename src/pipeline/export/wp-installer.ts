import { WordPressClient, WordPressContent } from '../../wordpress/wp.client.js';
import { logger } from '../../utils/logger.js';
import type { SiteMap } from '../../types/index.js';

export interface WpInstallerOptions {
  siteUrl: string;
  appPassword?: string;
  sshConnection?: string;
  method: 'rest-api' | 'wp-cli';
}

export class WpInstaller {
  constructor(private options: WpInstallerOptions) {}

  async install(siteMap: SiteMap, outputDir: string): Promise<void> {
    logger.info('Starting WordPress installation', { method: this.options.method });

    if (this.options.method === 'wp-cli') {
      if (!this.options.sshConnection) {
        throw new Error('SSH connection required for WP-CLI installation');
      }
      await this.installViaCli(outputDir);
    } else {
      await this.installViaApi(siteMap);
    }

    logger.info('WordPress installation complete');
  }

  private async installViaCli(outputDir: string): Promise<void> {
    const client = new WordPressClient({
      siteUrl: this.options.siteUrl,
      sshConnection: this.options.sshConnection
    });

    const wxrPath = `${outputDir}/export/wordpress.xml`;
    const { existsSync } = await import('fs');
    if (!existsSync(wxrPath)) {
      throw new Error(`WXR file not found at ${wxrPath}. Ensure WXR export is enabled.`);
    }
    await client.installViaWpCli(wxrPath, this.options.sshConnection!);
  }

  private async installViaApi(siteMap: SiteMap): Promise<void> {
    const client = new WordPressClient({
      siteUrl: this.options.siteUrl,
      appPassword: this.options.appPassword
    });

    const content: WordPressContent = {
      pages: siteMap.pages.map(page => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content
      })),
      posts: siteMap.posts.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        categories: [],
        tags: []
      })),
      menus: siteMap.menus.map(menu => ({
        name: menu.name,
        slug: menu.location,
        items: menu.items.map(item => ({
          title: item.label,
          url: item.url,
          order: 0
        }))
      }))
    };

    await client.installViaRestApi(content);
  }
}
