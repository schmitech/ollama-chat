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

const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const fileNameSpan = document.getElementById('file-name');
const uploadedTextDiv = document.getElementById('uploaded-text');

let currentMarkdownContent = null;

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

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        fileNameSpan.textContent = file.name;
        const reader = new FileReader();
        
        reader.onload = (event) => {
            currentMarkdownContent = event.target.result;
        };
        
        reader.readAsText(file);
    } else {
        fileNameSpan.textContent = '';
        currentMarkdownContent = null;
    }
});

function closePreview() {
    uploadedTextDiv.style.display = 'none';
    fileInput.value = '';
    fileNameSpan.textContent = '';
    currentMarkdownContent = null;
}

function formatMessage(content) {
    // Split content into code blocks and text
    const parts = content.split(/```(\w+)?\n([\s\S]*?)```/g);
    let formattedContent = '';

    for (let i = 0; i < parts.length; i++) {
        if (i % 4 === 0) {
            // Regular text
            formattedContent += parts[i]
                .split('\n')
                .map(line => `<p>${line}</p>`)
                .join('');
        } else if (i % 4 === 1) {
            // Language identifier
            const language = parts[i] || 'plaintext';
            const code = parts[i + 1];
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
}

function appendMessage(message, isUser = false) {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container';

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    messageDiv.innerHTML = formatMessage(message);

    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copy</span>
    `;
    
    copyButton.addEventListener('click', () => {
        // Get text content without the copy button
        const textToCopy = message;
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Change button text temporarily
            copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Copied!</span>
            `;
            copyButton.style.color = '#28a745';
            
            // Reset button after 2 seconds
            setTimeout(() => {
                copyButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                `;
                copyButton.style.color = '';
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
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        const fullMessage = currentMarkdownContent 
            ? `${message}\n\nUploaded Markdown Content:\n\`\`\`markdown\n${currentMarkdownContent}\n\`\`\``
            : message;
            
        appendMessage(fullMessage, true);
        socket.emit('chat message', fullMessage);
        messageInput.value = '';
        
        // Clear the markdown content after sending
        currentMarkdownContent = null;
        fileInput.value = '';
        fileNameSpan.textContent = '';
        
        setLoading(true);
    }
}

function clearChat() {
    socket.emit('clear chat');
    messagesDiv.innerHTML = '';
    // Re-add the loading spinner div after clearing
    messagesDiv.appendChild(loadingSpinner);
}

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !messageInput.disabled) {
        sendMessage();
    }
});

socket.on('chat response', (response) => {
    setLoading(false);
    appendMessage(response);
});

socket.on('error', (error) => {
    setLoading(false);
    appendMessage(`Error: ${error}`);
});

socket.on('chat cleared', () => {
    console.log('Chat history cleared on server');
});