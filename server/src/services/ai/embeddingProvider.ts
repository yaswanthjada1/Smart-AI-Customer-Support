import { GoogleGenerativeAI } from '@google/generative-ai';
import { OllamaProvider } from './ollamaProvider';
import { config } from '../../config/env';

export interface IEmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

export class OllamaEmbeddingProvider implements IEmbeddingProvider {
  private ollama: OllamaProvider;

  constructor() {
    this.ollama = new OllamaProvider(
      config.ollama.baseUrl,
      config.ollama.generationModel,
      config.ollama.embeddingModel
    );
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.ollama.generateEmbedding(text);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return this.ollama.generateEmbeddings(texts);
  }
}

export class GeminiEmbeddingProvider implements IEmbeddingProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName = 'text-embedding-004') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const embeddings: number[][] = [];
    for (const text of texts) {
      const res = await model.embedContent(text);
      embeddings.push(res.embedding.values);
    }
    return embeddings;
  }
}

/**
 * Returns active embedding provider based on environment configuration.
 * Default is Ollama with Qwen embedding model.
 */
export function getEmbeddingProvider(): IEmbeddingProvider {
  if (config.embedding.provider === 'ollama') {
    return new OllamaEmbeddingProvider();
  }

  if (config.embedding.provider === 'gemini' && config.embedding.apiKey) {
    return new GeminiEmbeddingProvider(config.embedding.apiKey, config.embedding.model);
  }

  // Fallback to Ollama if configured
  return new OllamaEmbeddingProvider();
}
