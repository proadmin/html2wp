import { OllamaClient } from '../../ai/ollama.client.js';
import { BLOCK_CONVERSION_PROMPT } from '../../ai/prompts/block-conversion.prompt.js';
import { logger } from '../../utils/logger.js';

export class HtmlToBlocksConverter {
  constructor(private ollama: OllamaClient) {}

  async convert(html: string): Promise<string> {
    logger.debug('Converting HTML to blocks', { htmlLength: html.length });

    try {
      const blocks = await this.ollama.generate(
        BLOCK_CONVERSION_PROMPT.replace('{html}', html.slice(0, 30000))
      );

      return this.cleanBlockOutput(blocks);
    } catch (error) {
      logger.error('Block conversion failed', error);
      // Fallback: wrap HTML in HTML block
      return `<!-- wp:html -->
${html}
<!-- /wp:html -->`;
    }
  }

  private cleanBlockOutput(output: string): string {
    // Remove markdown code fences if present
    return output.replace(/```html?/g, '').replace(/```/g, '').trim();
  }
}
