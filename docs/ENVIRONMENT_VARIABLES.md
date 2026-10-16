# Environment Variables Reference

All environment variables used by DocuMind are documented here. Copy `.env.example` to `.env` and fill in values before running the application.

**Never commit `.env` files to version control.**

---

## Application

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_ENV` | No | `development` | Environment: `development`, `test`, `production` |
| `APP_NAME` | No | `DocuMind` | Application display name |
| `API_HOST` | No | `0.0.0.0` | Host the FastAPI server binds to |
| `API_PORT` | No | `8000` | Port the FastAPI server listens on |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin for the frontend |

## Database

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL async connection string, e.g. `postgresql+asyncpg://user:pass@host:5432/db` |
| `POSTGRES_PASSWORD` | Compose production | — | URL-safe password for the PostgreSQL container; use a unique secret and keep `.env` untracked |

## File Storage

| Variable | Required | Default | Description |
|---|---|---|---|
| `STORAGE_BACKEND` | No | `local` | Storage adapter: `local` (future: `s3`) |
| `UPLOAD_DIR` | No | `./data/uploads` | Directory for uploaded files (local backend) |
| `MAX_UPLOAD_MB` | No | `50` | Maximum allowed upload size in megabytes |
| `ALLOWED_EXTENSIONS` | No | `pdf,docx,txt` | Comma-separated list of accepted extensions |
| `MAX_USER_DOCUMENTS` | No | `100` | Maximum number of documents per account |
| `MAX_USER_STORAGE_MB` | No | `1024` | Maximum total uploaded document size per account |

## Vector Store

| Variable | Required | Default | Description |
|---|---|---|---|
| `VECTOR_STORE` | No | `chroma` | Vector store backend: `chroma` |
| `CHROMA_PERSIST_DIR` | No | `./data/chroma` | Directory where Chroma persists its data |

## Embeddings

| Variable | Required | Default | Description |
|---|---|---|---|
| `EMBEDDING_PROVIDER` | No | `sentence_transformers` | Embedding backend: `sentence_transformers`, `mock` |
| `EMBEDDING_MODEL` | No | `all-MiniLM-L6-v2` | Model name/path for the embedding provider |

## LLM Provider

| Variable | Required | Default | Description |
|---|---|---|---|
| `LLM_PROVIDER` | No | `mock` | LLM backend: `openai`, `anthropic`, `google`, `mock` |
| `LLM_MODEL` | No | `gpt-4o-mini` | Model identifier passed to the LLM provider |
| `LLM_API_KEY` | See note | — | API key for the configured LLM provider. **Required for non-mock providers.** Never log this value. |
| `LLM_BASE_URL` | No | — | Optional custom base URL (e.g., for OpenAI-compatible local models) |

> **Note:** `LLM_API_KEY` is required in production. The mock provider ignores it.

## RAG Parameters

| Variable | Required | Default | Description |
|---|---|---|---|
| `CHUNK_SIZE` | No | `800` | Approximate number of tokens per chunk |
| `CHUNK_OVERLAP` | No | `120` | Number of overlapping tokens between adjacent chunks |
| `TOP_K` | No | `5` | Number of chunks to retrieve per query |
| `SIMILARITY_THRESHOLD` | No | `0.35` | Minimum cosine similarity score for a chunk to be included |

## Authentication

| Variable | Required | Default | Description |
|---|---|---|---|
| `AUTH_MODE` | No | `jwt` | Authentication mode: `jwt` |
| `JWT_SECRET` | **Yes** | — | Secret key for signing JWTs. Must be long and random in production. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | JWT token lifetime in minutes |

## Abuse Controls

| Variable | Required | Default | Description |
|---|---|---|---|
| `RATE_LIMIT_ENABLED` | No | `true` | Enable process-local request limits (automatically bypassed in tests) |
| `AUTH_RATE_LIMIT_PER_MINUTE` | No | `10` | Login and registration requests per client IP per minute |
| `UPLOAD_RATE_LIMIT_PER_MINUTE` | No | `10` | Upload requests per client IP per minute |
| `API_RATE_LIMIT_PER_MINUTE` | No | `60` | Chat, summary, and comparison requests per client IP per minute |

> **Warning:** `JWT_SECRET` must be changed from any default value before production deployment.

## Logging

| Variable | Required | Default | Description |
|---|---|---|---|
| `LOG_LEVEL` | No | `INFO` | Log level: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |

---

## Production Checklist

Before going to production, ensure:

- `JWT_SECRET` is a cryptographically random string of at least 64 characters.
- `LLM_API_KEY` is set and valid.
- `DATABASE_URL` points to a production database with restricted credentials.
- `APP_ENV=production` is set.
- `ALLOWED_EXTENSIONS` matches your actual document policy.
- `MAX_UPLOAD_MB` matches your infrastructure limits.
- Rate limits are coordinated at the reverse proxy or shared store when running multiple backend replicas (the built-in limiter is process-local).
- PostgreSQL and application credentials are unique, restricted, and supplied through a secret manager.
- The configured LLM provider's data retention and processing terms are disclosed to users.
- No `.env` file is committed to version control.
