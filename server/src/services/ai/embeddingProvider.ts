import { GoogleGenerativeAI } from '@google/generative-ai';
import { OllamaProvider } from './ollamaProvider';
import { config } from '../../config/env';

export const REQUIRED_EMBEDDING_DIMENSION = 1024;

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has',
  'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if',
  'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor',
  'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'same', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

export interface IEmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

export class DeterministicEmbeddingProvider implements IEmbeddingProvider {
  async generateEmbedding(text: string): Promise<number[]> {
    const dim = REQUIRED_EMBEDDING_DIMENSION;
    const vec = new Array(dim).fill(0);
    const rawTokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    if (rawTokens.length === 0) return vec;

    for (const token of rawTokens) {
      const weight = STOP_WORDS.has(token) ? 0.05 : 1.5;
      
      // Hash 1 (DJB2)
      let h1 = 5381;
      for (let i = 0; i < token.length; i++) {
        h1 = ((h1 << 5) + h1 + token.charCodeAt(i)) >>> 0;
      }
      const idx1 = h1 % dim;
      vec[idx1] += weight;

      // Hash 2 (FNV-like secondary projection across 1024 dimensions)
      let h2 = 0;
      for (let i = 0; i < token.length; i++) {
        h2 = (h2 * 31 + token.charCodeAt(i)) >>> 0;
      }
      const idx2 = (h2 + (token.length * 97)) % dim;
      vec[idx2] += weight * 0.8;
    }

    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? vec.map((v) => v / norm) : vec;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }
}

export class OllamaEmbeddingProvider implements IEmbeddingProvider {
  private ollama: OllamaProvider;
  private fallback: DeterministicEmbeddingProvider;

  constructor() {
    this.ollama = new OllamaProvider(
      config.ollama.baseUrl,
      config.ollama.generationModel,
      config.ollama.embeddingModel
    );
    this.fallback = new DeterministicEmbeddingProvider();
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const vec = await this.ollama.generateEmbedding(text);
      if (vec.length !== REQUIRED_EMBEDDING_DIMENSION) {
        throw new Error(
          `Ollama model '${config.ollama.embeddingModel}' returned ${vec.length} dimensions, expected ${REQUIRED_EMBEDDING_DIMENSION}.`
        );
      }
      return vec;
    } catch (err: any) {
      if (process.env.NODE_ENV === 'test' || config.nodeEnv === 'test') {
        return this.fallback.generateEmbedding(text);
      }
      throw err;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const vectors = await this.ollama.generateEmbeddings(texts);
      for (let i = 0; i < vectors.length; i++) {
        if (vectors[i].length !== REQUIRED_EMBEDDING_DIMENSION) {
          throw new Error(
            `Ollama model '${config.ollama.embeddingModel}' chunk ${i} returned ${vectors[i].length} dimensions, expected ${REQUIRED_EMBEDDING_DIMENSION}.`
          );
        }
      }
      return vectors;
    } catch (err: any) {
      if (process.env.NODE_ENV === 'test' || config.nodeEnv === 'test') {
        return this.fallback.generateEmbeddings(texts);
      }
      throw err;
    }
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
 * Default is Ollama with Qwen embedding model (1024 dimensions).
 */
export function getEmbeddingProvider(): IEmbeddingProvider {
  if (process.env.NODE_ENV === 'test' || config.nodeEnv === 'test') {
    return new DeterministicEmbeddingProvider();
  }

  if (config.embedding.provider === 'gemini' && config.embedding.apiKey) {
    return new GeminiEmbeddingProvider(config.embedding.apiKey, config.embedding.model);
  }

  return new OllamaEmbeddingProvider();
}
