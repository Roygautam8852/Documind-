# User Guide

## Create an account and sign in

Register with an email address and a password of at least eight characters, then sign in. Your session token is kept in browser session storage and cleared when you sign out or the API rejects it.

## Upload documents

Open **Documents** or use **Upload document** on the dashboard. Upload a PDF, DOCX, or UTF-8 TXT file within the configured upload size and account quotas. The library shows ingestion status; wait for **Ready** before querying or summarizing. Failed files can be retried when the action is available.

## Ask questions and inspect sources

Open **Chat**, ask a question, and optionally select a document to scope retrieval. Answers include source markers. Select a citation to inspect its source excerpt and page metadata. When the indexed evidence is insufficient, DocuMind responds with an abstention instead of a cited answer.

## Summarize, compare, and manage data

Use the document actions to request a structured summary. Select two or more ready documents to compare them. You can delete documents and conversations from their respective views. Deleting a document removes its metadata and attempts to remove its stored file and vectors.

## Data processing

Retrieved excerpts and questions are sent to the service's configured LLM provider. Read [PRIVACY.md](PRIVACY.md) and the provider's terms before uploading sensitive information.
