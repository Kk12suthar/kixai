# Python Backend for Memori + Google Gemini

This service runs the Python-only libraries (Memori, Google ADK/LiteLLM) and exposes an API for your TypeScript frontend.

## Setup

1.  **Install Python**: Ensure you have Python 3.10+ installed.
2.  **Install Dependencies**:
    ```bash
    cd python_backend
    pip install -r requirements.txt
    ```
3.  **Environment Variables**:
    Make sure you have your `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) set in your environment or a `.env` file in this directory.

## Running the Server

```bash
python server.py
```

The server will start at `http://localhost:8000`.

## API Endpoint

**POST** `/chat`

```json
{
  "userPrompt": "Hello, who are you?",
  "userId": "user_123"
}
```
