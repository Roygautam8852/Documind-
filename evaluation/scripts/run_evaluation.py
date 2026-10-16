"""Run a JSONL question set against the DocuMind chat API and write a JSON report."""

from __future__ import annotations

import argparse
import json
import math
import statistics
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def percentile(values: list[float], fraction: float) -> float | None:
    """Return the nearest-rank percentile, or None for an empty sample."""
    if not values:
        return None
    ordered = sorted(values)
    return ordered[max(0, math.ceil(fraction * len(ordered)) - 1)]


def load_dataset(path: Path) -> list[dict[str, Any]]:
    examples = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}:{line_number}: invalid JSON: {exc.msg}") from exc
        if not isinstance(row, dict) or not row.get("question"):
            raise ValueError(f"{path}:{line_number}: each entry needs a question")
        examples.append(row)
    if not examples:
        raise ValueError(f"{path}: dataset contains no examples")
    return examples


def call_api(api_url: str, token: str, question: str, document_ids: list[str] | None) -> tuple[dict[str, Any], float]:
    payload: dict[str, Any] = {"question": question}
    if document_ids:
        payload["document_ids"] = document_ids
    request = Request(
        f"{api_url.rstrip('/')}/api/v1/chat/query",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    started = time.perf_counter()
    try:
        with urlopen(request, timeout=120) as response:
            body = json.loads(response.read())
    except (HTTPError, URLError, TimeoutError) as exc:
        detail = exc.read().decode("utf-8", errors="replace") if isinstance(exc, HTTPError) else str(exc)
        raise RuntimeError(f"chat API request failed: {detail}") from exc
    return body, (time.perf_counter() - started) * 1000


def evaluate_one(row: dict[str, Any], answer: dict[str, Any], latency_ms: float) -> dict[str, Any]:
    text = str(answer.get("answer", ""))
    lowered = text.casefold()
    citations = answer.get("citations") or []
    expected = row.get("expected_answer_contains", [])
    if isinstance(expected, str):
        expected = [expected]
    expected_ok = [str(value).casefold() in lowered for value in expected]
    should_abstain = bool(row.get("should_abstain", False))
    abstained = not citations and (
        "do not contain sufficient information" in lowered
        or "cannot answer" in lowered
        or "don't have enough" in lowered
        or "unable to" in lowered
    )
    expected_chunk = row.get("expected_chunk_contains")
    chunk_hit = None if not expected_chunk else any(str(expected_chunk).casefold() in str(c.get("snippet", "")).casefold() for c in citations)
    return {
        "id": row.get("id"),
        "tags": row.get("tags", []),
        "latency_ms": round(latency_ms, 2),
        "answer_contains_all_expected": all(expected_ok) if expected_ok else None,
        "answer_contains_each_expected": expected_ok,
        "abstention_expected": should_abstain,
        "abstained": abstained,
        "abstention_correct": abstained == should_abstain if should_abstain else None,
        "expected_chunk_hit": chunk_hit,
        "citation_correctness": all(c.get("document_id") and c.get("chunk_id") for c in citations) if citations else None,
        "citation_count": len(citations),
        "retrieval": answer.get("retrieval", {}),
        "request_id": answer.get("request_id"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--api-url", default="http://localhost:8000")
    parser.add_argument("--token", required=True, help="JWT access token for a user with access to the dataset documents")
    parser.add_argument("--document-id", action="append", default=[], help="Default document UUID; may be repeated")
    parser.add_argument("--output", type=Path, default=Path("reports"), help="Output directory or .json report path")
    args = parser.parse_args()

    try:
        dataset = load_dataset(args.dataset)
        results = []
        for row in dataset:
            doc_ids = row.get("document_ids") or ([row["document_id"]] if row.get("document_id") else args.document_id)
            try:
                response, elapsed = call_api(args.api_url, args.token, row["question"], doc_ids or None)
                results.append(evaluate_one(row, response, elapsed))
            except RuntimeError as exc:
                results.append({"id": row.get("id"), "error": str(exc)})
                print(f"{row.get('id', '?')}: ERROR {exc}", file=sys.stderr)

        successful = [r for r in results if "error" not in r]
        latencies = [r["latency_ms"] for r in successful]
        def rate(key: str) -> float | None:
            values = [r[key] for r in successful if r.get(key) is not None]
            return sum(values) / len(values) if values else None

        report = {
            "dataset": str(args.dataset), "api_url": args.api_url,
            "total": len(results), "succeeded": len(successful), "failed": len(results) - len(successful),
            "metrics": {
                "answer_contains_all_expected_rate": rate("answer_contains_all_expected"),
                "abstention_accuracy": rate("abstention_correct"),
                "expected_chunk_hit_rate": rate("expected_chunk_hit"),
                "citation_correctness_rate": rate("citation_correctness"),
                "latency_mean_ms": round(statistics.mean(latencies), 2) if latencies else None,
                "latency_p50_ms": round(percentile(latencies, 0.50), 2) if latencies else None,
                "latency_p95_ms": round(percentile(latencies, 0.95), 2) if latencies else None,
            },
            "results": results,
        }
        output_path = args.output if args.output.suffix.lower() == ".json" else args.output / f"evaluation-{time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())}.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"report": str(output_path), "total": report["total"], "succeeded": report["succeeded"], "failed": report["failed"], "metrics": report["metrics"]}, indent=2))
        return 1 if report["failed"] else 0
    except (OSError, ValueError) as exc:
        print(f"evaluation failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
