import { logger } from '../utils/logger.js';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  temperature: number;
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;
  private temperature: number;

  constructor(config: OllamaConfig = { baseUrl: 'http://localhost:11434', model: 'llama3', temperature: 0.1 }) {
    this.baseUrl = config.baseUrl;
    this.model = config.model;
    this.temperature = config.temperature;
  }

  async healthCheck(): Promise<{ ok: boolean; modelAvailable: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET' });
      if (!response.ok) {
        return { ok: false, modelAvailable: false, message: 'Ollama server unreachable' };
      }
      const data = await response.json() as { models?: Array<{ name: string }> };
      const models = data.models || [];
      const modelAvailable = models.some(m => m.name === this.model || m.name.startsWith(`${this.model}:`));
      if (!modelAvailable) {
        return { ok: false, modelAvailable: false, message: `Model "${this.model}" not found. Run: ollama pull ${this.model}` };
      }
      return { ok: true, modelAvailable: true, message: 'Ollama is ready' };
    } catch {
      return { ok: false, modelAvailable: false, message: 'Ollama server unreachable. Run: ollama serve' };
    }
  }

  async generate(prompt: string): Promise<string> {
    logger.debug('Generating with Ollama', { model: this.model, prompt: prompt.slice(0, 100) });

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: this.temperature
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      logger.error('Ollama generation failed', error);
      throw new Error('AI processing failed');
    }
  }

  async generateJson<T>(prompt: string): Promise<T> {
    const response = await this.generate(prompt + '\n\nRespond with valid JSON only, no markdown.');
    return JSON.parse(response) as T;
  }
}
