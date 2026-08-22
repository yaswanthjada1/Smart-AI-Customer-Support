import axios from 'axios';
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
      const res = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 3000 });
      const installedModels: string[] = (res.data?.models || []).map((m: any) => m.name || m.model);

      return {
        available: true,
        generation_model: this.generationModel,
        embedding_model: this.embeddingModel,
        installed_models: installedModels,
      };
    } catch (err: any) {
      return {
        available: false,
        generation_model: this.generationModel,
        embedding_model: this.embeddingModel,
        error: `Ollama is unreachable at ${this.baseUrl}: ${err.message}`,
      };
    }
  }

  /**
   * Generates completion using local Qwen model via Ollama.
   */
  async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const messages: { role: string; content: string }[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const res = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model: this.generationModel,
          messages,
          stream: false,
          options: {
            temperature: 0.2, // Low temperature for high grounding and zero hallucination
          },
        },
        { timeout: 45000 }
      );

      if (res.data?.message?.content) {
        return res.data.message.content;
      }

      // Fallback for /api/generate format
      if (res.data?.response) {
        return res.data.response;
      }

      throw new Error('Ollama returned empty response content.');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message;
      throw new Error(
        `Ollama generation error (${this.generationModel} at ${this.baseUrl}): ${errMsg}. Please ensure Ollama is running ('ollama serve') and model '${this.generationModel}' is pulled ('ollama pull ${this.generationModel}').`
      );
    }
  }

  /**
   * Generates vector embedding for single text string via Ollama.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Try /api/embeddings (standard Ollama endpoint)
      const res = await axios.post(
        `${this.baseUrl}/api/embeddings`,
        {
          model: this.embeddingModel,
          prompt: text,
        },
        { timeout: 15000 }
      );

      if (res.data?.embedding && Array.isArray(res.data.embedding)) {
        return res.data.embedding;
      }

      // Try /api/embed (newer Ollama multi-input endpoint)
      const embedRes = await axios.post(
        `${this.baseUrl}/api/embed`,
        {
          model: this.embeddingModel,
          input: text,
        },
        { timeout: 15000 }
      );

      if (embedRes.data?.embeddings && Array.isArray(embedRes.data.embeddings[0])) {
        return embedRes.data.embeddings[0];
      }

      throw new Error('Ollama returned invalid embedding format.');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message;
      throw new Error(
        `Ollama embedding error (${this.embeddingModel} at ${this.baseUrl}): ${errMsg}. Please ensure Ollama is running and model '${this.embeddingModel}' is pulled ('ollama pull ${this.embeddingModel}').`
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
