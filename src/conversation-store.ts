// src/conversation-store.ts
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  messages: Message[];
  model: string;
  lastUpdated: number;
}

export class ConversationStore {
  private storageDir: string;

  constructor() {
    this.storageDir = path.join(process.cwd(), 'conversations');
    // Synchronously create directory if it doesn't exist
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private getConversationPath(id: string): string {
    return path.join(this.storageDir, `${id}.json`);
  }

  async createConversation(model: string): Promise<string> {
    const id = crypto.randomBytes(16).toString('hex');
    const conversation: Conversation = {
      id,
      messages: [],
      model,
      lastUpdated: Date.now()
    };

    // Ensure directory exists again just to be safe
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    await fsPromises.writeFile(
      this.getConversationPath(id),
      JSON.stringify(conversation, null, 2)
    );

    return id;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    try {
      const data = await fsPromises.readFile(this.getConversationPath(id), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading conversation:', error);
      return null;
    }
  }

  async addMessage(id: string, message: Omit<Message, 'timestamp'>): Promise<void> {
    const conversation = await this.getConversation(id);
    if (!conversation) throw new Error('Conversation not found');

    conversation.messages.push({
      ...message,
      timestamp: Date.now()
    });
    conversation.lastUpdated = Date.now();

    await fsPromises.writeFile(
      this.getConversationPath(id),
      JSON.stringify(conversation, null, 2)
    );
  }

  async clearConversation(id: string): Promise<void> {
    const conversation = await this.getConversation(id);
    if (!conversation) throw new Error('Conversation not found');

    conversation.messages = [];
    conversation.lastUpdated = Date.now();

    await fsPromises.writeFile(
      this.getConversationPath(id),
      JSON.stringify(conversation, null, 2)
    );
  }

  async deleteConversation(id: string): Promise<void> {
    try {
      await fsPromises.unlink(this.getConversationPath(id));
    } catch {
      // Ignore if file doesn't exist
    }
  }

  async listConversations(): Promise<Array<{ id: string; lastUpdated: number }>> {
    // Ensure directory exists
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
      return [];
    }

    const files = await fsPromises.readdir(this.storageDir);
    const conversations = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async file => {
          try {
            const conversation = await this.getConversation(
              file.replace('.json', '')
            );
            return conversation 
              ? { id: conversation.id, lastUpdated: conversation.lastUpdated }
              : null;
          } catch (error) {
            console.error('Error reading conversation file:', file, error);
            return null;
          }
        })
    );

    return conversations
      .filter((c): c is { id: string; lastUpdated: number } => c !== null)
      .sort((a, b) => b.lastUpdated - a.lastUpdated);
  }
}