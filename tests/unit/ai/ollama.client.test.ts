import { describe, it, expect } from 'vitest';
import { OllamaClient } from '../../../src/ai/ollama.client.js';

describe('OllamaClient', () => {
  it('generates text from prompt', async () => {
    // TODO: Mock fetch for unit test
    const client = new OllamaClient({ baseUrl: 'http://localhost:11434', model: 'llama3', temperature: 0.1 });
    const result = await client.generate('Say hello');

    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('parses JSON response', async () => {
    const client = new OllamaClient({ baseUrl: 'http://localhost:11434', model: 'llama3', temperature: 0.1 });
    const result = await client.generateJson<{ test: string }>('Return { "test": "value" }');

    expect(result.test).toBe('value');
  });
});
