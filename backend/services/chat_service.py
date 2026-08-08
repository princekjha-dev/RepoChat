"""
Chat service.
Orchestrates retrieval + LLM answer generation.
Improved error handling for production use.
"""

from typing import Dict, List

from vectorstore.retriever import retrieve_chunks
from services.llm_service import generate_answer, generate_summary, generate_explanation, generate_answer_stream
from utils.logger import chat_logger
from config import DEFAULT_TOP_K


def ask_question(
    slug: str,
    question: str,
    top_k: int = DEFAULT_TOP_K,
) -> Dict[str, object]:
    """
    Process a user question:
    1. Retrieve relevant chunks from the vector store
    2. Generate an answer using the LLM
    3. Return the answer with source references

    Returns dict with: answer, sources
    """
    chat_logger.info(f"Question for {slug}: {question[:100]}...")

    try:
        # Retrieve relevant chunks
        retrieved = retrieve_chunks(question, slug, top_k=top_k)

        if not retrieved:
            return {
                "answer": (
                    "I couldn't find any relevant code for your question. "
                    "Make sure the repository has been indexed and try rephrasing your question."
                ),
                "sources": [],
            }

        # Generate answer
        answer = generate_answer(retrieved, question)

        # Build source references
        sources = []
        seen = set()
        for item in retrieved:
            key = f"{item['file']}:{item.get('start_line', '')}"
            if key not in seen:
                seen.add(key)
                sources.append({
                    "file": item.get("file", "unknown"),
                    "name": item.get("name", "unknown"),
                    "type": item.get("type", "unknown"),
                    "start_line": item.get("start_line"),
                    "end_line": item.get("end_line"),
                })

        return {"answer": answer, "sources": sources}
    
    except Exception as e:
        chat_logger.error(f"Error processing question for {slug}: {str(e)}")
        raise


def ask_question_stream(
    slug: str,
    question: str,
    history: list = None,
    top_k: int = DEFAULT_TOP_K,
):
    """
    Process a user question and stream the response.
    Yields dicts representing SSE event payloads (sources first, then tokens).
    """
    chat_logger.info(f"Streaming question for {slug}: {question[:100]}...")

    try:
        # Retrieve relevant chunks
        retrieved = retrieve_chunks(question, slug, top_k=top_k)

        sources = []
        seen = set()
        for item in retrieved:
            key = f"{item['file']}:{item.get('start_line', '')}"
            if key not in seen:
                seen.add(key)
                sources.append({
                    "file": item.get("file", "unknown"),
                    "name": item.get("name", "unknown"),
                    "type": item.get("type", "unknown"),
                    "start_line": item.get("start_line"),
                    "end_line": item.get("end_line"),
                })

        if not retrieved:
            yield {
                "sources": [],
                "token": (
                    "I couldn't find any relevant code for your question. "
                    "Make sure the repository has been indexed and try rephrasing your question."
                )
            }
            return

        # Yield sources envelope first
        yield {"sources": sources}

        # Yield tokens from LLM stream
        for token in generate_answer_stream(retrieved, question, history):
            yield {"token": token}
    
    except Exception as e:
        chat_logger.error(f"Error in streaming for {slug}: {str(e)}")
        yield {"error": f"Error generating response: {str(e)}"}


def get_repo_summary(slug: str) -> str:
    """
    Generate an auto-summary of the repository.
    Retrieves a broad set of chunks and asks the LLM to summarize.
    """
    chat_logger.info(f"Generating summary for: {slug}")

    try:
        # Get a diverse set of chunks
        retrieved = retrieve_chunks(
            "main project structure architecture overview entry point",
            slug,
            top_k=10,
        )

        if not retrieved:
            return "No indexed content found for this repository."

        return generate_summary(retrieved)
    except Exception as e:
        chat_logger.error(f"Error generating summary for {slug}: {str(e)}")
        raise


def explain_code(slug: str, question: str) -> Dict[str, object]:
    """
    Code explanation mode — uses a specialized prompt.
    """
    chat_logger.info(f"Code explanation for {slug}: {question[:100]}...")

    try:
        retrieved = retrieve_chunks(question, slug, top_k=5)

        if not retrieved:
            return {
                "answer": "I couldn't find the code you're asking about.",
                "sources": [],
            }

        answer = generate_explanation(retrieved, question)

        sources = [
            {
                "file": item.get("file", "unknown"),
                "name": item.get("name", "unknown"),
                "type": item.get("type", "unknown"),
                "start_line": item.get("start_line"),
                "end_line": item.get("end_line"),
            }
            for item in retrieved
        ]

        return {"answer": answer, "sources": sources}
