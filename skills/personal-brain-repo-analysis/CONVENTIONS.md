# Personal Brain repo-analysis conventions

Read this file for scoring, feedback, and completion rules used by
`personal-brain-repo-analysis`. Repository-wide editing and concurrency rules remain in the
Personal Brain's `CLAUDE.md`.

## Bands

| Score | Band |
|---:|---|
| 80–100 | Excellent |
| 60–79 | Healthy |
| 40–59 | Needs Work |
| 0–39 | Critical |

Use the average of the six summary dimensions for `quality_score`. Discovery is
the default lens. `personal_fit_score`, fit classification, and adoption verdict
are optional fields produced only for an explicitly requested adoption lens.

## Feedback

Before routing, ask what worked and what should change next time. Store the
answer in the repository state file. On resume or re-analysis, show recorded
feedback before proceeding and record that it was shown.

## Completion

Analysis is complete when its selected branch artifacts exist, the schema
validates, and unexplored evidence is recorded as deferred. Tags and extraction
tracking are optional downstream work. A missing optional tool is recorded in
the Engineer View; it does not silently remove the dimension.
