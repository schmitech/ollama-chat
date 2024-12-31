Prism.plugins.autoloader.languages_path = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/';

const socket = io({
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 1000
});

const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-button');
const loadingSpinner = document.getElementById('loading-spinner');

function setLoading(isLoading) {
    messageInput.disabled = isLoading;
    sendButton.disabled = isLoading;
    clearButton.disabled = isLoading;
    loadingSpinner.style.display = isLoading ? 'block' : 'none';

    if (isLoading) {
        // Move spinner to bottom of messages
        messagesDiv.appendChild(loadingSpinner);
        // Scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

function formatMessage(content) {
    // Add strict content validation
    if (!content || typeof content !== 'string') {
        console.warn('Received invalid content in formatMessage:', content);
        return '<p>Empty message</p>';
    }

    try {
        // Split content into code blocks and text
        const parts = content.split(/```(\w+)?\n([\s\S]*?)```/g);
        let formattedContent = '';

        for (let i = 0; i < parts.length; i++) {
            if (i % 4 === 0) {
                // Regular text - ensure part exists before splitting
                const part = parts[i] || '';
                formattedContent += part
                    .split('\n')
                    .map(line => `<p>${line}</p>`)
                    .join('');
            } else if (i % 4 === 1) {
                // Language identifier
                const language = parts[i] || 'plaintext';
                const code = parts[i + 1] || '';
                formattedContent += `
                    <div class="code-block">
                        <span class="language-marker">${language}</span>
                        <pre><code class="language-${language}">${code}</code></pre>
                    </div>
                `;
                i += 2; // Skip the next two parts (code content and closing delimiter)
            }
        }

        return formattedContent;
    } catch (error) {
        console.error('Error in formatMessage:', error);
        return '<p>Error formatting message</p>';
    }
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) {
        return; // Don't send empty messages
    }

    try {
        appendMessage(message, true);
        socket.emit('chat message', message);
        messageInput.value = '';
        setLoading(true);
    } catch (error) {
        console.error('Error in sendMessage:', error);
    }
}

function appendMessage(message, isUser = false) {
    if (!message) {
        console.warn('Attempted to append undefined or empty message');
        return;
    }

    try {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container';

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.innerHTML = formatMessage(message);

        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = '<svg class="copy-icon"></svg>';
        
        copyButton.addEventListener('click', () => {
            if (!message) return;
            
            navigator.clipboard.writeText(message).then(() => {
                copyButton.classList.add('copied');
                
                setTimeout(() => {
                    copyButton.classList.remove('copied');
                }, 2000);
            });
        });

        messageContainer.appendChild(messageDiv);
        messageContainer.appendChild(copyButton);

        // Insert before the loading spinner if it's visible
        if (loadingSpinner.style.display === 'block') {
            messagesDiv.insertBefore(messageContainer, loadingSpinner);
        } else {
            messagesDiv.appendChild(messageContainer);
        }

        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // Highlight all code blocks
        messageDiv.querySelectorAll('pre code').forEach((block) => {
            Prism.highlightElement(block);
        });
    } catch (error) {
        console.error('Error in appendMessage:', error);
    }
}

function clearChat() {
    socket.emit('clear chat');
    messagesDiv.innerHTML = '';
    // Re-add the loading spinner div after clearing
    messagesDiv.appendChild(loadingSpinner);
}

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        // If shift is held down, allow new line
        if (e.shiftKey) {
            return; // Default behavior (new line) will occur
        }
        
        // Otherwise prevent default behavior and send message
        e.preventDefault();
        if (!messageInput.disabled) {
            sendMessage();
        }
    }
});

socket.on('chat response', (response) => {
    setLoading(false);
    appendMessage(response);
});

socket.on('conversation_started', (data) => {
    const modelDisplay = document.getElementById('model-display');
    if (modelDisplay) {
        modelDisplay.textContent = `Model: ${data.model}`;
    }
});

socket.on('error', (error) => {
    setLoading(false);
    appendMessage(`Error: ${error}`);
});

socket.on('chat cleared', () => {
    console.log('Chat history cleared on server');
});