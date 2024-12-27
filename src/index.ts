import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { OllamaAPI } from './ollama-api';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const ollamaAPI = new OllamaAPI();

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('chat message', async (message: string) => {
    try {
      const response = await ollamaAPI.generate(message);
      socket.emit('chat response', response);
    } catch (error) {
      console.error('Error generating response:', error);
      socket.emit('error', 'Failed to generate response');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});