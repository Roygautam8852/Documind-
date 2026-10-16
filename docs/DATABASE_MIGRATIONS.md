# Database Migrations

DocuMind uses Alembic for all database schema management. Schema changes are **never** applied by the application at startup via `create_all`.

---

## Workflow

### 1. Initial Setup

```bash
cd backend
alembic upgrade head
```

This applies all existing migrations, including the initial relational schema, to the target database.

For a database that already has DocuMind tables but no `alembic_version` record, do not run the baseline blindly: back up the database, compare its schema to the baseline, and only if it matches exactly, record the baseline with `alembic stamp 20261016_0001`. Existing production data needs a reviewed adoption plan.

### 2. Creating a New Migration

After modifying SQLAlchemy models in `app/models/`:

```bash
alembic revision --autogenerate -m "describe what changed"
```

**Always review the generated migration file** before running it. Autogenerate can miss complex constraints, data migrations, or index changes.

### 3. Applying Migrations

```bash
alembic upgrade head      # Apply all pending migrations
alembic upgrade +1        # Apply one migration forward
alembic downgrade -1      # Roll back one migration
alembic downgrade base    # Roll back all migrations
```

### 4. Checking Current State

```bash
alembic current           # Show current migration revision
alembic history           # Show migration history
alembic show <revision>   # Show details of a specific revision
```

---

## Migration File Naming

Alembic generates revision IDs automatically. The message you provide becomes part of the filename:

```
alembic/versions/abc123_add_page_count_to_documents.py
```

Use clear, descriptive messages that describe the schema change.

---

## Rules

1. **Never** edit a migration that has already been applied to any shared database.
2. **Always** test the migration `upgrade` and `downgrade` paths locally.
3. **Data migrations** must be written manually — `autogenerate` only handles structural changes.
4. **Production migrations** should be applied as a controlled deployment step before new application code. The supplied single-host production Compose startup runs migrations before starting the API; use a dedicated migration job for orchestrated deployments.
5. **Foreign keys** are enforced at the database level; never disable them to work around constraint errors.

---

## Test Database

The repository includes a baseline migration at `alembic/versions/20261016_0001_initial_schema.py`. Apply it to new development and production databases with `alembic upgrade head`. Unit and integration tests create their isolated in-memory SQLite schema directly from SQLAlchemy metadata; they do not mutate the configured PostgreSQL database.

Configure the test database URL via the `DATABASE_URL` environment variable when `APP_ENV=test`.

---

## Alembic Configuration

The `alembic.ini` in `backend/` configures the migration script location and the database connection. The `env.py` file imports SQLAlchemy models to support autogenerate.

All models must be imported in `backend/alembic/env.py` (or through `app/db/base.py`) for autogenerate to detect them.
