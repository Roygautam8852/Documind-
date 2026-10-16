# Phase 08: Security & Production

## Goal

Strengthen tenant isolation, upload handling, authentication configuration, and abuse controls, while documenting deployment conditions that the application cannot guarantee by itself.

## Acceptance criteria

- [x] Document and conversation lookups remain scoped to the authenticated owner; existing integration coverage includes cross-user document and conversation access attempts.
- [x] Uploads enforce byte limits while reading, per-account document and storage quotas, and content signatures for PDF, DOCX, and UTF-8 text.
- [x] Local storage path resolution rejects keys that escape the configured upload directory.
- [x] Authentication, upload, chat, and comparison routes have configurable per-IP rate limits.
- [x] Production startup rejects known development JWT secrets and signing secrets under 64 characters.
- [x] Request validation errors do not echo submitted input; upload filenames are excluded from upload logs.
- [x] Security and environment documentation describes limits, configuration, and deployment responsibilities.

## Controls delivered

See [SECURITY.md](../SECURITY.md) and [ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md). The built-in rate limiter and quota checks are suitable for a single application instance and modest concurrency. For multiple replicas, coordinate rate limiting with a shared store or trusted gateway and use transactional quota reservations. This phase does not add malware scanning, external audit storage, shared object storage, or a managed vector database.

## Exit criteria

All application-level controls above are implemented. Production deployment still requires operational controls such as TLS, backups, secret management and rotation, malware scanning policy, and suitable shared storage and monitoring.
