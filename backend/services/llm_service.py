"""
LLM service for RepoChat.
Handles communication with OpenRouter API.
Includes prompt templates for Q&A, summarization, and code explanation.
"""

import os
import requests

from config import OPENROUTER_API_KEY, OPENROUTER_API_URL, LLM_MODEL
from utils.logger import chat_logger


# ── Prompt Templates ───────────────────────────────────

SYSTEM_PROMPT_QA = """You are RepoChat, an expert code assistant. Answer questions about the codebase using ONLY the provided context chunks.

Rules:
- Use markdown formatting in your responses
- Use code blocks with language specifiers (```python, ```javascript, etc.)
- Reference specific file names and function/class names when relevant
- If the context doesn't contain enough information, say so clearly
- Be concise but thorough
- Structure longer answers with headings and bullet points"""

SYSTEM_PROMPT_SUMMARY = """You are RepoChat, an expert code analyst. Generate a concise project overview based on the provided code chunks.

Include:
- What the project does (1-2 sentences)
- Main technologies and frameworks used
- Key architectural patterns
- Important files and their purposes

Use markdown formatting. Be concise — aim for 150-300 words."""

SYSTEM_PROMPT_EXPLAIN = """You are RepoChat, an expert code explainer. Explain the provided code in detail.

Rules:
- Break down the code line-by-line or section-by-section
- Explain the purpose of each function, class, or block
- Highlight important patterns, algorithms, or design decisions
- Use markdown formatting with code references
- Make explanations accessible to intermediate developers"""


import json
import time

def generate_answer(context_chunks: list, question: str, history: list = None) -> str:
    """Generate an answer to a question using retrieved context chunks."""
    return _call_llm(context_chunks, question, SYSTEM_PROMPT_QA, history)


def generate_summary(context_chunks: list) -> str:
    """Generate a project summary from context chunks."""
    return _call_llm(
        context_chunks,
        "Generate a comprehensive project overview and summary.",
        SYSTEM_PROMPT_SUMMARY,
    )


def generate_explanation(context_chunks: list, code_or_question: str) -> str:
    """Generate a detailed code explanation."""
    return _call_llm(context_chunks, code_or_question, SYSTEM_PROMPT_EXPLAIN)


def generate_answer_stream(context_chunks: list, question: str, history: list = None):
    """Generate a streamed answer chunk generator using context chunks."""
    return _call_llm_stream(context_chunks, question, SYSTEM_PROMPT_QA, history)


def _build_messages(context_chunks: list, question: str, system_prompt: str, history: list = None) -> list:
    """Build messages payload with system instructions, context, history (last 6 messages), and current question."""
    # Build context string
    context_parts = []
    for chunk in context_chunks:
        file_name = chunk.get("file", "unknown")
        name = chunk.get("name", "")
        start = chunk.get("start_line", "")
        end = chunk.get("end_line", "")
        location = f" (L{start}-L{end})" if start and end else ""

        context_parts.append(
            f"File: {file_name}{location}\n"
            f"Name: {name}\n"
            f"Code:\n{chunk.get('chunk', '')}"
        )

    context = "\n---\n".join(context_parts)

    prompt = f"""Context from codebase:
{context}

Question: {question}"""

    messages = [{"role": "system", "content": system_prompt}]
    
    # Memory protection: limit history to the last 6 messages
    if history:
        history_limit = history[-6:]
        for msg in history_limit:
            # OpenRouter expects {"role": "user" | "assistant", "content": "..."}
            role = msg.get("role")
            content = msg.get("content")
            if role and content:
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": prompt})
    return messages


def _call_llm(context_chunks: list, question: str, system_prompt: str, history: list = None) -> str:
    """Call the OpenRouter API synchronously with retries and fallback models."""
    if not OPENROUTER_API_KEY:
        raise ValueError(
            "OPENROUTER_API_KEY is not set. "
            "Please add it to your .env file."
        )

    messages = _build_messages(context_chunks, question, system_prompt, history)
    
    models_to_try = [
        LLM_MODEL,
        "meta-llama/llama-3-8b-instruct:free",
        "google/gemma-2-9b-it:free",
        "mistralai/mistral-7b-instruct:free"
    ]
    models_to_try = [m for m in dict.fromkeys(models_to_try) if m]

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/RepoChat/RepoChat",
        "X-Title": "RepoChat",
    }

    last_error = None
    for model in models_to_try:
        payload = {
            "model": model,
            "messages": messages,
        }
        
        chat_logger.info(f"Calling LLM ({model}) in sync mode...")
        
        max_retries = 3
        backoff = 1.0
        
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    OPENROUTER_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=30,
                )
                
                if response.status_code == 429:
                    chat_logger.warning(f"Rate limit 429 for {model}. Retrying...")
                    time.sleep(backoff)
                    backoff *= 2
                    continue
                    
                response.raise_for_status()
                data = response.json()
                answer = data["choices"][0]["message"]["content"].strip()
                chat_logger.info(f"Sync call successful for model {model}")
                return answer
                
            except Exception as e:
                chat_logger.warning(f"Attempt {attempt+1} failed for {model}: {e}")
                last_error = str(e)
                
            time.sleep(backoff)
            backoff *= 2
            
    raise ValueError(f"Failed to generate answer from all models. Last error: {last_error}")


def _call_llm_stream(context_chunks: list, question: str, system_prompt: str, history: list = None):
    """Call the OpenRouter API with SSE streaming, including retries and fallback models."""
    if not OPENROUTER_API_KEY:
        yield "Error: OPENROUTER_API_KEY is not set. Please add it to your .env file."
        return

    messages = _build_messages(context_chunks, question, system_prompt, history)
    
    models_to_try = [
        LLM_MODEL,
        "meta-llama/llama-3-8b-instruct:free",
        "google/gemma-2-9b-it:free",
        "mistralai/mistral-7b-instruct:free"
    ]
    models_to_try = [m for m in dict.fromkeys(models_to_try) if m]

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/RepoChat/RepoChat",
        "X-Title": "RepoChat",
    }

    last_error = None
    for model in models_to_try:
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
        }
        
        chat_logger.info(f"Calling LLM ({model}) in stream mode...")
        
        max_retries = 3
        backoff = 1.0
        
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    OPENROUTER_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=30,
                    stream=True
                )
                
                if response.status_code == 429:
                    chat_logger.warning(f"Rate limit 429 for {model}. Retrying...")
                    time.sleep(backoff)
                    backoff *= 2
                    continue
                    
                response.raise_for_status()
                
                for line in response.iter_lines():
                    if not line:
                        continue
                    line_str = line.decode("utf-8").strip()
                    if line_str.startswith("data: "):
                        data_payload = line_str[6:]
                        if data_payload == "[DONE]":
                            break
                        try:
                            data = json.loads(data_payload)
                            chunk = data["choices"][0]["delta"].get("content", "")
                            if chunk:
                                yield chunk
                        except Exception:
                            pass
                return  # Exited streaming loop successfully
                
            except Exception as e:
                chat_logger.warning(f"Stream attempt {attempt+1} failed for {model}: {e}")
                last_error = str(e)
                
            time.sleep(backoff)
            backoff *= 2
            
    yield f"\n\n[Error: Failed to stream response from all models. Last error: {last_error}]"
