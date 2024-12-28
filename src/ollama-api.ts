// src/ollama-api.ts
import axios from 'axios';
import dotenv from 'dotenv';
import { ConversationStore, Message } from './conversation-store';

dotenv.config();

interface OllamaChatResponse {
  response: string;
  done: boolean;
}

export class OllamaAPI {
  private baseURL: string;
  private model: string;
  private store: ConversationStore;
  private currentConversationId: string | null = null;

  constructor() {
    this.baseURL = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'mistral';
    this.store = new ConversationStore();
    console.log(`Initializing Ollama API with model: ${this.model} at endpoint: ${this.baseURL}`);
  }

  async initConversation(): Promise<string> {
    this.currentConversationId = await this.store.createConversation(this.model);
    return this.currentConversationId;
  }

  async loadConversation(id: string): Promise<void> {
    const conversation = await this.store.getConversation(id);
    if (!conversation) throw new Error('Conversation not found');
    this.currentConversationId = id;
  }

  async generate(prompt: string): Promise<string> {
    if (!this.currentConversationId) {
      await this.initConversation();
    }

    try {
      // Add user message to history
      await this.store.addMessage(this.currentConversationId!, {
        role: 'user',
        content: prompt
      });

      // Get current conversation
      const conversation = await this.store.getConversation(this.currentConversationId!);
      if (!conversation) throw new Error('Conversation not found');

      // Create the context by joining previous messages
      const context = conversation.messages
        .map(msg => msg.content)
        .join('\n\n');

      console.log(`Using model: ${this.model}`);
      
      const response = await axios.post<OllamaChatResponse>(`${this.baseURL}/api/generate`, {
        model: this.model,
        prompt: context,
        stream: false
      });

      if (response.data.response) {
        // Add assistant's response to history
        await this.store.addMessage(this.currentConversationId!, {
          role: 'assistant',
          content: response.data.response
        });
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

  async clearCurrentConversation(): Promise<void> {
    if (this.currentConversationId) {
      // Delete the conversation instead of just clearing it
      await this.store.deleteConversation(this.currentConversationId);
      // Reset the conversation ID
      this.currentConversationId = null;
      // Create a new conversation
      await this.initConversation();
    }
  }

  async listConversations(): Promise<Array<{ id: string; lastUpdated: number }>> {
    return this.store.listConversations();
  }

  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }
}