import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.environ.get('GEMINI_API_KEY'))

# Test 1: embeddings
embed_response = client.models.embed_content(
    model="gemini-embedding-001",
    contents="Test sentence for embedding.",
    config={"output_dimensionality": 1536}
)
print(f"Embedding dimensions: {len(embed_response.embeddings[0].values)}")

# Test 2: chat completion
chat_response = client.models.generate_content(
    model="gemini-flash-latest",
    contents="Say 'connection successful' and nothing else."
)
print(f"Chat response: {chat_response.text}")