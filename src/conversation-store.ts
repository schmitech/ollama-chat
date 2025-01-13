export interface Message {
  content: string;
  isUser: boolean;
}

export interface Conversation {
  id: string;
  messages: Message[];
}

export class ConversationStore {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'ollamaChat';
  private readonly DB_VERSION = 1;
  private initPromise: Promise<void>;
  private readonly MAX_MESSAGES = 100; // Maximum messages per conversation

  constructor() {
    this.initPromise = this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', { keyPath: 'id' });
          conversationStore.createIndex('created_at', 'created_at');
        }

        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
          messageStore.createIndex('conversation_id', 'conversation_id');
          messageStore.createIndex('created_at', 'created_at');
        }
      };
    });
  }

  async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  async createConversation(): Promise<string> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');
      
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const request = store.add({
        id,
        created_at: new Date()
      });

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async addMessage(conversationId: string, message: Message): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise(async (resolve, reject) => {
      try {
        // Get current message count
        const messages = await this.getConversation(conversationId);
        
        // If we're at the limit, remove the oldest message first
        if (messages.length >= this.MAX_MESSAGES) {
          const transaction = this.db!.transaction(['messages'], 'readwrite');
          const store = transaction.objectStore('messages');
          const index = store.index('conversation_id');
          const request = index.openCursor(conversationId);
          
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              cursor.delete(); // Delete oldest message
            }
          };
        }

        // Add new message
        const transaction = this.db!.transaction(['messages'], 'readwrite');
        const store = transaction.objectStore('messages');
        
        const request = store.add({
          conversation_id: conversationId,
          content: message.content,
          is_user: message.isUser,
          created_at: new Date()
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getConversation(id: string): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('conversation_id');
      
      const request = index.getAll(id);

      request.onsuccess = () => {
        const messages = request.result.map(msg => ({
          content: msg.content,
          isUser: msg.is_user
        }));
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearConversation(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const index = store.index('conversation_id');
      
      const request = index.getAll(id);

      request.onsuccess = () => {
        const deleteTransaction = this.db!.transaction(['messages'], 'readwrite');
        const deleteStore = deleteTransaction.objectStore('messages');
        
        request.result.forEach(msg => {
          deleteStore.delete(msg.id);
        });
        
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async listConversations(): Promise<Array<{ id: string; messages: Message[] }>> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      
      const request = store.getAll();

      request.onsuccess = async () => {
        const conversations = request.result;
        const result = await Promise.all(
          conversations.map(async conv => ({
            id: conv.id,
            messages: await this.getConversation(conv.id)
          }))
        );
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async cleanup(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}