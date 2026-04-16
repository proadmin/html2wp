import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaClient } from '../../../src/ai/ollama.client.js';

// Mock global fetch
global.fetch = vi.fn();

describe('OllamaClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates text from prompt', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'Hello there!' })
    } as any);

    const client = new OllamaClient({ baseUrl: 'http://localhost:11434', model: 'llama3', temperature: 0.1 });
    const result = await client.generate('Say hello');

    expect(result).toBe('Hello there!');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('parses JSON response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '{ "test": "value" }' })
    } as any);

    const client = new OllamaClient({ baseUrl: 'http://localhost:11434', model: 'llama3', temperature: 0.1 });
    const result = await client.generateJson<{ test: string }>('Return { "test": "value" }');

    expect(result.test).toBe('value');
  });

  it('throws error on API failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500
    } as any);

    const client = new OllamaClient({ baseUrl: 'http://localhost:11434', model: 'llama3', temperature: 0.1 });

    await expect(client.generate('Say hello')).rejects.toThrow('AI processing failed');
  });
});
