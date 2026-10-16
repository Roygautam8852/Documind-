# Data Model

## Entity Relationship Overview

```
users ──< documents ──< chunks
  │
  └──< conversations ──< messages
```

---

## Table: users

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | User identifier |
| `email` | VARCHAR(320) | UNIQUE, NOT NULL | User email address |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hash — never plaintext |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | Account creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() | Last profile update |

**Indexes:** `ix_users_email` (unique)

---

## Table: documents

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Document identifier |
| `owner_id` | UUID | FK → users.id, NOT NULL | Owning user |
| `original_filename` | VARCHAR(512) | NOT NULL | Name as uploaded by the user |
| `stored_object_key` | VARCHAR(1024) | UNIQUE, NOT NULL | Server-generated storage path |
| `mime_type` | VARCHAR(128) | NOT NULL | Detected MIME type |
| `size_bytes` | BIGINT | NOT NULL | File size in bytes |
| `checksum_sha256` | VARCHAR(64) | NOT NULL | SHA-256 of raw file content |
| `status` | VARCHAR(32) | NOT NULL | `uploaded` \| `processing` \| `ready` \| `failed` \| `deleting` |
| `error_code` | VARCHAR(64) | NULLABLE | Machine-readable failure reason |
| `safe_error_message` | TEXT | NULLABLE | User-safe failure description |
| `page_count` | INTEGER | NULLABLE | Pages (PDF), paragraphs (DOCX), or NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | Upload time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() | Last status update |

**Indexes:** `ix_documents_owner_id`, `ix_documents_status`

**Status transitions:**
```
uploaded → processing → ready
                     → failed → (retry) → processing
         → deleting  → (deleted)
```

---

## Table: chunks

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Chunk identifier |
| `document_id` | UUID | FK → documents.id ON DELETE CASCADE | Source document |
| `owner_id` | UUID | FK → users.id | Owning user (denormalized for query efficiency) |
| `chunk_index` | INTEGER | NOT NULL | Zero-based position within the document |
| `text` | TEXT | NOT NULL | Extracted chunk text |
| `page_number` | INTEGER | NULLABLE | Source page number (PDF), NULL for DOCX/TXT |
| `section_title` | VARCHAR(512) | NULLABLE | Nearest heading, if detectable |
| `token_count` | INTEGER | NULLABLE | Estimated token count |
| `vector_id` | VARCHAR(256) | NULLABLE | ID of the corresponding vector in Chroma |
| `metadata` | JSONB | NOT NULL, default '{}' | Additional structured metadata |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | Indexing time |

**Unique constraint:** `(document_id, chunk_index)`

**Indexes:** `ix_chunks_document_id`, `ix_chunks_owner_id`, `ix_chunks_vector_id`

---

## Table: conversations

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Conversation identifier |
| `owner_id` | UUID | FK → users.id, NOT NULL | Owning user |
| `title` | VARCHAR(512) | NULLABLE | Conversation title (auto-generated or user-set) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | Creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() | Last message time |

**Indexes:** `ix_conversations_owner_id`

---

## Table: messages

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Message identifier |
| `conversation_id` | UUID | FK → conversations.id ON DELETE CASCADE | Parent conversation |
| `owner_id` | UUID | FK → users.id | Owning user (denormalized) |
| `role` | VARCHAR(16) | NOT NULL | `user` \| `assistant` |
| `content` | TEXT | NOT NULL | Message body |
| `citations` | JSONB | NOT NULL, default '[]' | Serialized citation objects |
| `retrieval_metadata` | JSONB | NULLABLE | Result count, latency, etc. |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | Message time |

**Indexes:** `ix_messages_conversation_id`, `ix_messages_owner_id`

---

## Migration Strategy

- All schema changes use Alembic migrations in `backend/alembic/versions/`.
- No schema changes are made at application startup via `create_all`.
- See [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) for the migration workflow.
