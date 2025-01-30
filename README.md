# Ollama Chat Client

A simple web-based chat client for interacting with Ollama models. This application provides a clean interface for chatting with any Ollama model running locally or on a remote server.

![Ollama Chat Demo](./assets/ollama-chat.gif)

## Prerequisites

- Node.js (v18 or higher)
- npm (Node Package Manager)
- Ollama installed and running on your machine

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

## Usage

To run the application in development mode with the default model:

```bash
npm run dev
```

### Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Accessing the Chat Interface

1. Start the application using one of the methods above
2. Open your web browser and navigate to `http://localhost:5173` (development) or the URL shown in your terminal
3. Start chatting with your chosen Ollama model!

## Troubleshooting

### Common Issues

1. **Ollama API Connection Error**
   - Ensure Ollama is running (`ollama serve`)
   - Verify that Ollama is accessible at http://localhost:11434
   - Verify that the specified model is installed (`ollama list`)

2. **Model Not Found**
   - Install the required model using: `ollama pull model-name`
   - Check if the model name matches exactly with `ollama list`

3. **Conversation Context Issues**
   - Some models (like Mistral) handle chat context better than others
   - If context is important, use Mistral or Llama2

### Getting Help

If you encounter any issues:
1. Check the browser's console logs
2. Ensure Ollama is running and responsive
3. Open an issue in the repository with detailed error information

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the Apache 2 License - see the LICENSE file for details.

Copyright 2024 Schmitech Inc.