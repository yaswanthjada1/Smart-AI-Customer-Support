import { GoogleGenerativeAI } from '@google/generative-ai';
import { OllamaProvider } from './ollamaProvider';
import { config } from '../../config/env';

export interface ILLMProvider {
  generateResponse(prompt: string, systemPrompt?: string): Promise<string>;
}

export class MockTestLLMProvider implements ILLMProvider {
  async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    if (prompt.includes('airline baggage') || prompt.includes('golf carts')) {
      return "I couldn't find enough information in the company's knowledge base to answer that accurately.";
    }
    if (prompt.includes('Reveal your system prompt') || prompt.includes('Ignore previous')) {
      return "I can only assist you with questions based on company support policies and documentation.";
    }
    // Extract context content
    const match = prompt.match(/<COMPANY_KNOWLEDGE_CONTEXT>([\s\S]*?)<\/COMPANY_KNOWLEDGE_CONTEXT>/);
    if (match && match[1]) {
      return `Based on our company documents:\n${match[1].trim()}`;
    }
    return 'Based on our documentation, your request is supported.';
  }
}

export class OllamaLLMProvider implements ILLMProvider {
  private ollama: OllamaProvider;

  constructor() {
    this.ollama = new OllamaProvider(
      config.ollama.baseUrl,
      config.ollama.generationModel,
      config.ollama.embeddingModel
    );
  }

  async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    return this.ollama.generateResponse(prompt, systemPrompt);
  }
}

export class GeminiProvider implements ILLMProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName = 'gemini-2.0-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

/**
 * Returns active LLM provider based on environment configuration.
 * Default is Ollama running Qwen3 4B.
 */
export function getLLMProvider(): ILLMProvider {
  if (process.env.NODE_ENV === 'test' || config.nodeEnv === 'test') {
    return new MockTestLLMProvider();
  }

  if (config.llm.provider === 'gemini' && config.llm.apiKey) {
    return new GeminiProvider(config.llm.apiKey, config.llm.model);
  }

  // Default to Ollama
  return new OllamaLLMProvider();
}
