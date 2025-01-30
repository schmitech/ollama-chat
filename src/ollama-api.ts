import { ConversationStore } from './conversation-store';

export class OllamaAPI {
  private currentConversationId: string | null = null;
  public conversationStore: ConversationStore;
  private model: string;

  constructor() {
    this.conversationStore = new ConversationStore();
    this.model = 'llama2'; // temporary default
    
    // Fetch available models and set the first one as default
    this.getAvailableModels().then(models => {
      if (models.length > 0) {
        this.model = models[0].value;
        // Make sure to initialize conversation with the new model
        this.initConversation();
      }
    });
  }

  async initConversation(): Promise<string> {
    await this.conversationStore.ensureInitialized();
    const id = await this.conversationStore.createConversation();
    this.currentConversationId = id;
    return id;
  }

  async generate(message: string, temperature: number): Promise<string> {
    try {
      if (!this.currentConversationId) {
        throw new Error('No active conversation');
      }

      const previousMessages = await this.conversationStore.getConversation(this.currentConversationId);
      const context = previousMessages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      }));

      const requestBody = {
        model: this.model,
        messages: [
          ...context,
          { role: 'user', content: message }
        ],
        stream: false,
        options: {
          temperature: temperature
        }
      };

      // Log the request for debugging
      console.log('Sending request to Ollama API:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Log the raw response for debugging
      const responseText = await response.text();
      console.log('Raw response from Ollama API:', responseText);

      if (!response.ok) {
        throw new Error(`Failed to generate response: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      if (!data.message) {
        throw new Error('Invalid response from Ollama');
      }

      await this.conversationStore.addMessage(
        this.currentConversationId,
        { content: message, isUser: true }
      );
      await this.conversationStore.addMessage(
        this.currentConversationId,
        { content: data.message.content, isUser: false }
      );

      return data.message.content;
    } catch (error) {
      throw error;
    }
  }

  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  async getConversationMessages(id: string) {
    return this.conversationStore.getConversation(id);
  }

  async clearCurrentConversation(): Promise<void> {
    if (this.currentConversationId) {
      await this.conversationStore.clearConversation(this.currentConversationId);
      // Create a new conversation immediately after clearing
      this.currentConversationId = await this.conversationStore.createConversation();
    }
  }

  getCurrentModel(): string {
    return this.model;
  }

  setModel(model: string) {
    this.model = model;
  }

  async getAvailableModels(): Promise<Array<{value: string, label: string}>> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      return data.models.map((model: { name: string }) => ({
        value: model.name,
        label: model.name
      }));
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }
}