# RepoChat AI v3.0 Enterprise — Modern Codebase Intelligence Platform

> **Enterprise-grade AI code analysis, RAG chat, automated security reviews, and visual architecture mapping.**
> Point it at any public GitHub repository and interact instantly — high-speed retrieval, strict security hardening, zero clutter.

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB.svg)](https://www.python.org)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg)](https://vitejs.dev)
[![Version](https://img.shields.io/badge/version-3.0%20Enterprise-2997FF.svg)](https://github.com/princekjha-dev/RepoChat)

---

## ✨ What's New in v3.0 Enterprise

* ⌨️ **Global Command Palette (`Cmd + K` / `Ctrl + K`)**: Instantly search repositories, jump between tabs, trigger AI code reviews, or export conversations with keyboard shortcuts.
* 🌐 **Interactive System Architecture Graph**: Visual SVG module node visualizer mapping directory structures, chunk weights, and language distribution.
* 🛡️ **Enterprise Security Hardening**:
  * **Strict Schema Validation**: Type, length, and format validation on all 15+ API endpoints (`validators.py`).
  * **Configurable Rate Limiting**: Tiered rate limits (Auth, Public, User) with per-IP and per-account exponential backoff (`rate_limiter.py`).
  * **Secure File Upload Storage**: Upload verification inspecting binary magic bytes, whitelisting, and isolated non-executable storage (`chmod 600`).
  * **Leakage-Free Error Handling**: Anti-information-leakage handlers returning clean, sanitized error messages with server-side correlation IDs (`g.request_id`).
  * **Secrets Hygiene**: Verified 100% credential loading via `.env` with no hardcoded keys or git secrets.
* ⚡ **Resilient Synthetic RAG Engine**: Fallback semantic code analyzer powering continuous uptime even if external LLM providers fail or experience rate limits.
* 🍏 **Apple Space Gray Design System**: Pure monochrome space-gray palette with frosted glassmorphic UI, San Francisco-style typography, and zero emoji clutter.

---

## 🚀 Core Features

| Feature | Description |
|---------|-------------|
| 🧠 **RAG-Powered Chat** | Context-aware Q&A across the entire codebase with line-level file source citations |
| 🔍 **AI Code Review** | Bug detection, OWASP security audits, performance profiling, and refactoring tips |
| 📊 **Architecture Summary** | One-click architectural summary generation and SVG component node graph |
| ⚖️ **Repo Comparison** | Side-by-side comparative analysis between two indexed GitHub repositories |
| 📁 **File Explorer & Preview** | IDE-style directory tree with inline line-highlight code preview |
| ⌨️ **Command Palette** | Quick keyboard navigation overlay accessible via `Cmd + K` or `Ctrl + K` |
| 🔗 **Share & Export** | Generate public Q&A share URLs or export complete chat logs as Markdown / JSON |

---

## 🛠️ Quick Start

### 1. Prerequisites & Environment Setup

```bash
# Clone repository
git clone https://github.com/princekjha-dev/RepoChat.git
cd RepoChat-main

# Copy environment template
cp .env.example .env
```

Edit `.env` to configure your preferred LLM provider:
```env
OPENROUTER_API_KEY=your_openrouter_key
# Optional fast fallback
GROQ_API_KEY=your_groq_key
# Rate limiting configuration
RATE_LIMIT_AUTH=5 per minute
RATE_LIMIT_PUBLIC=60 per minute
RATE_LIMIT_USER=200 per minute
```

---

### 2. Running Locally

#### Backend (Flask + ChromaDB RAG Engine)
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
cd backend
source ../venv/bin/activate
python3 app.py
# Backend runs on http://localhost:5000
```

#### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5174
```

### Deploying the frontend to Vercel

Vercel hosts the Vite frontend only. The Flask backend includes PyTorch,
SentenceTransformers, and persistent ChromaDB storage, so it must run on a
container host with a persistent volume (for example, using
`Dockerfile.backend`). After the backend is available publicly:

1. In Vercel, add `VITE_API_URL` with the backend's HTTPS URL (without a
   trailing `/`).
2. Redeploy the frontend so Vite embeds that URL in the build.
3. Confirm `<backend-url>/api/health` returns JSON before opening RepoChat.

---

## 🔒 Security & Hardening Architecture

RepoChat AI v3.0 incorporates robust security practices:

1. **Input Validation**: All payloads undergo strict schema enforcement before reaching business logic.
2. **Brute Force Defense**: Authentication endpoints utilize per-account exponential backoff delays rather than rigid hard lockouts.
3. **Isolated File Uploads**: Files uploaded to `/api/upload` are validated via magic byte signature analysis and stored in a non-executable directory outside web roots.
4. **Sanitized Error Payloads**: Internal tracebacks and file paths are stripped from client HTTP responses, keeping internal implementation details safe.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
