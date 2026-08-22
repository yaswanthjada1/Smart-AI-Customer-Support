import { GoogleGenerativeAI } from '@google/generative-ai';
import { OllamaProvider } from './ollamaProvider';
import { config } from '../../config/env';

export interface ILLMProvider {
  generateResponse(prompt: string, systemPrompt?: string): Promise<string>;
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
  if (config.llm.provider === 'ollama') {
    return new OllamaLLMProvider();
  }

  if (config.llm.provider === 'gemini' && config.llm.apiKey) {
    return new GeminiProvider(config.llm.apiKey, config.llm.model);
  }

  // Default to Ollama
  return new OllamaLLMProvider();
}
