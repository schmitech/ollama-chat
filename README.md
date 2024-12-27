# Ollama Chat Client

A simple web-based chat client for interacting with Ollama models. This application provides a clean interface for chatting with any Ollama model running locally or on a remote server.

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Ollama installed and running on your machine or a remote server

## Installation

1. Clone the repository:
```bash
git clone https://github.com/schmitech/ollama-chat
cd ollama-chat
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory (or copy the example):
```bash
cp .env.example .env
```

## Configuration

You can configure the application using the following environment variables in the `.env` file:

```env
OLLAMA_MODEL=mistral
OLLAMA_ENDPOINT=http://localhost:11434
PORT=3000
```

## Usage

There are several ways to run the application:

### Using predefined model scripts

```bash
# Start with Mistral model
npm run start:mistral

# Start with Llama2 model
npm run start:llama2

# Start with CodeLlama model
npm run start:codellama
```

### Using custom configuration

```bash
# Use settings from .env file
npm run start:custom
```

### Using custom environment variables

```bash
# Specify model and endpoint directly
OLLAMA_MODEL=your-model OLLAMA_ENDPOINT=http://your-server:11434 npm start
```

## Accessing the Chat Interface

1. Start the application using one of the methods above
2. Open your web browser and navigate to `http://localhost:3000`
3. Start chatting with your chosen Ollama model!

## Features

- Real-time chat interface
- Support for multiple Ollama models
- Configurable Ollama endpoint
- Clear chat history functionality
- Responsive design
- Error handling and logging

## Project Structure

```
ollama-chat/
├── src/
│   ├── index.ts          # Main application entry
│   ├── ollama-api.ts     # Ollama API integration
│   └── public/
│       └── index.html    # Web interface
├── .env                  # Environment configuration
├── .gitignore           # Git ignore rules
├── package.json         # Project dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## Development

To run the application in development mode with auto-reload:

```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the Apache 2 License - see the LICENSE file for details.

## Troubleshooting

### Common Issues

1. **Ollama API Connection Error**
   - Ensure Ollama is running and accessible
   - Check if the OLLAMA_ENDPOINT in .env matches your Ollama server address
   - Verify that the specified model is installed (`ollama list`)

2. **Model Not Found**
   - Install the required model using: `ollama pull model-name`
   - Check if the model name matches exactly with `ollama list`

3. **Port Already in Use**
   - Change the PORT in .env file
   - Check if another process is using port 3000

### Getting Help

If you encounter any issues:
1. Check the console logs in your terminal
2. Verify your configuration in .env
3. Ensure Ollama is running and responsive
4. Open an issue in the repository with detailed error information

Copyright 2024 Schmitech Inc.