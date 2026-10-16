# Development Guide

## Prerequisites

- Python 3.11 or later
- Node.js 20 or later
- npm 10 or later
- PostgreSQL 16 (or Docker for containerized development)
- Git

---

## Repository Setup

```bash
git clone <repository-url>
cd documind
```

---

## Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Linux/macOS)
source .venv/bin/activate

# Activate (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Install all dependencies including dev extras
pip install -e ".[dev]"

# Copy and configure environment
cp .env.example .env
# Edit .env with your values
```

### Start PostgreSQL

Option A — Docker:
```bash
docker run -d \
  --name documind_postgres \
  -e POSTGRES_USER=documind \
  -e POSTGRES_PASSWORD=documind \
  -e POSTGRES_DB=documind \
  -p 5432:5432 \
  postgres:16-alpine
```

Option B — Local installation: Start your PostgreSQL service and create the `documind` database.

### Run Migrations

```bash
cd backend
alembic upgrade head
```

### Start the Backend

```bash
cd backend
uvicorn app.main:app --reload
```

API will be available at http://localhost:8000  
Interactive docs at http://localhost:8000/docs

---

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local if needed
npm run dev
```

Frontend will be available at http://localhost:5173

---

## Running Tests

### Backend

```bash
cd backend
pytest tests/ -v
pytest tests/unit/ -v          # Unit tests only
pytest tests/integration/ -v   # Integration tests only
```

### Frontend

```bash
cd frontend
npm run test          # Interactive watch mode
npm run test -- --run # Single run (for CI)
```

---

## Linting and Formatting

### Backend

```bash
cd backend
ruff check app/ tests/          # Check for issues
ruff check --fix app/ tests/    # Auto-fix
ruff format app/ tests/         # Format
ruff format --check app/ tests/ # Check formatting only
```

### Frontend

```bash
cd frontend
npm run lint
npm run lint:fix
```

---

## Docker Compose (All Services)

```bash
# Start everything
docker compose up --build

# Stop
docker compose down

# Rebuild specific service
docker compose up --build backend

# View logs
docker compose logs -f
docker compose logs -f backend
```

---

## Adding a New Environment Variable

1. Add the variable to `backend/.env.example` (or root `.env.example`).
2. Add validation logic in `backend/app/core/config.py`.
3. Document it in `docs/ENVIRONMENT_VARIABLES.md`.
4. Update `README.md` if it affects the quick-start flow.

---

## Adding a Database Migration

```bash
cd backend
# Make model changes in app/models/
alembic revision --autogenerate -m "describe the change"
# Review the generated file in alembic/versions/
alembic upgrade head
```

---

## Common Issues

**Backend fails to connect to PostgreSQL:**
- Ensure PostgreSQL is running.
- Check `DATABASE_URL` in `.env`.
- Ensure the database and user exist.

**ChromaDB errors:**
- Ensure `CHROMA_PERSIST_DIR` exists or can be created.
- The directory must be writable.

**Import errors after pulling new code:**
```bash
cd backend && pip install -e ".[dev]"
cd frontend && npm install
```
