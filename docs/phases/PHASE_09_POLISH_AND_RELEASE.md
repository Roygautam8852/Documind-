# Phase 09: Polish & Release

## Goal

Make the application coherent for everyday use and provide reproducible setup, build, migration, and release guidance.

## Acceptance criteria

- [x] Remove stale phase-00/06 marketing copy and claims that cannot be guaranteed for external LLM providers.
- [x] Require authentication for workspace routes, provide profile-aware account controls and sign-out, and return users to a protected destination after login.
- [x] Improve small-screen access to workspace navigation.
- [x] Fix the chat client endpoint path and ensure PDF/DOCX parser dependencies are installed in packaged/runtime environments.
- [x] Add the initial relational database migration and run migrations as part of the supplied Compose startup paths.
- [x] Provide separate local-development and single-host production Compose behavior, with a static frontend/API proxy in production and a non-root backend container.
- [x] Add deployment, privacy, user, and release checklists; repair documentation navigation for the added material.
- [x] CI applies the migration and continues to run backend lint/tests plus frontend lint/tests/build.

## Release artifacts

- [Deployment guide](../DEPLOYMENT.md)
- [Release checklist](../RELEASE_CHECKLIST.md)
- [Privacy and data handling](../PRIVACY.md)
- [User guide](../USER_GUIDE.md)
- [Initial schema migration](../../backend/alembic/versions/20261016_0001_initial_schema.py)

## Limitations

The provided production Compose setup targets a single host. TLS termination, backups, monitoring, malware scanning, secret rotation, provider disclosures, and shared storage for horizontal scaling remain deployment responsibilities. Complete the release checklist and run the listed tests and smoke flow in the target environment before publishing a release.
