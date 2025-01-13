import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Copy, Check, Loader2 } from 'lucide-react';
import { OllamaAPI } from './ollama-api';

function App() {
  const [messages, setMessages] = useState<Array<{ content: string; isUser: boolean }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [api] = useState(() => new OllamaAPI());

  useEffect(() => {
    // Initialize conversation when component mounts
    api.initConversation().then(() => {
      const conversationId = api.getCurrentConversationId();
      if (conversationId) {
        api.getConversationMessages(conversationId).then((messages) => {
          setMessages(messages);
        });
      }
    });

    // Add cleanup handler for browser window close
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      const conversationStore = api['conversationStore'];
      if (conversationStore) {
        await conversationStore.cleanup();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup effect
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [api]);

  // Add this effect to focus input after loading completes
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    try {
      setIsLoading(true);
      const newMessage = { content: input, isUser: true };
      setMessages(prev => [...prev, newMessage]);
      setInput('');
      
      const response = await api.generate(input);
      if (response) {
        setMessages(prev => [...prev, { content: response, isUser: false }]);
      }
    } catch (err) {
      setError('Failed to generate response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const clearChat = async () => {
    try {
      setIsLoading(true);
      await api.clearCurrentConversation();
      setMessages([]); // Clear the UI
      setError(null); // Clear any existing errors
    } catch (err) {
      console.error('Error clearing chat:', err);
      setError('Failed to clear conversation');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg flex flex-col h-[800px]">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">Ollama Chat</h1>
          <button
            onClick={clearChat}
            disabled={isLoading || messages.length === 0}
            className={`p-2 rounded-lg transition-colors ${
              isLoading || messages.length === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
            }`}
            title="Clear conversation"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`relative group max-w-[80%] p-4 rounded-lg ${
                  message.isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <button
                  onClick={() => copyToClipboard(message.content, index)}
                  className={`absolute -right-10 top-2 p-1.5 rounded-lg 
                    ${message.isUser ? 'hover:bg-blue-50' : 'hover:bg-gray-200'}
                    opacity-0 group-hover:opacity-100 transition-opacity`}
                  title="Copy message"
                >
                  {copiedIndex === index ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex space-x-4">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1 resize-none rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`px-6 py-3 rounded-lg flex items-center justify-center transition-colors w-24
                ${
                  !input.trim() || isLoading
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </div>
      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;