import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface OllamaChatResponse {
  response: string;
  done: boolean;
}

export class OllamaAPI {
  private baseURL: string;
  private model: string;

  constructor() {
    this.baseURL = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'mistral';
    console.log(`Initializing Ollama API with model: ${this.model} at endpoint: ${this.baseURL}`);
  }

  async generate(prompt: string): Promise<string> {
    try {
      console.log(`Using model: ${this.model}`);
      
      const response = await axios.post<OllamaChatResponse>(`${this.baseURL}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false
      });

      if (response.data.response) {
        return response.data.response;
      } else {
        throw new Error('Unexpected response structure from Ollama');
      }
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
      }
      throw error;
    }
  }
}