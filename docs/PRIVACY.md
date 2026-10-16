# Privacy and Data Handling

DocuMind stores account information, uploaded files, extracted text chunks, and conversation messages so it can provide document search and cited answers.

## Data flow

- Uploaded files are stored in the configured upload directory (or the configured persistent volume in the supplied production Compose setup).
- Text is extracted and indexed in the configured vector store. Conversation questions, generated answers, citations, and retrieval metadata are stored in the relational database.
- When a user asks a question, relevant retrieved excerpts and the question are sent to the configured LLM provider. The provider's processing, retention, and training policies apply to that data; operators must disclose the selected provider and applicable terms.
- Application logs are designed to avoid passwords, API keys, raw document text, and upload filenames. Operators remain responsible for log access and retention.

## User controls and limits

Users can delete documents and conversations through the application. Operators should verify file and vector cleanup as part of their deployment checks and maintain backups according to their retention policy. Account deletion and self-service export are not currently provided.

This project does not make a blanket claim that external providers never retain or train on submitted data. Review the selected provider's current terms before processing confidential or regulated documents. See [SECURITY.md](SECURITY.md) for controls and known deployment limits.
