# RAG Evaluation

This directory contains evaluation datasets and tooling for measuring DocuMind's retrieval and answer quality.

## Structure

```
evaluation/
├── datasets/
│   └── sample_questions.jsonl    # Labelled Q&A pairs for evaluation
├── scripts/
│   └── run_evaluation.py         # Evaluation runner
└── reports/                      # Generated metric reports (gitignored)
```

## Evaluation Metrics

| Metric | Description |
|---|---|
| Hit@k | Was the gold-standard chunk in the top-k retrieved? |
| MRR | Mean Reciprocal Rank of the correct chunk |
| Citation Correctness | Do all returned citations map to retrieved chunks? |
| Abstention Quality | Does the system abstain when evidence is absent? |
| Answer Faithfulness | Does the answer contradict the retrieved evidence? |
| Latency (p50/p95) | Query processing time in milliseconds |

## Dataset Format (JSONL)

Each line in `datasets/sample_questions.jsonl` is a JSON object:

```json
{
  "id": "q001",
  "question": "What are the key findings?",
  "document_id": "test-doc-uuid",
  "expected_answer_contains": ["finding one", "finding two"],
  "expected_chunk_contains": "finding one",
  "should_abstain": false,
  "tags": ["factual", "single-document"]
}
```

For abstention tests:
```json
{
  "id": "q002",
  "question": "What is the population of Mars?",
  "document_id": "test-doc-uuid",
  "should_abstain": true,
  "tags": ["abstention"]
}
```

## Running Evaluation

Evaluation requires a running backend with ingested test documents.

```bash
cd evaluation
python scripts/run_evaluation.py --dataset datasets/sample_questions.jsonl --output reports/
```

## Status

Evaluation tooling is scaffolded in Phase 00. The runner and dataset are populated in Phase 07.
