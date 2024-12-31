import axios from 'axios';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';
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
  private axiosInstance;
  private cache: NodeCache;

constructor() {
  this.baseURL = process.env.OLLAMA_ENDPOINT || (process.platform === 'win32' ? 'http://127.0.0.1:11434' : 'http://localhost:11434');
  this.model = process.env.OLLAMA_MODEL || 'mistral';
  this.store = new ConversationStore();
  this.cache = new NodeCache({ stdTTL: 3600 });
  
  this.axiosInstance = axios.create({
    baseURL: this.baseURL,
    timeout: 120000,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
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

      // Take only last N messages for context
      const contextSize = 30; // Adjust based on your needs
      const recentMessages = conversation.messages
        .slice(-contextSize)
        .map(msg => msg.content)
        .join('\n\n');

      // Check cache first
      const cacheKey = `${this.model}-${recentMessages}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        const cachedResponse = cached as string;
        // Still store the response in conversation history
        await this.store.addMessage(this.currentConversationId!, {
          role: 'assistant',
          content: cachedResponse
        });
        return cachedResponse;
      }

      const response = await this.axiosInstance.post<OllamaChatResponse>('/api/generate', {
        model: this.model,
        prompt: recentMessages,
        stream: false,
        options: {
          temperature: 0.7,    // Lower temperature for more focused responses
          top_k: 40,          // Limit vocabulary for faster responses
          top_p: 0.9,         // Nucleus sampling
          num_ctx: 2048,      // Context window size
          num_thread: 4       // CPU threads
        }
      });

      if (response.data.response) {
        const generatedResponse = response.data.response;
        
        // Cache the response
        this.cache.set(cacheKey, generatedResponse);
        
        // Add assistant's response to history
        await this.store.addMessage(this.currentConversationId!, {
          role: 'assistant',
          content: generatedResponse
        });
        return generatedResponse;
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