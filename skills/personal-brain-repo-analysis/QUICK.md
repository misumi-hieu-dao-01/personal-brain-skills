# Quick branch

Use this branch only for `--depth=quick`. Stop after 30 seconds of active work.

1. Validate the target, home-repo guard, authentication, prior state, and output
   root. Start the state file with a 30-second budget.
2. Fetch repository metadata and the first 200 README lines. Use remaining time
   for health metadata; do not wait beyond the budget for unavailable API data.
3. Classify the repo type and write a short Creator View covering the central
   idea, 1–3 promising ideas, and visible weaknesses. Label conclusions based
   only on metadata or README as preliminary.
4. Write `analysis.json`, `summary.md`, `creator-view.md`, and `findings.jsonl`.
   Missing optional dimensions are recorded as unavailable, not retried beyond
   one attempt.
5. Validate `analysis.json`, update state, and present the triage result.

Quick is complete when all four artifacts are non-empty, the schema validates,
the analyzed revision is recorded, and the user can decide whether Standard is
worth running.
