# RAG Evaluation

This directory contains JSONL evaluation datasets and a runner for measuring DocuMind retrieval and answer quality against a running API.

## Dataset format

Each line is a JSON object. `document_id` or `document_ids` can scope an example; omit them to query all ready documents owned by the token's user. `expected_answer_contains` checks literal answer coverage. `expected_chunk_contains` checks whether any citation snippet contains the expected text. `should_abstain` marks questions that must be answered without citations when the evidence is absent.

```json
{"id":"q001","question":"What are the key findings?","document_id":"document-uuid","expected_answer_contains":["finding one"],"expected_chunk_contains":"finding one","should_abstain":false,"tags":["factual"]}
```

## Metrics

| Metric | Meaning |
|---|---|
| Expected answer coverage | Fraction of examples with all configured expected strings in the answer |
| Expected chunk hit rate | Fraction of labeled examples where a citation snippet contains the expected chunk text; this is a proxy, not ranked Hit@k |
| Citation correctness | Citations include document and chunk IDs; the API validates mappings before returning them |
| Abstention accuracy | For abstention examples, the answer abstains without citations |
| Latency | Mean, p50, and p95 end-to-end API response time in milliseconds |

The API does not expose the full ranked candidate list, so the runner cannot calculate MRR or ranked Hit@k. Faithfulness and prompt-injection behavior need human review.

## Run evaluation

Start the backend, create/obtain a JWT for a user with ready documents, then run:

```bash
python evaluation/scripts/run_evaluation.py --dataset evaluation/datasets/sample_questions.jsonl --api-url http://localhost:8000 --token "$TOKEN" --document-id <document-uuid> --output evaluation/reports/
```

Repeat `--document-id` to query multiple documents. Dataset-level `document_id(s)` overrides the CLI default. The report is written as timestamped JSON with per-example results and aggregate metrics. API failures are recorded and cause a nonzero exit status. The sample dataset omits document IDs, so pass IDs or ensure the user has suitable ready documents.

## Observability

- `X-Request-ID` is returned for each response and can be supplied by the caller.
- Production logs use JSON lines; development logs use readable text. Secrets, document contents, and personal data must not be logged.
- Authenticated `GET /metrics` returns process-local HTTP request counts and mean/max latency grouped by method, route template, and status. Data resets on restart and is intended for diagnostics, not durable monitoring.
- `GET /health` reports liveness; `GET /api/v1/ready` reports database readiness.

## Status

The API evaluation runner, sample dataset, HTTP request metrics, and operational documentation are implemented in Phase 07.
