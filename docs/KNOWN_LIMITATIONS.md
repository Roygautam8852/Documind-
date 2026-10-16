# Known Limitations

This page records current product and deployment limits. Review it together with the [release checklist](RELEASE_CHECKLIST.md) before deploying.

## Product limits

- **Scanned PDFs:** Image-only PDFs without embedded text produce little or no extracted content; OCR is not implemented.
- **Large files:** Uploads have configurable size and account quotas, but extraction can still be CPU- and memory-intensive. Enforce container and proxy resource limits.
- **Language:** The default `all-MiniLM-L6-v2` embedding model performs best on English-language text.
- **Tables and complex layouts:** PDF extraction returns text and may not preserve tabular structure.
- **No streaming:** Answers are returned after full generation.
- **No account export or self-service account deletion:** Users can delete documents and conversations, but account administration remains an operator task.
- **Provider processing:** Relevant excerpts and questions are sent to the configured LLM provider. Provider retention and training terms apply; see [PRIVACY.md](PRIVACY.md).
- **No malware scanning:** Uploaded files are checked for extension/signature and size, but are not scanned by an antivirus engine.

## Deployment limits

- The supplied production Compose setup targets one host and uses local filesystem storage plus embedded Chroma.
- Rate limits are process-local and quota checks may race for simultaneous uploads. Use shared controls and atomic reservations before running multiple replicas.
- Backups, restore tests, TLS termination, monitoring, log retention, secret rotation, and an external audit trail are operator responsibilities.
- Browser-level Playwright tests are not currently included. The release checklist includes a manual end-to-end smoke flow.

See [SECURITY.md](SECURITY.md) and [DEPLOYMENT.md](DEPLOYMENT.md) for implementation and operational details.

## Out of scope for the initial release

- Multimodal understanding of images and charts
- Audio and video processing
- Real-time collaboration
- Model fine-tuning or training
- Enterprise SSO/SAML
- Kubernetes-native deployment
- GraphQL API
