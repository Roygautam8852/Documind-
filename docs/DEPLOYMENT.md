# Deployment

## Local development

Copy `.env.example` to `.env`, then start the hot-reload development stack:

```bash
docker compose up --build
```

The frontend runs Vite on port 5173, the API runs on port 8000, and PostgreSQL runs on port 5432. The development Compose file uses mock AI providers and development credentials. Do not expose it to the public internet.

## Single-host production

1. Set a strong URL-safe `POSTGRES_PASSWORD` and a unique random `JWT_SECRET` of at least 64 characters.
2. Select a real `LLM_PROVIDER` and configure its `LLM_API_KEY`. Production refuses the mock provider.
3. Set `FRONTEND_ORIGIN` to the exact public origin (scheme and host) and configure upload limits, quotas, and rate limits.
4. Put a TLS-terminating reverse proxy or load balancer in front of the frontend. Configure its request body ceiling slightly above `MAX_UPLOAD_MB` for multipart overhead.
5. Run:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

The production Compose file builds the frontend as static files served by Nginx, proxies `/api/` to the backend, keeps PostgreSQL and the API off host-published ports, runs the backend as an unprivileged user, applies Alembic migrations before starting the API, and persists database and application data in named volumes. The app health check waits for database readiness.

For an existing database that predates the baseline migration, back it up and compare its schema first. If it matches the baseline exactly, stamp that revision before starting the Compose stack; do not apply the create-schema baseline to an untracked populated database.

## Operating limits

- This Compose setup is a single-host starting point, not a highly available deployment. Back up and test restores for both volumes.
- The built-in rate limiter and storage quota checks are process-local/single-instance controls. Use a shared limiter and atomic quota reservations when scaling replicas.
- Local filesystem document storage and embedded Chroma are single-host oriented. Move to shared object storage and a managed vector service before horizontal scaling.
- Configure TLS, security headers, monitoring, log retention, malware scanning policy, secret rotation, and provider-specific data disclosures for the deployment environment.
- The `FRONTEND_ORIGIN` value must match the browser's origin. Set `UPLOAD_DIR` and `CHROMA_PERSIST_DIR` under `/app/data` in production so they persist on the named application volume.
