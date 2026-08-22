import { config } from '../../config/env';

export interface OllamaHealthStatus {
  available: boolean;
  generation_model: string;
  embedding_model: string;
  installed_models?: string[];
  error?: string;
}

export class OllamaProvider {
  private baseUrl: string;
  private generationModel: string;
  private embeddingModel: string;
  private lastHealthCheckTime = 0;
  private lastKnownAvailable = true;

  constructor(
    baseUrl = config.ollama.baseUrl,
    generationModel = config.ollama.generationModel,
    embeddingModel = config.ollama.embeddingModel
  ) {
    // Ensure baseUrl does not have a trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.generationModel = generationModel;
    this.embeddingModel = embeddingModel;
  }

  /**
   * Health check for Ollama local AI server.
   */
  async checkHealth(): Promise<OllamaHealthStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as { models?: { name?: string; model?: string }[] };
      const installedModels: string[] = (data.models || []).map((m) => m.name || m.model || '');
      this.lastKnownAvailable = true;
      this.lastHealthCheckTime = Date.now();

      return {
        available: true,
        generation_model: this.generationModel,
        embedding_model: this.embeddingModel,
        installed_models: installedModels,
      };
    } catch (err: any) {
      this.lastKnownAvailable = false;
      this.lastHealthCheckTime = Date.now();
      return {
        available: false,
        generation_model: this.generationModel,
        embedding_model: this.embeddingModel,
        error: `Ollama is unreachable at ${this.baseUrl}: ${err.message}`,
      };
    }
  }

  /**
   * Generates completion using local Qwen model via Ollama with thinking explicitly disabled.
   */
  async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    // Quick probe if recently known down
    if (!this.lastKnownAvailable && Date.now() - this.lastHealthCheckTime < 10000) {
      throw new Error(`Ollama daemon is currently offline at ${this.baseUrl}`);
    }

    try {
      const messages: { role: string; content: string }[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.generationModel,
          messages,
          stream: false,
          think: false, // Explicitly disable Qwen3 thinking/reasoning
          options: {
            temperature: 0.1, // Low temperature for high precision & consistency
            num_predict: 256, // Reasonable max output token limit for customer support
          },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = (await res.json()) as any;
      this.lastKnownAvailable = true;

      let rawContent = '';
      if (data?.message?.content) {
        rawContent = data.message.content;
      } else if (data?.response) {
        rawContent = data.response;
      } else {
        throw new Error('Ollama returned empty response content.');
      }

      // Strip any residual thinking tags if produced
      const cleaned = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      return cleaned || rawContent.trim();
    } catch (err: any) {
      this.lastKnownAvailable = false;
      this.lastHealthCheckTime = Date.now();
      throw new Error(
        `Ollama generation error (${this.generationModel} at ${this.baseUrl}): ${err.message}. Please ensure Ollama is running and model '${this.generationModel}' is available.`
      );
    }
  }

  /**
   * Generates vector embedding for single text string via Ollama (1024-dim).
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Quick probe if recently known down
    if (!this.lastKnownAvailable && Date.now() - this.lastHealthCheckTime < 10000) {
      throw new Error(`Ollama daemon is currently offline at ${this.baseUrl}`);
    }

    try {
      // Try /api/embeddings (standard Ollama endpoint)
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          prompt: text,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        if (data?.embedding && Array.isArray(data.embedding)) {
          this.lastKnownAvailable = true;
          return data.embedding;
        }
      }

      // Try /api/embed (newer Ollama multi-input endpoint)
      const embedRes = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: text,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (embedRes.ok) {
        const embedData = (await embedRes.json()) as any;
        if (embedData?.embeddings && Array.isArray(embedData.embeddings[0])) {
          this.lastKnownAvailable = true;
          return embedData.embeddings[0];
        }
      }

      throw new Error('Ollama returned invalid embedding format.');
    } catch (err: any) {
      this.lastKnownAvailable = false;
      this.lastHealthCheckTime = Date.now();
      throw new Error(
        `Ollama embedding error (${this.embeddingModel} at ${this.baseUrl}): ${err.message}. Please ensure Ollama is running and model '${this.embeddingModel}' is pulled.`
      );
    }
  }

  /**
   * Batch embedding generation.
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      results.push(embedding);
    }
    return results;
  }
}
