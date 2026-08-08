#!/usr/bin/env python
"""
RAG System Diagnostic Script
Tests the complete RAG pipeline to identify issues.
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from utils.logger import app_logger
from config import EMBEDDING_MODEL, CHROMA_PATH
from vectorstore.client import get_model, get_client, health_check
from cache.repo_cache import is_indexed, list_repos, list_repo_slugs

def test_embedding_model():
    """Test if embedding model loads correctly"""
    print("\n=== Testing Embedding Model ===")
    try:
        model = get_model()
        app_logger.info(f"✓ Embedding model loaded: {EMBEDDING_MODEL}")
        
        # Test encoding
        test_text = ["hello world", "test sentence"]
        embeddings = model.encode(test_text, normalize_embeddings=True)
        app_logger.info(f"✓ Successfully encoded {len(embeddings)} test sentences")
        print(f"  Embedding shape: {embeddings.shape}")
        return True
    except Exception as e:
        app_logger.error(f"✗ Failed to load embedding model: {e}", exc_info=True)
        return False

def test_chromadb():
    """Test if ChromaDB is accessible"""
    print("\n=== Testing ChromaDB ===")
    try:
        if not health_check():
            app_logger.error("✗ ChromaDB health check failed")
            return False
        
        app_logger.info("✓ ChromaDB is healthy")
        print(f"  ChromaDB path: {CHROMA_PATH}")
        
        # Try to get client
        client = get_client()
        app_logger.info("✓ ChromaDB client initialized")
        return True
    except Exception as e:
        app_logger.error(f"✗ ChromaDB error: {e}", exc_info=True)
        return False

def test_indexed_repos():
    """Test if any repositories are indexed"""
    print("\n=== Testing Indexed Repositories ===")
    try:
        slugs = list_repo_slugs()
        repos = list_repos()
        
        if not slugs:
            app_logger.warning("⚠ No repositories indexed yet")
            return False
        
        app_logger.info(f"✓ Found {len(slugs)} indexed repository/repositories")
        for i, repo in enumerate(repos, 1):
            print(f"\n  [{i}] {repo.get('slug', 'unknown')}")
            print(f"      Files: {repo.get('file_count', 0)}")
            print(f"      Chunks: {repo.get('chunk_count', 0)}")
            print(f"      Languages: {list(repo.get('languages', {}).keys())}")
        
        return True
    except Exception as e:
        app_logger.error(f"✗ Error listing repositories: {e}", exc_info=True)
        return False

def test_retrieval(slug=None):
    """Test if retrieval works"""
    print("\n=== Testing Retrieval ===")
    try:
        slugs = list_repo_slugs()
        
        if not slugs:
            app_logger.warning("⚠ No repositories indexed, skipping retrieval test")
            return False
        
        test_slug = slug or slugs[0]
        
        if not is_indexed(test_slug):
            app_logger.warning(f"⚠ Repository '{test_slug}' is not properly indexed")
            return False
        
        from vectorstore.retriever import retrieve_chunks
        
        # Test query
        test_query = "function main architecture"
        results = retrieve_chunks(test_query, test_slug, top_k=3)
        
        if not results:
            app_logger.warning(f"⚠ No results retrieved for test query in '{test_slug}'")
            return False
        
        app_logger.info(f"✓ Retrieved {len(results)} chunks for test query")
        for i, result in enumerate(results, 1):
            print(f"\n  [{i}] {result.get('file', 'unknown')}")
            print(f"      Type: {result.get('type', 'unknown')}")
            print(f"      Lines: {result.get('start_line', '?')}-{result.get('end_line', '?')}")
            preview = result.get('chunk', '')[:100].replace('\n', ' ')
            print(f"      Preview: {preview}...")
        
        return True
    except Exception as e:
        app_logger.error(f"✗ Retrieval test failed: {e}", exc_info=True)
        return False

def test_chat():
    """Test if chat/LLM integration works"""
    print("\n=== Testing Chat/LLM Integration ===")
    try:
        from services.chat_service import ask_question
        from cache.repo_cache import list_repo_slugs
        
        slugs = list_repo_slugs()
        if not slugs:
            app_logger.warning("⚠ No repositories indexed, skipping chat test")
            return False
        
        test_slug = slugs[0]
        test_question = "What is the main purpose of this project?"
        
        app_logger.info(f"Testing chat for '{test_slug}'...")
        result = ask_question(test_slug, test_question)
        
        if not result.get('answer'):
            app_logger.warning("⚠ No answer generated")
            return False
        
        app_logger.info("✓ Chat test successful")
        answer = result.get('answer', '')[:200].replace('\n', ' ')
        print(f"\n  Question: {test_question}")
        print(f"  Answer: {answer}...")
        print(f"  Sources: {len(result.get('sources', []))} reference(s)")
        
        return True
    except Exception as e:
        app_logger.error(f"✗ Chat test failed: {e}", exc_info=True)
        return False

def main():
    """Run all diagnostic tests"""
    print("\n" + "="*60)
    print("RepoChat RAG System Diagnostic")
    print("="*60)
    
    results = {
        "Embedding Model": test_embedding_model(),
        "ChromaDB": test_chromadb(),
        "Indexed Repos": test_indexed_repos(),
        "Retrieval": test_retrieval(),
        "Chat/LLM": test_chat(),
    }
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{test_name:.<40} {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "="*60)
    if all_passed:
        print("✓ All tests passed! RAG system is working correctly.")
    else:
        print("✗ Some tests failed. Check the logs above for details.")
        print("\nCommon issues:")
        print("1. Repository not indexed - paste a GitHub URL in the UI")
        print("2. ChromaDB permission issue - check folder permissions")
        print("3. Embedding model not downloaded - check internet connection")
        print("4. OpenRouter API key missing - add OPENROUTER_API_KEY to .env")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    exit(main())
