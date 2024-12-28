// src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { OllamaAPI } from './ollama-api';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Map to store API instances for each socket connection
const apiInstances = new Map<string, OllamaAPI>();

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('Client connected');
  const api = new OllamaAPI();
  apiInstances.set(socket.id, api);

  // Initialize a new conversation
  api.initConversation().then(conversationId => {
    socket.emit('conversation_started', { id: conversationId });
  });

  socket.on('chat message', async (message: string) => {
    const api = apiInstances.get(socket.id);
    if (!api) return;

    try {
      const response = await api.generate(message);
      socket.emit('chat response', response);
    } catch (error) {
      console.error('Error generating response:', error);
      socket.emit('error', 'Failed to generate response');
    }
  });

  socket.on('clear chat', async () => {
    const api = apiInstances.get(socket.id);
    if (!api) return;

    try {
      await api.clearCurrentConversation();
      socket.emit('chat cleared');
    } catch (error) {
      console.error('Error clearing chat:', error);
      socket.emit('error', 'Failed to clear chat');
    }
  });

  socket.on('list conversations', async () => {
    const api = apiInstances.get(socket.id);
    if (!api) return;

    try {
      const conversations = await api.listConversations();
      socket.emit('conversations list', conversations);
    } catch (error) {
      console.error('Error listing conversations:', error);
      socket.emit('error', 'Failed to list conversations');
    }
  });

  socket.on('load conversation', async (id: string) => {
    const api = apiInstances.get(socket.id);
    if (!api) return;

    try {
      await api.loadConversation(id);
      socket.emit('conversation loaded', { id });
    } catch (error) {
      console.error('Error loading conversation:', error);
      socket.emit('error', 'Failed to load conversation');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    apiInstances.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});