# DocuMind — AI Document Intelligence Platform

DocuMind is an AI-powered document intelligence platform that allows users to upload their documents and interact with them through natural-language conversations.

Upload PDFs, Word documents, and plain-text files, then ask questions and receive accurate, verifiable, source-cited answers powered by Retrieval-Augmented Generation (RAG).

---

## Features

- 📄 **Multi-format ingestion** — PDF, DOCX, and TXT support
- 🔍 **Semantic retrieval** — Vector search with Sentence Transformers + Chroma
- 🤖 **Grounded generation** — Answers backed by retrieved evidence, not hallucination
- 📌 **Transparent citations** — Every answer links to the original source passage and page
- 💬 **Conversation history** — Persistent, user-isolated conversation threads
- 📊 **RAG evaluation** — Built-in evaluation tooling for retrieval quality
- 🔐 **Privacy-first** — User data is isolated; documents are never used for training
- 🐳 **Docker-ready** — Full Compose setup for local and production deployment

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Python, FastAPI, Pydantic, SQLAlchemy, Alembic |
| AI / RAG | Sentence Transformers, Chroma, provider-independent LLM interface |
| Document processing | PyMuPDF, python-docx |
| Database | PostgreSQL |
| DevOps | Docker, Docker Compose, GitHub Actions |

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for frontend development)
- Python 3.11+ (for backend development)

### 1. Clone and configure

```bash
git clone <repository-url>
cd documind
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start with Docker Compose

```bash
docker compose up --build
```

The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### 3. Local development (without Docker)

See [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md) for full local setup instructions.

#### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Available Make Commands

```bash
make help           # Show all available commands
make dev            # Start all services with Docker Compose
make backend-test   # Run backend tests
make frontend-test  # Run frontend tests
make lint           # Run linters
make migrate        # Run database migrations
make logs           # Tail Docker Compose logs
```

---

## Project Structure

```
documind/
├── backend/        # FastAPI application
├── frontend/       # React + Vite application
├── docs/           # Project documentation
├── prompts/        # LLM system prompts
├── evaluation/     # RAG evaluation tooling
├── scripts/        # Development and CI helper scripts
└── data/           # Local data storage (gitignored)
```

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for the full structure and module responsibilities.

---

## Documentation

Full documentation is in the [docs/](docs/) directory. Start with [docs/INDEX.md](docs/INDEX.md).

---

## Development Phase

This project is under active development. See [docs/phases/](docs/phases/) for the phase-wise implementation plan.

Current status: **Phase 04 — Citations & History** ✅

---

## License

See [LICENSE](LICENSE).
