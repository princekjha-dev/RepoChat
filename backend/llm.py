import os
import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL_NAME = "mistralai/mistral-7b-instruct"


def generate_answer(context_chunks, question: str) -> str:
    context = "\n---\n".join(
        f"File: {chunk['file']}\nName: {chunk['name']}\nChunk:\n{chunk['chunk']}"
        for chunk in context_chunks
    )
    prompt = f"""
Context from codebase:
{context}

Question: {question}
"""
    headers = {
        "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a helpful code assistant. Answer questions about the codebase "
                    "using only the provided context. If the context doesn't contain enough "
                    "information, say so clearly."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    }

    response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload, timeout=120)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()
