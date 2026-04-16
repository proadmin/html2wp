import { OllamaClient } from '../../ai/ollama.client.js';
import { STRUCTURE_ANALYSIS_PROMPT } from '../../ai/prompts/structure.prompt.js';
import { logger } from '../../utils/logger.js';
import type { Page, Menu, Asset } from '../../types/index.js';

export class PageDetector {
  constructor(private ollama: OllamaClient) {}

  async analyzePage(html: string, url: string): Promise<{ page: Partial<Page>; menus: Menu[]; assets: Asset[] }> {
    try {
      const result = await this.ollama.generateJson<StructureAnalysisResult>(
        STRUCTURE_ANALYSIS_PROMPT.replace('{url}', url).replace('{html}', html.slice(0, 50000))
      );

      const page: Partial<Page> = {
        title: result.title || 'Untitled',
        slug: this.extractSlug(url),
        content: result.mainContent || html
      };

      const menus: Menu[] = result.menus.map(m => ({
        name: m.name || 'Main Menu',
        location: 'primary',
        items: this.convertMenuItems(m.items)
      }));

      const assets: Asset[] = result.assets.map((a, i) => ({
        id: `asset-${i}`,
        path: a.path,
        type: a.type === 'image' ? 'image' : a.type === 'css' ? 'css' : 'js',
        size: 0,
        dependencies: []
      }));

      return { page, menus, assets };
    } catch (error) {
      logger.error('Page analysis failed', error);
      throw error;
    }
  }

  private extractSlug(url: string): string {
    const pathname = new URL(url).pathname;
    return pathname.replace(/\/$/, '').split('/').pop() || 'index';
  }

  private convertMenuItems(items: Array<{ label: string; url: string; children?: Array<{ label: string; url: string }> }>) {
    return items.map(item => ({
      label: item.label,
      url: item.url,
      children: item.children?.map(child => ({
        label: child.label,
        url: child.url,
        children: []
      }))
    }));
  }
}

interface StructureAnalysisResult {
  pageType: string;
  title: string;
  mainContent: string;
  menus: Array<{ name: string; items: Array<{ label: string; url: string; children?: Array<{ label: string; url: string }> }> }>;
  assets: Array<{ path: string; type: 'image' | 'css' | 'js' }>;
}
