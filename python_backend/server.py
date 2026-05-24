import os
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from memori import Memori
from litellm import completion
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Initialize Memori
# This will automatically intercept LiteLLM calls to inject memory
memori = Memori()

class ChatRequest(BaseModel):
    userPrompt: str
    userId: str = "default_user"  # You can pass a unique user ID here


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # Memori will automatically:
        # 1. Search for relevant past memories
        # 2. Inject them into the prompt
        # 3. Save this new interaction to memory
        
        # We use LiteLLM which Memori supports natively
        response = completion(
            model="gemini/gemini-pro",  # Use Google Gemini Pro
            messages=[
                {"role": "system", "content": "You are KiX AI, a helpful assistant."},
                {"role": "user", "content": request.userPrompt}
            ],
            user=request.userId
        )
        
        return {"text": response.choices[0].message.content}

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Run the server on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
