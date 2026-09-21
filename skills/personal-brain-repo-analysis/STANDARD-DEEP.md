# Standard and Deep branches

Standard has 15 minutes and may inspect 20 internal artifacts plus 50 embedded
content items. Deep has 30 minutes and may inspect 50 internal artifacts plus
100 content items. User-wait time does not count. Check the remaining budget
before each numbered step; when exhausted, gather no new evidence and finish
from what is already collected.

1. **Validate.** Resolve the target, prior state, output root, authentication,
   fork/archive status, size guard, and analyzed commit. Replay prior feedback.
   For a repository over either size limit, stop here until the user explicitly
   approves that known size; the original analysis request is not approval.
   Start or resume `.claude/state/repo-analysis.<slug>.state.json`.

2. **Prepare evidence.** Reuse a matching local clone. If none exists, make a
   blobless shallow clone in `/tmp`, preferring
   `git clone --filter=blob:none --depth=1 git@github.com:OWNER/REPO.git` through
   the forwarded SSH agent. Do not stop merely because `gh` is absent. Record
   the full commit and write its tracked tree with `git -c core.quotePath=true
   ls-tree -r -l --full-tree <commit> > <output-root>/inventory.txt`; verify the
   inventory is non-empty. Deep may fetch up to one year of history after
   cloning.

3. **Inventory.** Use `inventory.txt` to identify architecture entry
   points, distinctive implementation, guides, examples, notebooks, internal
   instructions, methodology docs, and external references. Write
   `deep-read.md` with the inventory and selected evidence. Mark everything
   beyond the branch cap as deferred.

4. **Inspect.** Read the highest-signal items first. Assess architecture,
   security, tests, documentation, maintainability, process, and reliability
   only deeply enough to evidence strengths and weaknesses. For dimension and
   scoring definitions, read `REFERENCE.md` §§1, 4, and 5. Write evidence as it
   is found to `findings.jsonl`.

5. **Deep history, Deep only.** Within the same 30-minute budget, examine the
   last 12 months for velocity, contributor concentration, and churn hotspots.
   Write `history.jsonl`. Standard skips this step.

6. **Evaluate embedded content.** Rank docs, examples, papers, linked repos,
   datasets, and curated-list entries by novelty and explanatory value. Stop at
   the branch cap. Write `content-eval.jsonl`, or `mined-links.jsonl` for a
   curated list. Read `REFERENCE.md` §15.4 only for type-specific handling.

7. **Synthesize.** Write `creator-view.md` using the contract in `SKILL.md`.
   Write `summary.md` with the six engineering-health bands plus the critical
   floor. Extract the ranked, reusable knowledge handoff into `value-map.json`
   using `REFERENCE.md` §3.3. Every candidate must explain its mechanism,
   value, limits, confidence, and point to finding IDs. Do not force a candidate;
   record a specific `no_candidates_reason` when none survives review. Produce
   adoption scoring only when explicitly requested.

8. **Finalize.** Write `analysis.json`; read `REFERENCE.md` §3.1 for its schema.
   Inventory unexplored evidence once and record it in `coverage-audit.jsonl`.
   Do not reopen analysis. Run `node scripts/lib/analysis-schema.mjs
   <output-root>/analysis.json` and, for Standard or Deep, `node
   scripts/lib/value-map-schema.mjs <output-root>/value-map.json`; also verify
   every candidate evidence ID exists in `findings.jsonl`. Any failure leaves
   state non-complete. Update the canonical state file only after every check
   passes.

Required Standard artifacts: shared outputs, `inventory.txt`, `value-map.json`,
`deep-read.md`, `content-eval.jsonl` or `mined-links.jsonl`, and
`coverage-audit.jsonl`. Deep additionally requires `history.jsonl`.

The worker is finished when all artifacts are written and locally validated.
The analysis passes only after the coordinator's deterministic gate verifies
their schemas and links, followed by independent semantic review. A finished
worker is not a completed analysis.
