# Phase 07: Evaluation & Observability

## Goal

Make retrieval and answer behavior measurable and give operators basic request-level visibility without logging user content.

## Acceptance criteria

- [x] A JSONL evaluation runner calls the authenticated chat endpoint and produces a machine-readable report.
- [x] Per-example results include answer coverage, abstention correctness, citation checks, retrieval metadata, and request latency.
- [x] Aggregate report includes answer coverage, abstention accuracy, expected chunk hit proxy, citation correctness, and mean/p50/p95 latency.
- [x] A usable sample dataset exists without fake UUIDs; document scope can be supplied per example or on the command line.
- [x] HTTP request counts and latency are available by method, route template, and status code.
- [x] Existing request IDs and structured production logs are documented for diagnosis.
- [x] Evaluation and observability limitations are stated clearly.

## Implementation

See [evaluation/README.md](../../evaluation/README.md) for dataset format, execution, metric definitions, and operational notes. Run the evaluator from the repository root using `evaluation/scripts/run_evaluation.py`. The authenticated in-process `/metrics` snapshot resets on restart; use an external monitoring system for persistent production telemetry.

The chat endpoint currently does not expose ranked retrieval candidates, so expected chunk hit is a citation-snippet proxy and MRR/ranked Hit@k are outside this phase. Faithfulness requires human review.

## Exit criteria

All acceptance criteria above are implemented and the evaluation runner and metrics endpoint are ready for use. Evaluation quality scores depend on a user-provided dataset and ingested documents; no universal quality threshold is asserted here.
