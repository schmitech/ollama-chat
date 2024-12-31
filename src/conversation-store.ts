import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
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
  private db: Database | null = null;

  constructor() {
    this.initializeDb();
  }

  private async initializeDb() {
    this.db = await open({
      filename: 'conversations.db',
      driver: sqlite3.Database
    });

    // Create tables if they don't exist
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        lastUpdated INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversationId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (conversationId) REFERENCES conversations(id)
      );
    `);
  }

  async createConversation(model: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const id = crypto.randomBytes(16).toString('hex');
    await this.db.run(
      'INSERT INTO conversations (id, model, lastUpdated) VALUES (?, ?, ?)',
      [id, model, Date.now()]
    );
    
    return id;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    if (!this.db) throw new Error('Database not initialized');

    const conversation = await this.db.get(
      'SELECT * FROM conversations WHERE id = ?',
      [id]
    );
    if (!conversation) return null;

    const messages = await this.db.all(
      'SELECT role, content, timestamp FROM messages WHERE conversationId = ? ORDER BY timestamp',
      [id]
    );

    return {
      id: conversation.id,
      model: conversation.model,
      lastUpdated: conversation.lastUpdated,
      messages
    };
  }

  async addMessage(id: string, message: Omit<Message, 'timestamp'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const timestamp = Date.now();
    await this.db.run(
      'INSERT INTO messages (conversationId, role, content, timestamp) VALUES (?, ?, ?, ?)',
      [id, message.role, message.content, timestamp]
    );
    
    await this.db.run(
      'UPDATE conversations SET lastUpdated = ? WHERE id = ?',
      [timestamp, id]
    );
  }

  async clearConversation(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run('DELETE FROM messages WHERE conversationId = ?', [id]);
    await this.db.run(
      'UPDATE conversations SET lastUpdated = ? WHERE id = ?',
      [Date.now(), id]
    );
  }

  async deleteConversation(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run('DELETE FROM messages WHERE conversationId = ?', [id]);
    await this.db.run('DELETE FROM conversations WHERE id = ?', [id]);
  }

  async listConversations(): Promise<Array<{ id: string; lastUpdated: number }>> {
    if (!this.db) throw new Error('Database not initialized');

    return this.db.all(
      'SELECT id, lastUpdated FROM conversations ORDER BY lastUpdated DESC'
    );
  }

  async cleanup(): Promise<void> {
    if (!this.db) return;
    
    // Close the database connection
    await this.db.close();
    
    // Reset the db reference
    this.db = null;
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.exec(`
      DELETE FROM messages;
      DELETE FROM conversations;
    `);
  }
}