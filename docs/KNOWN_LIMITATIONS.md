# Known Limitations

This document honestly records the current limitations of DocuMind and the planned resolutions. It is updated as phases are completed.

---

## Phase 00 — Foundation (Current)

| Limitation | Severity | Planned Resolution |
|---|---|---|
| No document ingestion yet | Expected | Phase 01 |
| No RAG pipeline yet | Expected | Phases 02–03 |
| No conversation persistence yet | Expected | Phase 04 |
| Authentication is scaffolded but not fully hardened | Medium | Phase 08 |
| No rate limiting | Medium | Phase 08 |
| No upload quota per user | Medium | Phase 08 |
| No malware scanning on uploads | Low (dev) | Pre-production checklist |
| LLM provider is mock only | Expected | Phase 03 |
| Embeddings are mock only | Expected | Phase 02 |
| No background job queue | Expected | Phase 08 if needed |
| No OCR support for scanned PDFs | Low | Future |
| Chroma is not production-hardened | Expected | Phase 08 |
| Frontend is scaffold only | Expected | Phases 01–09 |

---

## General Limitations

- **Scanned PDFs:** DocuMind extracts text from PDFs using PyMuPDF. Image-only PDFs without an embedded text layer will produce empty or near-empty extractions. OCR is not currently implemented.
- **Large documents:** Very large documents (hundreds of pages) may have longer ingestion times. Background processing is used to avoid HTTP timeouts, but extremely large files may hit resource limits.
- **Embedding model language:** The default `all-MiniLM-L6-v2` model performs best on English-language text. Multi-language support requires a different model.
- **Context window limits:** The LLM's context window limits how many chunks can be sent per query. Chunks exceeding the window are dropped from the context.
- **Table extraction:** Tabular data in PDFs is extracted as raw text. Complex layouts may not preserve table structure faithfully.
- **Chroma scalability:** Chroma in embedded mode is suitable for development and small-scale production. Large multi-user deployments may require migration to a dedicated vector database.
- **No real-time streaming:** Answers are returned as complete responses. Streaming generation is not implemented in the current version.
- **Privacy:** Document excerpts are sent to the configured LLM provider's API. Users should be informed of which provider processes their data. See [PRIVACY.md](PRIVACY.md).

---

## Out of Scope (Initial Release)

- Multimodal document understanding (images, charts)
- Audio/video document processing
- Real-time collaborative editing
- Fine-tuning or model training on user data
- Enterprise SSO / SAML authentication
- Kubernetes-native deployment
- GraphQL API

These items are tracked for potential future development.
