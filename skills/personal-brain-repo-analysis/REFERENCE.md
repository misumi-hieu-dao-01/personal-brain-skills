<!-- prettier-ignore-start -->
**Document Version:** 4.3
**Last Updated:** 2026-09-08
**Status:** ACTIVE
<!-- prettier-ignore-end -->

# Repo Analysis Reference

Dimension catalog, tool stack, output schemas, repo type classification, absence
pattern definitions, temporal fingerprint specification, scoring bands,
discovery-first Creator View specification, bounded link mining, cross-repo
awareness, and guard rail rules for the repo-analysis skill.

---

## 1. Analysis Dimensions Catalog

Organized by the depth tier in which each dimension first becomes available.
Signal and Automation ratings are on a 1-5 scale.

### 1.1 Quick Scan Dimensions (API-only, 18 dimensions)

| #     | Dimension                               | Signal | Auto | Source                           |
| ----- | --------------------------------------- | ------ | ---- | -------------------------------- |
| QS-01 | Project activity and recency            | 5/5    | 5/5  | `pushed_at` + workflow runs      |
| QS-02 | Stars/forks/engagement trajectory       | 3/5    | 4/5  | Stargazers API (with timestamps) |
| QS-03 | Archived/abandoned status               | 5/5    | 5/5  | REST metadata `archived` field   |
| QS-04 | License type and presence               | 4/5    | 5/5  | REST metadata + community health |
| QS-05 | CI/CD presence and pass rate            | 5/5    | 5/5  | Workflow list + last N runs      |
| QS-06 | Branch protection rules                 | 5/5    | 5/5  | GraphQL `branchProtectionRules`  |
| QS-07 | Dependabot alert count + severity       | 5/5    | 5/5  | REST dependabot/alerts           |
| QS-08 | Code scanning alerts (CodeQL)           | 5/5    | 5/5  | REST code-scanning/alerts        |
| QS-09 | Secret scanning alerts                  | 5/5    | 5/5  | REST secret-scanning/alerts      |
| QS-10 | Community health completeness           | 4/5    | 5/5  | REST community/profile (0-100)   |
| QS-11 | CONTRIBUTING/SECURITY file presence     | 4/5    | 5/5  | Community profile response       |
| QS-12 | Contributor count (bus factor proxy)    | 5/5    | 5/5  | REST contributors endpoint       |
| QS-13 | Merge hygiene settings                  | 3/5    | 5/5  | REST metadata merge flags        |
| QS-14 | OpenSSF 16-check security score         | 5/5    | 5/5  | `api.securityscorecards.dev`     |
| QS-15 | Dependency SBOM (direct + transitive)   | 4/5    | 5/5  | REST dependency-graph/sbom       |
| QS-16 | Known CVEs via deps.dev                 | 5/5    | 5/5  | `api.deps.dev` (no auth)         |
| QS-17 | Fork-to-star ratio (adoption signal)    | 4/5    | 5/5  | Computed from metadata           |
| QS-18 | Watcher-to-star ratio (operational use) | 3/5    | 5/5  | Computed from metadata           |

**API batch structure for Quick Scan:**

- **Batch A (GitHub REST/GraphQL):** repo metadata, community/profile,
  dependabot/alerts, code-scanning/alerts, secret-scanning/alerts,
  actions/workflow-runs (last 10), contributors (top 500),
  dependency-graph/sbom, GraphQL branchProtectionRules + securityAndAnalysis
- **Batch B (OpenSSF):**
  `GET api.securityscorecards.dev/projects/github.com/{owner}/{repo}` (404 = not
  indexed, continue gracefully)
- **Batch C (deps.dev):**
  `GET api.deps.dev/v3alpha/systems/{ecosystem}/packages/{name}` for primary
  manifest dependencies (no auth required)

All three batches run in parallel.

### 1.2 Standard Mode Dimensions (requires clone, 15 dimensions)

Domain-based dimensions reflecting what the analysis actually measures. Tools
listed in the Source column feed the dimension but are not the dimension itself.

| #     | Dimension                           | Signal | Auto | Source                                           |
| ----- | ----------------------------------- | ------ | ---- | ------------------------------------------------ |
| ST-01 | Subprocess/execution safety         | 5/5    | 4/5  | `grep` shell=True/os.system + `semgrep` rules    |
| ST-02 | Test coverage and quality           | 5/5    | 4/5  | Test file ratio, framework detection, test count |
| ST-03 | Test CI enforcement                 | 5/5    | 5/5  | Workflow analysis, test commands in CI steps     |
| ST-04 | Code structure consistency          | 4/5    | 4/5  | Directory layout analysis, naming conventions    |
| ST-05 | Code reuse patterns                 | 4/5    | 3/5  | Shared library detection, copy-paste analysis    |
| ST-06 | Plugin/extension architecture       | 4/5    | 3/5  | Plugin configs, marketplace files, entry points  |
| ST-07 | Credential handling                 | 5/5    | 4/5  | `gitleaks` + env var / config file pattern scan  |
| ST-08 | Path safety                         | 5/5    | 4/5  | Path construction patterns, traversal guards     |
| ST-09 | Type safety and static analysis     | 4/5    | 5/5  | `mypy`/`pyright`/`tsc` config, type hint density |
| ST-10 | Dependency isolation                | 4/5    | 4/5  | Manifest analysis, shared vs isolated deps       |
| ST-11 | Error handling quality              | 4/5    | 4/5  | `semgrep` rules + manual pattern inspection      |
| ST-12 | Registry/catalog quality            | 3/5    | 4/5  | Registry file parsing, entry completeness        |
| ST-13 | Methodology documentation           | 4/5    | 3/5  | SOP docs, contributing guides, architecture docs |
| ST-14 | Scaffolding/generation tooling      | 3/5    | 3/5  | Template detection, generator scripts            |
| ST-15 | Monorepo/multi-project coordination | 4/5    | 4/5  | Monorepo markers, shared CI, cross-project gates |

**Absence pattern classification** runs across all dimensions as a cross-cutting
concern (see Section 5), not as a single dimension.

**Tool mapping appendix:** The original tool-based dimension catalog (v1.0) is
preserved below for reference. These tools remain available as data sources that
feed the domain-based dimensions above.

<details>
<summary>v1.0 Tool-Based Dimension Mapping (archived)</summary>

| Tool                     | Feeds Dimension(s)    | When Used                        |
| ------------------------ | --------------------- | -------------------------------- |
| `lizard`                 | ST-04 (structure)     | Complexity metrics               |
| `jscpd`                  | ST-05 (code reuse)    | Duplication detection            |
| `scc`                    | ST-04 (structure)     | LOC counting, cost estimation    |
| `knip` / `vulture`       | ST-05 (code reuse)    | Dead code detection              |
| `dependency-cruiser`     | ST-10 (dep isolation) | JS/TS dependency graph           |
| `semgrep`                | ST-01, ST-08, ST-11   | SAST, path safety, error quality |
| `gitleaks`               | ST-07 (credentials)   | Secret detection                 |
| `mypy` / `type-coverage` | ST-09 (type safety)   | Type checking                    |

</details>

### 1.3 Whole-Repo Adoption Dimensions (6 dimensions, opt-in)

Evaluates whether to adopt the repository as a whole. Compute these only when
the user explicitly requests `--lens=adoption`; they are not part of the
discovery-first default because fit and recommendations become stale.

| #     | Dimension              | Signal | Auto | Source                                                                 |
| ----- | ---------------------- | ------ | ---- | ---------------------------------------------------------------------- |
| WR-01 | Stack compatibility    | 5/5    | 4/5  | Language match, framework overlap, OS support, install method          |
| WR-02 | Integration complexity | 5/5    | 3/5  | Plugin system, config requirements, API surface, migration path        |
| WR-03 | Maintenance burden     | 5/5    | 4/5  | Update frequency, breaking change history, dep chain depth             |
| WR-04 | Lock-in risk           | 5/5    | 3/5  | Proprietary formats, vendor lock-in, data portability, alternatives    |
| WR-05 | Value-to-cost ratio    | 5/5    | 2/5  | Unique value vs DIY effort, community support, commercial alternatives |
| WR-06 | Ecosystem maturity     | 4/5    | 4/5  | Age, stability signals, enterprise adoption, doc completeness          |

**Quick Scan partial assessment:** WR-01 (from language/framework metadata),
WR-04 (from license + alternatives search), WR-06 (from age, stars, contributor
diversity). Other dimensions require clone.

**Adoption verdict bands:**

| Band    | Score  | Interpretation                                           |
| ------- | ------ | -------------------------------------------------------- |
| Adopt   | 75-100 | Integrate as-is, benefits clearly outweigh costs         |
| Trial   | 55-74  | Worth a proof-of-concept, some concerns to address first |
| Extract | 30-54  | Don't adopt whole — cherry-pick valuable parts instead   |
| Avoid   | 0-29   | Costs outweigh benefits, build or find alternatives      |

### 1.4 Deep Mode Dimensions (requires 12-month history, 12 dimensions)

| #     | Dimension                                 | Signal | Auto | Tool                                     |
| ----- | ----------------------------------------- | ------ | ---- | ---------------------------------------- |
| DP-01 | Code churn hotspots                       | 5/5    | 4/5  | `git log --numstat`                      |
| DP-02 | Temporal coupling (co-change pairs)       | 5/5    | 3/5  | `git log` + frequency analysis           |
| DP-03 | Contributor health (bus factor trend)     | 5/5    | 5/5  | `git shortlog` + 6-month window          |
| DP-04 | Commit velocity trend (sparkline)         | 5/5    | 5/5  | `git log` monthly aggregation            |
| DP-05 | Test-to-code file ratio trajectory        | 4/5    | 4/5  | `git ls-files` + quarterly comparison    |
| DP-06 | Dependency file touch frequency           | 4/5    | 5/5  | `git log --follow` on manifest files     |
| DP-07 | Secrets in history                        | 5/5    | 5/5  | `trufflehog git <url>` (no clone needed) |
| DP-08 | PR merge time and review velocity         | 5/5    | 4/5  | GitHub API pulls history                 |
| DP-09 | Issue response time                       | 5/5    | 4/5  | GitHub API issues history                |
| DP-10 | Dependency biography (migration history)  | 4/5    | 3/5  | `git log --follow -p -- package.json`    |
| DP-11 | Organizational contributor diversity      | 4/5    | 3/5  | Email-to-org heuristics                  |
| DP-12 | DORA proxy metrics (lead time, frequency) | 4/5    | 4/5  | GitHub Actions + PR data                 |

---

## 2. Tool Stack

### Tier 1 -- Core (install always for Standard/Deep)

| Tool              | Version | License     | Purpose                          | Selection rationale                                |
| ----------------- | ------- | ----------- | -------------------------------- | -------------------------------------------------- |
| `scc`             | latest  | MIT         | LOC counting, COCOMO/LOCOMO cost | Fastest; 322 languages; LLM cost via `--locomo`    |
| `semgrep`         | CE      | LGPL engine | SAST, pattern detection          | 30+ languages; 3,000+ rules; 10s typical scan      |
| `lizard`          | 1.21.3+ | MIT         | Cyclomatic complexity            | 26 languages; `#lizard forgives` suppression       |
| `jscpd`           | latest  | MIT         | Code duplication detection       | 150+ languages; Rabin-Karp; SARIF output           |
| `gitleaks`        | v8.28+  | MIT         | Secrets in current code          | 150+ types; SARIF; fast regex                      |
| `git-quick-stats` | latest  | MIT         | Temporal signal extraction       | Zero dependencies; `--json-output`; date filtering |

### Tier 2 -- Language-Conditional (install when detected)

| Trigger         | Tool                      | Purpose                                                           |
| --------------- | ------------------------- | ----------------------------------------------------------------- |
| JS/TS detected  | `knip` v6+                | Dead code, unused exports, orphaned types                         |
| JS/TS detected  | `dependency-cruiser` v17+ | Module dependencies, circular detection, DOT/Mermaid output       |
| JS/TS detected  | `eslint` v9+              | Linting; `lintText()` API for pre-clone analysis                  |
| Python detected | `vulture` v2.16+          | Dead code with confidence percentages                             |
| Python detected | `ruff`                    | Fast linting (replaces pylint for speed)                          |
| Go detected     | `golangci-lint` v2+       | Aggregated linting; use `--output.json.path` (NOT `--out-format`) |
| Multi-language  | `ast-grep` 0.42+          | Pattern-based structural search; 30 languages; Rust speed         |

### Tier 3 -- Optional / Deep Mode Only

| Tool             | Purpose                                    | When                                 |
| ---------------- | ------------------------------------------ | ------------------------------------ |
| `trufflehog`     | Secrets in git history (API-only mode)     | Deep mode DP-07                      |
| `osv-scanner` v2 | SCA with guided remediation                | When deep dependency audit requested |
| `ts-morph`       | TypeScript-specific dead code + type infer | TS repos needing deep type analysis  |
| `code-maat`      | Temporal coupling extraction (CSV)         | When DP-02 analysis requested        |

### Tools to Avoid

| Tool                     | Reason                                                         |
| ------------------------ | -------------------------------------------------------------- |
| `trivy` v0.69.4--v0.69.6 | Supply chain attack (CVE-2026-33634); safe: v0.69.3 or earlier |
| `plato`                  | Abandoned 2014                                                 |
| `ts-prune`               | Archived Sep 2025; replaced by Knip                            |
| `unimported`             | Archived Mar 2024; replaced by Knip                            |
| `MegaLinter` as default  | AGPL-3.0; high maintenance cost; Docker overhead               |

---

## 3. Output Schemas

Primary artifacts are written to
`<repo-research>/repos/<owner>--<repo>/runs/<YYYY-MM-DD>--<short-commit>/`.
Structured artifacts carry their own schema version. Re-scan is the migration
path for old formats; never rewrite historical analysis implicitly.

### 3.1 `analysis.json`

Top-level analysis result. Consumed by `/deep-plan` as research context, by
`/recall` for search indexing, and by the Compare resume option.

**Validates with:**
`node <skill-dir>/validate.mjs analysis <analysis.json>`.

```json
{
  "id": "UUID",
  "schema_version": "3.0",
  "source_type": "repo",
  "source": "OWNER/REPO",
  "slug": "repo-slug",
  "title": "Repository Name",
  "analyzed_at": "ISO8601",
  "depth": "quick|standard|deep",
  "tags": ["repo", "extraction", "architecture"],
  "scoring": {
    "quality_band": "Healthy",
    "quality_score": 72
  },
  "summary": "2-3 sentence summary of what this source is and what was learned.",
  "creator_view": "Full Creator View prose (from creator-view.md content)",
  "candidates": [
    {
      "id": "stable-candidate-id",
      "name": "Candidate Name",
      "kind": "pattern|knowledge|content|anti-pattern"
    }
  ],
  "last_synthesized_at": null,

  "metadata": {
    "url": "https://github.com/OWNER/REPO",
    "scan_version": "4.3",
    "clone_dir": "/tmp/repo-analysis-<slug>/",
    "files_cloned": 796,
    "stars": 27518,
    "language": "Python",
    "license": "Apache-2.0",
    "created_at": "ISO8601",
    "pushed_at": "ISO8601",
    "age_days": 26,
    "size_kb": 22982,
    "forks": 2569,
    "open_issues": 73,
    "contributors": 44,
    "is_fork": false,
    "is_archived": false,
    "languages": { "Python": 4772855, "JavaScript": 31014 }
  },
  "repo_type": "library|application|curated-list|registry|documentation-hub|monorepo",
  "repo_type_secondary": "string|null",
  "dimensions": {
    "QS-01_activity_pulse": {
      "score": 95,
      "band": "Excellent",
      "detail": "..."
    },
    "ST-01_subprocess_safety": {
      "score": 88,
      "band": "Excellent",
      "detail": "..."
    }
  },
  "summary_bands": {
    "Security": { "score": 58, "band": "Needs Work" },
    "Reliability": { "score": 70, "band": "Healthy" },
    "Maintainability": { "score": 76, "band": "Healthy" },
    "Documentation": { "score": 82, "band": "Excellent" },
    "Process": { "score": 48, "band": "Needs Work" },
    "Velocity": { "score": 95, "band": "Excellent" }
  },
  "absence_patterns": [
    { "pattern": "SECURITY_FACADE", "confidence": "Medium", "evidence": "..." }
  ],
  "adoption_assessment": {
    "optional": "present only when --lens=adoption was requested",
    "verdict": "Trial|Adopt|Extract|Avoid",
    "verdict_score": 62,
    "dimensions": {
      "WR-01_stack_compatibility": {
        "score": 75,
        "band": "Healthy",
        "detail": "..."
      },
      "WR-02_integration_complexity": {
        "score": 60,
        "band": "Healthy",
        "detail": "..."
      },
      "WR-03_maintenance_burden": {
        "score": 55,
        "band": "Needs Work",
        "detail": "..."
      },
      "WR-04_lock_in_risk": {
        "score": 80,
        "band": "Excellent",
        "detail": "..."
      },
      "WR-05_value_to_cost": {
        "score": 50,
        "band": "Needs Work",
        "detail": "..."
      },
      "WR-06_ecosystem_maturity": {
        "score": 45,
        "band": "Needs Work",
        "detail": "..."
      }
    },
    "recommendation": "One-sentence adoption recommendation"
  }
}
```

**Field definitions:**

**Unified core fields (required — validated by Zod):**

| Field                 | Type   | Description                                                      |
| --------------------- | ------ | ---------------------------------------------------------------- |
| `id`                  | string | UUID, stable across rebuilds                                     |
| `schema_version`      | string | Schema version (`"3.0"`)                                         |
| `source_type`         | string | Always `"repo"` for this handler                                 |
| `source`              | string | GitHub `OWNER/REPO` identifier                                   |
| `slug`                | string | Directory slug for `.research/analysis/<slug>/`                  |
| `title`               | string | Repository name (from GitHub API)                                |
| `analyzed_at`         | string | ISO8601 timestamp of analysis                                    |
| `depth`               | string | `quick`, `standard`, or `deep`                                   |
| `tags`                | array  | Optional approved tags; empty for untagged analyses              |
| `scoring`             | object | Required quality score; optional fit fields for adoption runs    |
| `summary`             | string | 2-3 sentence summary of what this source is and what was learned |
| `creator_view`        | string | Full Creator View prose (from creator-view.md)                   |
| `candidates`          | array  | Candidate ID/name/kind summaries matching value-map.json         |
| `last_synthesized_at` | string | ISO8601 or null — set by synthesis, not by handler               |

**Repo-specific fields (optional — type-specific extensions):**

| Field                                | Type   | Description                                               |
| ------------------------------------ | ------ | --------------------------------------------------------- |
| `metadata`                           | object | GitHub stats, scan metadata, clone info                   |
| `repo_type`                          | string | Primary type (see Section 5b)                             |
| `repo_type_secondary`                | string | Secondary type (null if single-type)                      |
| `dimensions.*`                       | object | Per-dimension: score (0-100), band, and detail string     |
| `summary_bands.*`                    | object | 6-dimension summary: Security, Reliability, etc.          |
| `absence_patterns`                   | array  | Objects with pattern name, confidence, and evidence       |
| `adoption_assessment`                | object | Optional; only for explicit adoption runs (see Sec 1.3)    |
| `adoption_assessment.verdict`        | string | Adopt / Trial / Extract / Avoid                           |
| `adoption_assessment.verdict_score`  | number | Weighted average of WR dimensions, 0-100                  |
| `adoption_assessment.recommendation` | string | One-sentence adoption recommendation                      |

**Scoring mapping:** The `scoring` object is derived from `summary_bands`:

- `quality_score` = average of 6 summary band scores
- `quality_band` = band for that average (per `CONVENTIONS.md`)
- For explicit adoption runs only, `personal_fit_score` comes from
  `adoption_assessment.verdict_score`; its band and classification may also be
  written. Discovery-only runs omit these fields.

**Critical Health Metric:** The minimum score across all 6 summary dimensions. A
repo with a 90 average but a 15 security score is `Critical` regardless of
average. Display alongside overall band:
`Healthy (74) | Critical floor: Security (52)`.

### 3.2 `findings.jsonl`

One record per finding. Uses a lightweight analysis-native format. TDMS intake
(routing option 2) transforms to TDMS-compatible format at intake time.

```jsonl
{
  "schema_version": "2.0",
  "id": "F001",
  "severity": "high|medium|low|info",
  "dimension": "QS-15|ST-01|WR-03",
  "title": "No SAST for subprocess-heavy codebase",
  "description": "Full finding description with evidence",
  "recommendation": "Recommended action"
}
```

**Field definitions:**

| Field            | Type   | Required | Description                              |
| ---------------- | ------ | -------- | ---------------------------------------- |
| `schema_version` | string | Yes      | Schema version (`"2.0"`)                 |
| `id`             | string | Yes      | Finding ID (F001, F002, etc.)            |
| `severity`       | string | Yes      | `high`, `medium`, `low`, or `info`       |
| `category`       | string | No       | Optional: `cautionary` for anti-ideas    |
| `dimension`      | string | Yes      | Dimension ID (e.g., QS-15, ST-01, WR-03) |
| `title`          | string | Yes      | Short finding title                      |
| `description`    | string | Yes      | Full description with evidence           |
| `recommendation` | string | Yes      | Recommended action                       |

**TDMS intake transform (routing option 2):**

When the user selects "Send to TDMS", each finding is transformed to
TDMS-compatible format before intake:

| findings.jsonl field | TDMS field       | Transform                                    |
| -------------------- | ---------------- | -------------------------------------------- |
| `id`                 | `source_id`      | Prefixed: `repo-analysis-<slug>-<date>-F001` |
| `severity`           | `severity`       | `high`→S1, `medium`→S2, `low`→S3, `info`→S3  |
| `title`              | `title`          | Direct copy                                  |
| `detail`             | `description`    | Direct copy                                  |
| `recommendation`     | `recommendation` | Direct copy                                  |
| (derived)            | `category`       | Derived from dimension prefix                |
| (derived)            | `status`         | Always `NEW`                                 |
| (derived)            | `source`         | `repo-analysis-<slug>-<YYYY-MM-DD>`          |

### 3.3 `value-map.json`

Canonical knowledge handoff produced by Standard and Deep and consumed by
brain-fit. Validate it with `node <skill-dir>/validate.mjs value-map
<value-map.json> <findings.jsonl>`. Keep extraction
decisions in the extraction journal; this evidence artifact stays immutable.

```json
{
  "schema_version": "3.0",
  "repository": "OWNER/REPO",
  "analyzed_at": "ISO8601",
  "depth": "standard|deep",
  "candidates": [
    {
      "id": "stable-candidate-id",
      "kind": "pattern|knowledge|content|anti-pattern",
      "name": "Evidence-linked handoff",
      "mechanism": "How the idea works in this repository",
      "why_it_matters": "Which future reasoning or behavior it could improve",
      "evidence": ["F-001", "F-004"],
      "limitations": "Where the idea stops applying or what remains uncertain",
      "confidence": "confirmed|inferred|unverified",
      "novelty": "high|medium|low",
      "portability": "high|medium|low",
      "relevance": "high|medium|low",
      "effort": "E0|E1|E2|E3",
      "rank": 1,
      "url": "optional external source for content candidates"
    }
  ],
  "no_candidates_reason": "Required only when candidates is empty"
}
```

`evidence` contains IDs from `findings.jsonl`; the deterministic gate rejects
missing links. Candidate IDs and ranks are unique, and `analysis.json.candidates`
contains summaries with the same IDs. An empty list is valid only with a
specific `no_candidates_reason` accepted by the independent reviewer.

**Extraction effort levels:**

| Level | Label               | Description                                        |
| ----- | ------------------- | -------------------------------------------------- |
| E0    | Copy-paste          | Lift and drop, zero modification needed            |
| E1    | Light adaptation    | Rename, adjust imports, minor config changes       |
| E2    | Moderate adaptation | Interface changes, dependency swaps, test rewrites |
| E3    | Significant rework  | Architectural adaptation, major refactoring        |

### 3.4 `trends.jsonl` (append-only)

One record per analysis run. Enables trend detection over multiple runs of the
same repo.

```jsonl
{
  "schema_version": "2.0",
  "analysis_id": "uuid",
  "timestamp": "ISO8601",
  "repo": "github.com/org/repo",
  "commit": "sha",
  "overall_band": "Healthy",
  "overall_score": 74,
  "critical_health_metric": 52,
  "dimensions": {
    "security": 52,
    "reliability": 78,
    "maintainability": 81,
    "documentation": 66,
    "process": 88,
    "velocity": 71
  },
  "findings_total": 84,
  "findings_by_severity": {
    "S0": 2,
    "S1": 8,
    "S2": 35,
    "S3": 39
  },
  "new_findings": 6,
  "resolved_findings": 12,
  "delta_overall": 6,
  "absence_patterns": [
    "security_facade"
  ],
  "regression_flags": []
}
```

**Field definitions:**

| Field                    | Type   | Description                                   |
| ------------------------ | ------ | --------------------------------------------- |
| `analysis_id`            | string | UUID matching the analysis.json run           |
| `timestamp`              | string | ISO 8601 timestamp                            |
| `repo`                   | string | Repository identifier                         |
| `commit`                 | string | HEAD SHA at analysis time                     |
| `overall_band`           | string | Band result for this run                      |
| `overall_score`          | number | Weighted average score                        |
| `critical_health_metric` | number | Minimum dimension score                       |
| `dimensions`             | object | Per-dimension numeric scores                  |
| `findings_total`         | number | Total findings count                          |
| `findings_by_severity`   | object | Findings broken out by S0-S3                  |
| `new_findings`           | number | New findings vs previous run (0 if first run) |
| `resolved_findings`      | number | Findings resolved since previous run          |
| `delta_overall`          | number | Score change from previous run                |
| `absence_patterns`       | array  | Named patterns detected this run              |
| `regression_flags`       | array  | Dimensions that regressed since previous run  |

### 3.5 `summary.md` (deep-plan injectable)

Structured Markdown following `## Research Context: Repo Analysis` header format
expected by deep-plan's DIAGNOSIS.md injection. Contains human-readable summary
of all findings, dimension bands, absence patterns, and value map highlights.
This is the primary display artifact shown inline after each phase.

### 3.6 Extraction Persistence Artifacts

Three artifacts track extraction decisions and outcomes across repos.

#### 3.6.1 Per-Candidate Extraction Result

**Location:** `.research/analysis/<slug>/extractions/<candidate-slug>.json`

Written when user acts on a candidate in the Extract routing flow.

```json
{
  "candidate": "HARNESS.md Methodology",
  "repo": "HKUDS/CLI-Anything",
  "scan_date": "2026-04-03",
  "status": "selected",
  "decision": "extract|skip|defer",
  "decision_date": "2026-04-03",
  "decision_notes": "7-phase SOP applicable to JASON-OS agent-native tooling",
  "source_files": [
    "cli-anything-plugin/HARNESS.md",
    "cli-anything-plugin/guides/"
  ],
  "extracted_to": "docs/reference/HARNESS_METHODOLOGY.md",
  "adaptation_notes": "Adapted Phase 3 examples for TypeScript/Node",
  "dependencies_added": [],
  "follow_up": "Evaluate SKILL.md format for sonash skill files"
}
```

| Field                | Type   | Required | Description                                      |
| -------------------- | ------ | -------- | ------------------------------------------------ |
| `candidate`          | string | Yes      | Name from value-map.json                         |
| `repo`               | string | Yes      | Source repo identifier                           |
| `scan_date`          | string | Yes      | Date of analysis that found this candidate       |
| `status`             | string | Yes      | `selected`, `extracted`, `integrated`, `skipped` |
| `decision`           | string | Yes      | `extract`, `skip`, or `defer`                    |
| `decision_date`      | string | Yes      | ISO 8601 date of decision                        |
| `decision_notes`     | string | Yes      | Reasoning for the decision                       |
| `source_files`       | array  | No       | Specific files in source repo                    |
| `extracted_to`       | string | No       | Destination path in our repo (if extracted)      |
| `adaptation_notes`   | string | No       | What was changed during extraction               |
| `dependencies_added` | array  | No       | New dependencies required                        |
| `follow_up`          | string | No       | Remaining work or related investigations         |

#### 3.6.2 Cross-Entity Extraction Journal

**Location:** `.research/extraction-journal.jsonl` (canonical root path)

Append-only log across ALL analyzed entities (repos and websites). One line per
extraction decision. Uses unified v2.0 schema shared with website-analysis.
Legacy files at `.research/analysis/extraction-journal.jsonl` have been removed.
All data lives at the canonical location only.

```jsonl
{
  "schema_version": "2.0",
  "source_type": "repo",
  "source": "HKUDS/CLI-Anything",
  "candidate": "HARNESS.md Methodology",
  "type": "pattern",
  "decision": "extract",
  "decision_date": "2026-04-03",
  "extracted_to": "docs/reference/HARNESS_METHODOLOGY.md",
  "extracted_at": "2026-04-03",
  "notes": "7-phase SOP for agent-native CLI wrapping.",
  "novelty": "high",
  "effort": "E0",
  "relevance": "high"
}
```

| Field            | Type   | Required | Description                                      |
| ---------------- | ------ | -------- | ------------------------------------------------ |
| `schema_version` | string | Yes      | Schema version (`"2.0"`)                         |
| `source_type`    | string | Yes      | `"repo"` or `"website"`                          |
| `source`         | string | Yes      | Repo name or URL                                 |
| `candidate`      | string | Yes      | Candidate name from value-map                    |
| `type`           | string | Yes      | content/pattern/tool/knowledge/anti-pattern/etc. |
| `decision`       | string | Yes      | extract/defer/skip/investigate                   |
| `decision_date`  | string | Yes      | ISO date when decision was made                  |
| `extracted_to`   | string | No       | Destination path (null if not yet extracted)     |
| `extracted_at`   | string | No       | ISO date when extraction completed               |
| `notes`          | string | No       | Optional context about the candidate             |
| `novelty`        | string | Yes      | high/medium/low                                  |
| `effort`         | string | Yes      | E0/E1/E2/E3                                      |
| `relevance`      | string | Yes      | high/medium/low                                  |

#### 3.6.3 `EXTRACTIONS.md` (Human-Readable Summary)

**Location:** `.research/EXTRACTIONS.md` (canonical root path only). Legacy
files at `.research/analysis/EXTRACTIONS.md` have been removed.

Auto-regenerated from `extraction-journal.jsonl` after each Extract routing
flow. Grouped by status for quick scanning.

```markdown
# Extraction Candidates — Cross-Repo Summary

Generated: 2026-04-05 | Total: 7 candidates across 1 repo

## Extracted (0)

_None yet._

## Deferred (7)

### HKUDS/CLI-Anything (7 candidates)

| Candidate              | Novelty | Effort | Discovery | Notes                                      |
| ---------------------- | ------- | ------ | --------- | ------------------------------------------ |
| HARNESS.md Methodology | High    | E0     | 92        | 7-phase SOP for agent-native CLI wrapping. |
| SKILL.md Format        | High    | E0     | 88        | Distinctive skill-definition structure.    |
| Plugin Marketplace     | High    | E2     | 85        | Unusual distribution pattern.              |

_(truncated for brevity)_

#### Per-Repo Detail: HKUDS/CLI-Anything

| Candidate              | Novelty | Effort | Discovery | Notes                                  |
| ---------------------- | ------- | ------ | --------- | -------------------------------------- |
| HARNESS.md Methodology | High    | E0     | 92        | Strong documented operating method.    |
| SKILL.md Format        | High    | E0     | 88        | Distinctive instruction structure.      |
| Plugin Marketplace     | High    | E2     | 85        | Unusual distribution architecture.      |

## Skipped (3)

...
```

### 3.7 `mined-links.jsonl`

**Location:** `.research/analysis/<slug>/mined-links.jsonl`

One record per link extracted during the Link Mining Pipeline (Section 16).
Produced conditionally when `repo_type` is `curated-list` or `registry`.
Supports incremental deepening: Depth 0 entries have `confidence: "low"`,
upgraded to `"high"` after Depth 1 fetching.

```jsonl
{
  "schema_version": "2.0",
  "title": "FastAPI",
  "url": "https://github.com/tiangolo/fastapi",
  "category": "Web Frameworks > Python",
  "source_line": "- [FastAPI](https://github.com/tiangolo/fastapi) - Modern, fast web framework for building APIs with Python.",
  "description": "Modern, fast web framework for building APIs with Python.",
  "discovery_score": 88,
  "confidence": "low|high",
  "depth": 0,
  "fetch_status": "not_fetched|success|failed|rate_limited",
  "tags": [
    "python",
    "web-framework",
    "async"
  ],
  "notes": "Optional analyst notes"
}
```

**Field definitions:**

| Field                   | Type   | Required | Description                                                      |
| ----------------------- | ------ | -------- | ---------------------------------------------------------------- |
| `title`                 | string | Yes      | Link title (from markdown text or fetched page title)            |
| `url`                   | string | Yes      | Target URL                                                       |
| `category`              | string | Yes      | Category from source repo's taxonomy (heading-based)             |
| `source_line`           | string | Yes      | Raw markdown line where link was found                           |
| `description`           | string | Yes      | Description (from markdown context or fetched meta)              |
| `discovery_score`       | number | Yes      | Novelty and explanatory value score (0-100)                      |
| `confidence`            | string | Yes      | `"low"` (Depth 0, metadata only) or `"high"` (Depth 1+, fetched) |
| `depth`                 | number | Yes      | 0 (parsed), 1 (HEAD+selective fetch), 2 (targeted deep-dive)     |
| `fetch_status`          | string | Yes      | `not_fetched`, `success`, `failed`, or `rate_limited`            |
| `tags`                  | array  | Yes      | Descriptive tags for filtering and synthesis                     |
| `notes`                 | string | No       | Optional analyst notes or context                                |

### 3.8 `reading-chain.jsonl`

**Location:** `.research/reading-chain.jsonl` (canonical root path, cross-repo,
NOT per-slug). Legacy files at `.research/analysis/reading-chain.jsonl` remain
valid

Append-only log of relationships between analyzed repos. Populated during Phase
4 (Creator View) and Phase 6 (Value Map) when cross-repo relationships are
discovered. Consumed by the `/synthesize` skill for reading chain generation and
cross-repo knowledge maps.

```jsonl
{
  "schema_version": "2.0",
  "from_repo": "sindresorhus/awesome-nodejs",
  "to_repo": "tiangolo/fastapi",
  "relationship": "referenced-in",
  "discovery_context": "Listed in awesome-nodejs Web Frameworks section",
  "discovered_during": "sindresorhus/awesome-nodejs scan",
  "date": "2026-04-05"
}
```

**Field definitions:**

| Field               | Type   | Required | Description                                                                 |
| ------------------- | ------ | -------- | --------------------------------------------------------------------------- |
| `from_repo`         | string | Yes      | Source repo (`owner/repo` format)                                           |
| `to_repo`           | string | Yes      | Target repo (`owner/repo` format)                                           |
| `relationship`      | string | Yes      | `inspired-by`, `uses`, `similar-to`, `contrast`, `extends`, `referenced-in` |
| `discovery_context` | string | Yes      | How this relationship was discovered                                        |
| `discovered_during` | string | Yes      | Which repo scan discovered this (`owner/repo scan`)                         |
| `date`              | string | Yes      | ISO 8601 date of discovery                                                  |

---

## 4. Scoring Bands

Primary display is band with score in parentheses. Never present a bare numeric
score as the headline.

| Score  | Band       | Interpretation                    | Display example   |
| ------ | ---------- | --------------------------------- | ----------------- |
| 0-39   | Critical   | Immediate action required         | `Critical (28)`   |
| 40-59  | Needs Work | Significant gaps                  | `Needs Work (52)` |
| 60-79  | Healthy    | Acceptable; targeted improvements | `Healthy (74)`    |
| 80-100 | Excellent  | Strong across dimension           | `Excellent (88)`  |

**Band application:** Each summary dimension receives an independent band. The
default overall band is the Creator lens. The Critical Health Metric (minimum
across all dimensions) is a mandatory secondary display.

### 4.1 Adoption Lens Scoring (opt-in)

6 dimensions. Used when evaluating a repo as a dependency or integration target.

| Dimension       | Weight | Coverage                                            |
| --------------- | ------ | --------------------------------------------------- |
| Security        | 25%    | SAST, supply chain, secrets, OpenSSF score          |
| Reliability     | 20%    | Error handling, test coverage, type safety          |
| Maintainability | 20%    | Complexity, duplication, dead code, naming          |
| Documentation   | 10%    | README, CONTRIBUTING, API docs, inline comments     |
| Process         | 15%    | CI/CD, branch protection, merge hygiene             |
| Velocity        | 10%    | Commit frequency, PR turnaround, contributor health |

### 4.2 Creator Lens Scoring

7 dimensions (adds Knowledge). Used when evaluating a repo as a learning source
or creative reference.

| Dimension       | Weight | Coverage                                   |
| --------------- | ------ | ------------------------------------------ |
| Security        | 5%     | Irrelevant for learning                    |
| Reliability     | 10%    | Nice-to-have                               |
| Maintainability | 15%    | Clean code easier to learn from            |
| Documentation   | 25%    | How you learn from a repo                  |
| Process         | 5%     | CI/CD irrelevant for learning              |
| Velocity        | 5%     | Active dev nice-to-have                    |
| Knowledge       | 35%    | KN-01 through KN-05 composite (Section 13) |

### 4.3 Lens Selection Logic

Creator is always the primary lens. Compute and display the adoption lens only
when the user explicitly requests `--lens=adoption`.

### 4.4 Verdict Tables

**Adoption lens verdicts:**

| Score | Verdict | Interpretation                                           |
| ----- | ------- | -------------------------------------------------------- |
| 75+   | Adopt   | Integrate as-is, benefits clearly outweigh costs         |
| 55-74 | Trial   | Worth a proof-of-concept, some concerns to address first |
| 30-54 | Extract | Don't adopt whole -- cherry-pick valuable parts instead  |
| 0-29  | Avoid   | Costs outweigh benefits, build or find alternatives      |

**Creator lens verdicts:**

| Score | Verdict | Interpretation                            |
| ----- | ------- | ----------------------------------------- |
| 80+   | Study   | Deep engagement recommended               |
| 60-79 | Explore | Worth exploring, selective deep-dives     |
| 40-59 | Extract | Cherry-pick specific insights or patterns |
| 0-39  | Note    | Record existence, low learning priority   |

### 4.5 Display Format

Show the Creator lens by default. Add the Adoption line only for an explicit
adoption-lens run.

```
Creator Lens:  Study (85) — deep engagement recommended [PRIMARY]
Adoption Lens: Trial (62) — optional, requested for this run
```

---

## 5. Absence Pattern Definitions

The absence classifier detects what is missing, not what is present. Seven named
patterns with specific detection rules. Runs in Phase 2 (Standard) on full data,
with partial detection possible in Phase 0 (Quick Scan) using API data alone.

### Pattern 1: GHOST_SHIP

- **Detection:** Last commit > 180 days AND `archived: false` in GitHub API
- **Severity:** CRITICAL (as dependency); HIGH (standalone evaluation)
- **Quick Scan detectable:** Yes
- **Signal:** Most reliable single predictor of project abandonment. Academic
  literature uses 6 months; `cargo-unmaintained` uses 1 year; OSSF Scorecard
  uses 90 days. Use 180 days as the detection threshold but always surface the
  raw "days since last commit" value for consumer judgment.

### Pattern 2: TEST_THEATER

- **Detection:** `.github/workflows/` exists AND no workflow step `run:` field
  contains a recognizable test command
- **Test commands to match:** `test`, `pytest`, `jest`, `rspec`, `go test`,
  `cargo test`, `mocha`, `vitest`, `phpunit`, `dotnet test`, `mvn test`,
  `gradle test`
- **Severity:** CRITICAL (CI infrastructure cost with zero quality signal)
- **Quick Scan detectable:** Partial (workflow file presence from API, but
  step-level inspection requires clone or Contents API)

### Pattern 3: SECURITY_FACADE

- **Detection:** README contains security badge URLs (`snyk.io/badge`,
  `security/badge`) OR security keywords, but no `.github/dependabot.yml`, no
  security-scanning workflow steps, and no `SECURITY.md`
- **Severity:** HIGH (false sense of security for consumers)
- **Quick Scan detectable:** Yes (via community/profile and README inspection)

### Pattern 4: BORROWED_ARMOR

- **Detection:** `SECURITY.md` present but contains `TODO`, `[PLACEHOLDER]`,
  `your@email.com`, or GitHub default template boilerplate
- **Detection command:**
  `grep -iE "TODO|placeholder|\[your|example\.com|maintainer@" SECURITY.md`
- **Severity:** IMPORTANT (misleads contributors about security posture)
- **Quick Scan detectable:** Partial (file presence from API, content inspection
  requires Contents API or clone)

### Pattern 5: DEPENDENCY_FREEZE

- **Detection:** Manifest file (package.json, go.mod, requirements.txt) present
  AND manifest not modified in > 6 months AND dependency count > 5
- **Severity:** IMPORTANT (accumulating vulnerability exposure)
- **Quick Scan detectable:** Partial (manifest presence from API, modification
  date requires commit history or Contents API)
- **Enhancement:** Use `libyear` metric for version-lag-weighted staleness when
  available, instead of file modification date alone.

### Pattern 6: LONE_WOLF

- **Detection:** >90% of commits in last 12 months from single author AND no
  `.github/CODEOWNERS`
- **Variant:** VANISHING_WOLF -- was multi-contributor 12 months ago, now solo
- **Severity:** IMPORTANT (bus factor = 1, no succession path)
- **Quick Scan detectable:** Partial (contributor count from API, but percentage
  distribution requires deeper analysis)

### Pattern 7: SILENT_FAILURE

- **Detection:** CI exists AND tests exist AND CI has test commands, but GitHub
  API shows no required status checks on default branch
- **Severity:** IMPORTANT (tests run but advisory, not gating)
- **Quick Scan detectable:** Yes (branch protection rules from GraphQL include
  required status checks)

### Absence Classifier Scoring

```
Start at 100
Deduct: CRITICAL patterns (-3 each), IMPORTANT patterns (-2 each)
Normalize to applicable checks per repo type
Band result using the 4-band scale (Section 4)
```

Output named pattern labels in `analysis.json.absence_patterns[]`. Detailed
evidence for each detected pattern in `findings.jsonl`.

**Display:** Both in-dimension (within the relevant dimension's findings) AND as
a standalone summary list in `summary.md`. Cross-cutting signals deserve both
standalone visibility and in-context relevance.

---

## 5b. Repo Type Classification

Classifies the repository into a primary type that drives scoring lens selection
(Section 4.3), conditional phases (link mining, Section 16), and display format.
Classification runs during Quick Scan (Phase 0) using API data and is optionally
refined during Standard mode (Phase 1) with full file access.

### Detection Signal Matrix

Signals are evaluated using GitHub API data (no clone required for Quick Scan).

| Signal                                                             | Source                    | Strength |
| ------------------------------------------------------------------ | ------------------------- | -------- |
| README size > 50KB                                                 | Contents API `size` field | Strong   |
| Code-to-markdown ratio < 0.2                                       | Tree API file extensions  | Strong   |
| Topics include "awesome"/"list"/"resources"/"curated"/"collection" | REST metadata `topics`    | Strong   |
| < 20 code files outside docs/scripts/                              | Tree API                  | Moderate |
| External link density > 5 per KB in README                         | Contents API + parse      | Strong   |
| Single top-level README + category dirs                            | Tree API                  | Moderate |

### Classification Thresholds

Applied in order. First match wins.

1. **`curated-list`**: 3+ strong signals, OR 2 strong + 1 moderate
2. **`monorepo`**: Presence of `turbo.json`, `nx.json`, `pnpm-workspace.yaml`,
   `lerna.json`, or `rush.json`
3. **`registry`**: Structured data files (JSON/YAML) with URL fields + web
   frontend (detected from topics or file structure)
4. **`documentation-hub`**: Code-to-docs ratio > 0.3 but < 0.7, README > 10KB
5. **`library` vs `application`**: Primary language present, code-to-markdown
   ratio > 0.7. Distinguish by: CLI entry point or `bin` field in package.json
   --> `application`; otherwise --> `library`
6. **Default fallback**: `library`

**Ambiguity handling:** If signals are evenly split between two types with no
clear primary, default to `library` and set `repo_type_secondary`. Log the
ambiguity in the state file.

### Secondary Type

If secondary signals are strong but don't win primary classification, set
`repo_type_secondary` in `analysis.json`. The secondary type is informational
only -- it does not drive phase routing or lens selection.

Example: build-your-own-x has primary = `curated-list`, secondary =
`documentation-hub` (extensive how-to content alongside the link catalog).

### Library vs Application Distinction

For repos classified as code-primary (not curated-list, registry, or
documentation-hub):

| Signal                                    | Classification |
| ----------------------------------------- | -------------- |
| `bin` field in package.json               | `application`  |
| CLI entry point (main.go, src/cli.ts)     | `application`  |
| `main` field + no `bin` in package.json   | `library`      |
| Exported module with API surface          | `library`      |
| Docker/Kubernetes configs + service entry | `application`  |
| No clear signal                           | `library`      |

### Monorepo and Registry Detection

**Monorepo markers** (any one sufficient):

- `turbo.json` (Turborepo)
- `nx.json` (Nx)
- `pnpm-workspace.yaml` (pnpm workspaces)
- `rush.json` (Rush)
- `package.json` with `workspaces` field (npm/Yarn/Bun)
- `WORKSPACE` or `WORKSPACE.bazel` (Bazel)
- `Cargo.toml` with `[workspace]` (Rust)

**Registry markers** (2+ required):

- Structured data directory (JSON/YAML files with `url` or `homepage` fields)
- Web frontend or API serving the data
- Submission/contribution template referencing data format

### Standard Mode Refinement

After clone (Phase 1), re-evaluate type with full file access. Override Quick
Scan classification if clone data contradicts API-only assessment. Log any
classification change in the state file:

```json
{
  "repo_type_quick_scan": "library",
  "repo_type_refined": "documentation-hub",
  "refinement_reason": "Clone revealed 60% markdown content not visible via Tree API truncation"
}
```

---

## 6. Code Portability Rubric (0-15)

Five-dimension rubric for scoring extraction candidate portability. Each
dimension scored 0-3. Total score >= 10 = strong candidate; 6-9 = conditional; <
6 = project-specific, extraction not recommended.

| Dimension               | 0 (worst)                | 1                         | 2                         | 3 (best)                   |
| ----------------------- | ------------------------ | ------------------------- | ------------------------- | -------------------------- |
| Dependency Profile      | Invasive framework       | Heavy library deps        | Light, standard deps      | Standard library only      |
| Coupling Profile        | Ce > 12 (high efferent)  | Ce 8-12                   | Ce 4-7                    | Ce < 3                     |
| Configuration Surface   | Requires global state    | Requires env/config files | Constructor injection     | Zero-config                |
| Cognitive Portability   | Name requires system ref | Name implies parent       | Nameable with domain hint | Nameable without context   |
| Documentation Artifacts | No documentation         | Inline comments only      | README + usage examples   | Full API reference + tests |

**Blank project test:** Imagine copying the candidate into a blank project and
listing all imports. Any import that is not (a) standard library, (b) a
well-known general-purpose library, or (c) an abstracted interface is a
portability risk.

---

## 7. Temporal Fingerprint Specification (5-Signal)

Recorded on every analysis run, even Quick Scan (with limited signals).
Compounds across runs: first run establishes baseline, subsequent runs detect
drift.

### Signal Definitions

| #   | Signal                          | Extraction method                                    | Diagnostic value                                               |
| --- | ------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| 1   | Commit velocity trend           | Monthly commit counts, 12 months                     | Health trajectory: rising/stable/declining/dead/recovering     |
| 2   | Contributor churn rate          | Unique active authors/month, trailing 6m vs prior 6m | Bus factor deterioration; single-author collapse               |
| 3   | Test-to-code ratio trajectory   | Test file count vs source file count, per quarter    | Rising = growing discipline; declining = coverage debt         |
| 4   | Dependency file touch frequency | Manifest file changes per quarter                    | High = active maintenance; stale 6+ months = Dependency Freeze |
| 5   | Code churn vs net growth        | Lines added minus deleted per month                  | High churn + low growth = thrash; inverse = healthy growth     |

### Fingerprint Schema

```json
{
  "repo": "owner/name",
  "fingerprint_date": "2026-04-02",
  "window_months": 12,
  "signals": {
    "commit_velocity": {
      "monthly_counts": [3, 5, 12, 8, 6, 0, 1, 2, 4, 7, 9, 11],
      "sparkline": "...........",
      "trend": "rising|stable|declining|dead|recovering",
      "dead_months": 2
    },
    "contributor_health": {
      "bus_factor_trend": "improving|stable|declining",
      "solo_months": 5,
      "unique_contributors_12m": 4
    },
    "test_ratio_trajectory": {
      "quarterly_ratios": [0.18, 0.19, 0.17, 0.16],
      "trend": "rising|stable|declining"
    },
    "dependency_freshness": {
      "dep_file_last_touched_days_ago": 187,
      "trend": "active|stale|frozen"
    },
    "churn_vs_growth": {
      "pattern": "healthy_growth|thrash|erratic_then_stable|contraction"
    }
  },
  "summary_indicators": {
    "velocity_trend": "recovering",
    "maintenance_risk": "low|medium|high|critical",
    "bus_factor": 1,
    "test_discipline": "rising|stable|declining"
  }
}
```

### Trend Alert Thresholds

| Pattern               | Threshold                                             | Severity |
| --------------------- | ----------------------------------------------------- | -------- |
| Contributor cliff     | Active contributors drops >50% in 90 days             | HIGH     |
| Dependency spike      | Transitive dependency count increases >30% in 30 days | HIGH     |
| Test coverage decline | Coverage drops >10 percentage points between versions | MEDIUM   |
| Commit halt           | Zero commits for 45+ days on previously active repo   | MEDIUM   |
| Issue age surge       | Median open issue age doubles in 60 days              | MEDIUM   |

---

## 8. State File Schema

**File naming:** `.claude/state/repo-analysis.<repo-slug>.state.json`

Each analysis gets its own state file keyed by repo slug (lowercase, hyphens for
special chars). Examples:

- `repo-analysis.facebook-react.state.json`
- `repo-analysis.vercel-next-js.state.json`
- `repo-analysis.pallets-flask.state.json`

```json
{
  "skill": "repo-analysis",
  "version": "1.0",
  "slug": "<repo-slug>",
  "target_repo": "github.com/org/repo",
  "target_commit": "<sha>",
  "status": "in-progress|complete|failed",
  "phase": 0,
  "depth": "quick|standard|deep",
  "dimensions_completed": [],
  "dimensions_failed": [],
  "clone_dir": "/tmp/repo-analysis-<slug>/",
  "clone_strategy": "none|blobless-shallow|blobless-history|full",
  "output_dir": ".research/analysis/<repo-slug>/",
  "agents": {
    "spawned": 0,
    "completed": 0
  },
  "budget_seconds": 900,
  "analysis_seconds_used": 0,
  "budget_extended": false,
  "budget_exhausted": false,
  "deferred_count": 0,
  "startedAt": "ISO 8601",
  "completedAt": null
}
```

**Field definitions:**

| Field                  | Type   | Description                                      |
| ---------------------- | ------ | ------------------------------------------------ |
| `skill`                | string | Always `"repo-analysis"`                         |
| `version`              | string | Skill version for compatibility checking         |
| `slug`                 | string | Repo slug derived from URL                       |
| `target_repo`          | string | Full GitHub path                                 |
| `target_commit`        | string | HEAD SHA at analysis start                       |
| `status`               | string | Current status: in-progress, complete, or failed |
| `phase`                | number | Current phase number (0-5)                       |
| `depth`                | string | Requested depth tier                             |
| `dimensions_completed` | array  | List of completed dimension IDs (e.g., "QS-01")  |
| `dimensions_failed`    | array  | List of failed dimensions with reason            |
| `clone_dir`            | string | Clone location (null for Quick Scan)             |
| `clone_strategy`       | string | Clone method used                                |
| `output_dir`           | string | Output artifact directory                        |
| `agents`               | object | Agent tracking: `{spawned, completed}` (flat)    |
| `budget_seconds`       | number | Quick 30, Standard 900, Deep 1800 unless extended |
| `analysis_seconds_used`| number | Accumulated active work; excludes user wait time |
| `budget_extended`      | boolean | True only after explicit user extension          |
| `budget_exhausted`     | boolean | Stops new evidence gathering when true            |
| `deferred_count`       | number | Items inventoried but left for a later run         |
| `startedAt`            | string | ISO 8601 analysis start time                     |
| `completedAt`          | string | ISO 8601 completion time (null if in-progress)   |

---

## 9. Guard Rails

### Rate Limits

- Use authenticated `gh` for API batches and abort if core remaining is below
  200.
- With explicit approval, a public repository may use one unauthenticated
  metadata request plus clone-local evidence. Record authenticated-only
  dimensions as unavailable; private repositories require authenticated `gh`.
- Cache ETag on every GET; use `If-None-Match` on subsequent polls
- Core, search, code_search, and GraphQL are independent rate limit buckets
- On 429 or 403: read `retry-after` header; wait + backoff; never retry
  immediately
- GitHub App installation tokens expire in 1 hour (not 8 hours -- user access
  tokens are 8 hours)

### Large Repository Safety

- Skip statistics endpoints for repos with >= 10,000 commits; use `git log`
  fallback
- Handle HTTP 202 on statistics endpoints with one retry after 3-5 seconds;
  defer the statistic if it is still unavailable
- Never trust the `size` field as authoritative (treat as rough
  order-of-magnitude)
- Use Git Trees API (not Contents API) for full file enumeration
- Check `truncated: true` on Trees API responses (cap: 100,000 entries, 7 MB)
- GitHub Linguist fails for repos > 100,000 files; fall back to local `scc`

### Monorepo Handling

- Check for multiple monorepo indicators (pnpm + Turborepo simultaneously is
  valid)
- Parse workspace globs for sub-package paths; do not assume `packages/` or
  `apps/`
- Analyze each sub-package independently when monorepo contains discrete
  deployables
- For sub-package analysis: `git sparse-checkout set <subdir>` to avoid cloning
  the full monorepo

**Monorepo detection signals:**

| File                             | Monorepo Tool |
| -------------------------------- | ------------- |
| `turbo.json`                     | Turborepo     |
| `nx.json`                        | Nx            |
| `pnpm-workspace.yaml`            | pnpm          |
| `package.json#workspaces`        | npm/Yarn/Bun  |
| `rush.json`                      | Rush          |
| `WORKSPACE` or `WORKSPACE.bazel` | Bazel         |
| `Cargo.toml` with `[workspace]`  | Rust/Cargo    |

### Fork Detection

- Always fetch full repo object for `parent` and `source` fields
- If repo is a fork: flag prominently in output, display upstream reference
- Analyze the fork (the user chose it for a reason); inform, do not redirect

### Home Repo Guard

- Exact URL match on `jasonmichaelbell78-creator/sonash-v0`
- On match: warn user and offer redirect to `/audit-comprehensive`
- Do NOT proceed with repo-analysis on the home repo

### Error Handling

- Retry once with backoff on transient API failures (5xx, timeout)
- Degrade gracefully on persistent failures (mark dimension as unavailable with
  reason)
- Never block entire analysis for a single failed dimension or tool
- On OpenSSF 404: not indexed, continue (not an error)
- On deps.dev failure: skip CVE cross-reference, note in findings

### Clone Safety

- Clone to `/tmp/repo-analysis-<slug>/` (never to project directory)
- LFS repos: `GIT_LFS_SKIP_SMUDGE=1` if `.gitattributes` detected
- Auto-cleanup clone after analysis completes
- Blobless partial clone (`--filter=blob:none`) is default; never full clone
  unless git-sizer or binary anomaly requires it

### Framework Detection Heuristics

Detection hierarchy: config file presence + dependency name together, not
dependency name alone.

| Framework    | Primary Signal                                    |
| ------------ | ------------------------------------------------- |
| Next.js      | `next` in deps AND `next.config.js/ts` present    |
| React (CRA)  | `react-scripts` in deps, no framework config file |
| Vite React   | `@vitejs/plugin-react` in devDeps                 |
| Angular      | `@angular/core` dep AND `angular.json`            |
| Vue          | `vue` dep AND optional `vue.config.js`            |
| Django       | `django` in requirements.txt or pyproject.toml    |
| FastAPI      | `fastapi` in requirements.txt                     |
| Express/Node | `express` in package.json, no frontend framework  |
| Go service   | `go.mod` present, no frontend frameworks          |
| Rust service | `Cargo.toml` with lib or binary crate             |

---

## 10. Agent Allocation (Standard/Deep Modes)

### Minimum Viable Agent Pool (Standard)

| Agent                 | Role                                       | Always? |
| --------------------- | ------------------------------------------ | ------- |
| Orchestrator (inline) | Phase 0-1 pre-flight, state management     | Yes     |
| `gsd-codebase-mapper` | Initial map; tech, arch, quality, concerns | Yes     |
| `security-auditor`    | SAST + supply chain + OWASP                | Yes     |
| `code-reviewer`       | Quality, maintainability, error handling   | Yes     |
| Aggregation (inline)  | Reads dimension files, computes scores     | Yes     |

### Conditional Additions

| Agent                  | Trigger                        |
| ---------------------- | ------------------------------ |
| `test-engineer`        | Test infrastructure detected   |
| `deployment-engineer`  | CI config detected             |
| `backend-architect`    | API/backend repo detected      |
| `performance-engineer` | Performance indicators present |
| Stack-specific agent   | When specific stack detected   |

**Hard cap:** 4 concurrent agents. Wave staging required for pools larger
than 4.

### Staged Wave Execution

```
Phase 0:  Inline orchestrator (no spawn) -- Quick Scan
Phase 1:  Inline orchestrator -- clone execution
Phase 2:  Dimension Wave -- up to 4 concurrent agents
          Each writes dimensions/<dim>-findings.json before returning
          Orchestrator verifies file existence (does not trust return values)
Phase 2b: Deep Read -- inline, read internal artifacts beyond code
Phase 3:  History Wave (conditional, Deep only) -- up to 3 concurrent agents
Phase 3.5: Content Evaluation -- inline, evaluates embedded content for insight
Phase 4:  Creator View -- inline, requires Deep Read + Content Evaluation
Phase 5:  Engineer View -- inline, merge dimensions, compute bands
Phase 6:  Value Map generation -- inline, 4 typed candidate arrays
Phase 6b: Coverage Audit -- inline, scan for unexplored content
```

---

## 11. Value Extraction Signals

Five signals scored per extraction candidate in `value-map.json`:

| Signal             | Scoring      | Criteria                                      |
| ------------------ | ------------ | --------------------------------------------- |
| Pattern Novelty    | High/Med/Low | Is the idea distinctive among comparable repos? |
| Code Portability   | 0-15 numeric | 5-dimension rubric (Section 6)                |
| Evidence Strength  | High/Med/Low | How directly does repository evidence support it? |
| Quality Signal     | High/Med/Low | How well does the idea solve its stated problem? |
| Extraction Effort  | E0-E3        | Effort to transplant (see Section 3.3)        |

**Ranking formula:** Candidates ranked by: Pattern Novelty (High=3, Med=2,
Low=1) + Code Portability (normalized 0-3) + Quality Signal (High=3, Med=2,
Low=1), penalized by Extraction Effort (E0=0, E1=-0.5, E2=-1, E3=-2). Ties
are broken by Evidence Strength.

---

## 12. Normalization and Comparison

Classify target repo before any comparison. Raw scores across segments are not
comparable.

**Segmentation dimensions:**

| Dimension        | Values                                             |
| ---------------- | -------------------------------------------------- |
| Primary language | Controls LOC normalization baseline                |
| Project type     | library / application / framework / tooling        |
| Maturity         | Greenfield (<2y), Established (2-7y), Legacy (>7y) |
| Team size proxy  | solo (1), micro (2-3), small (4-10), large (10+)   |

Compare within segment, not globally.

---

## 12b. Research Index

**Location:** `.research/research-index.jsonl`

Every analysis run appends one record for cross-skill discoverability.

| Field              | Type   | Description                                     |
| ------------------ | ------ | ----------------------------------------------- |
| `slug`             | string | Repo slug (e.g., `facebook-react`)              |
| `url`              | string | Full GitHub URL                                 |
| `depth`            | string | `quick` / `standard` / `deep`                   |
| `date`             | string | ISO 8601 timestamp                              |
| `score_summary`    | object | `{ security: 52, reliability: 78, ... }`        |
| `output_dir`       | string | Path to `.research/analysis/<slug>/`            |
| `absence_patterns` | array  | Detected patterns (e.g., `["SECURITY_FACADE"]`) |

**Readers:** `/deep-plan` Phase 0 (discovers prior research), session-begin
(surfaces active analyses), Compare resume option (finds previous runs).

---

## 13. Knowledge Dimensions (Creator View)

Five dimensions that capture what a repo UNDERSTANDS, not just its health. These
feed the Creator View (SKILL.md Phase 4). Low automation — knowledge extraction
requires AI judgment, not tool output.

| #     | Dimension                | Signal | Auto | What It Captures                                    |
| ----- | ------------------------ | ------ | ---- | --------------------------------------------------- |
| KN-01 | Domain knowledge map     | 5/5    | 2/5  | What technical domains does this repo teach/embody? |
| KN-02 | Insight density          | 5/5    | 1/5  | Non-obvious insights embedded in code/docs/design   |
| KN-03 | Learning path potential  | 4/5    | 2/5  | Could this repo serve as a curriculum or deep dive? |
| KN-04 | Methodology novelty      | 5/5    | 1/5  | Does this repo approach a problem in a new way?     |
| KN-05 | Distinctiveness           | 5/5    | 1/5  | How unlike the repo's obvious peers is this insight? |

**Scoring:** Each dimension scored 0-100 with the same 4-band scale (Section 4).
The Knowledge composite score is the weighted average of KN-01 through KN-05.

**Key differences from engineer dimensions:**

- Low automation — requires reading and understanding, not counting
- Subjective — AI judgment, not tool output
- Evidence-dependent — KN-05 requires comparison with the repo's stated peers
- Changes the verdict — a repo with Critical health but Excellent knowledge
  should score differently than health-only analysis suggests

**Examples from real analyses:**

| Repo                  | Knowledge Score | What Was Missed Without This                                                                                       |
| --------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------ |
| karpathy/autoresearch | Excellent (92)  | Autonomous research methodology, agent instruction design, fixed-budget experimentation as generalizable pattern   |
| build-your-own-x      | Excellent (85)  | 363 paths into deep systems knowledge. 5 domains directly relevant to JASON-OS. The "build from scratch" pedagogy. |
| CLI-Anything          | Healthy (72)    | HARNESS.md 7-phase SOP for agent-native CLI wrapping. Claude Code plugin marketplace format.                       |
| MemSkill              | Excellent (88)  | Meta-memory concept (skills about HOW to remember). Skill evolution loop. arXiv 2602.02474.                        |

---

## 14. Creator View Specification

The Creator View is the primary analytical output for Standard and Deep modes.
It explains the repo's idea, excavates what it knows, and separates distinctive
strengths from generic good practice.

### 14.1 Style Guide

- **Conversational prose, not tables.** Written as you'd explain a repo to a
  colleague over coffee, not as a compliance report.
- **Anti-goal: must NOT read like a technical manual.** No jargon-heavy,
  impersonal, bullet-point-only output.
- **Teach the idea.** Explain it so the user could retell the repo's thesis and
  mechanism without reopening the README.
- **Depth over brevity.** Each section should be substantive — 5-15 lines of
  real analysis, not 2-line summaries.
- **Evidence-backed.** Every strength and weakness points to a concrete
  artifact, behavior, history signal, or repository fact.

### 14.2 Section: The Idea

Explain the problem, thesis, mechanism, and important design decisions. Separate
the repo's actual idea from branding and feature lists. Completion criterion:
the explanation is specific enough that it could not describe a close peer
unchanged.

### 14.3 Section: Strongest and Newest Ideas

This is the discovery-heavy core. Rank the strongest findings, cite their
source, explain how each works, and state what makes it distinctive. Search
code, docs, examples, history, and references; novelty hidden outside the README
counts more than familiar best practice presented well.

### 14.4 Section: Hidden Depth

Surface knowledge that a README-only review would miss: unusual implementation
details, methodology, examples, notebooks, internal instructions, papers,
datasets, and links. Connect each item back to the central idea.

### 14.5 Section: Weaknesses and Blind Spots

Identify limits, tradeoffs, risks, missing reasoning, and unsupported
assumptions. Cite specific evidence and distinguish an actual flaw from a
deliberate scope choice. If no material weakness is supported, say so.

### 14.6 Section: Questions Worth Following

List only unresolved questions that could reveal another meaningful idea. Each
question names the evidence needed to answer it; this is a bounded follow-up
queue, not an automatic continuation of analysis.

---

## 15. Standard/Deep Process Details

Absorbed from SKILL.md v2.0 to keep SKILL.md under 300 lines.

### 15.1 Clone Process (Phase 1)

1. Clone: `git clone --filter=blob:none --depth=1 <url>` to
   `/tmp/repo-analysis-<slug>/`
2. LFS check: `GIT_LFS_SKIP_SMUDGE=1` if `.gitattributes` detected
3. Monorepo detection (turbo.json, nx.json, pnpm-workspace.yaml, etc.)
4. Write the exact tracked inventory with `git -c core.quotePath=true ls-tree
   -r -l --full-tree <commit> > <output-dir>/inventory.txt`; verify it is
   non-empty.
5. For Deep: `git fetch --unshallow` or `--shallow-since="1 year ago"`
6. Update state file with clone path and strategy

### 15.2 Dimension Wave (Phase 2)

**Small repos (<20 files):** Analyze inline via Bash. Subagents cannot access
temp directories — do NOT spawn agents for small repos.

**Large repos (20+ files):** Copy clone to project workspace at
`.research/analysis/<slug>/source/`, then spawn agents against that path. Max 4
concurrent. See Section 10 for agent allocation.

**Agent failure handling (MUST):**

1. After each agent completes, verify dimension file exists
2. If file is empty (0 bytes — Windows agent output bug): capture
   task-notification result text, write to dimension file
3. If agent failed entirely: log failure reason, re-dispatch with narrower scope
   (same pattern as deep-research agent overflow)
4. If retry also fails: report to user, continue with available dimensions
5. NEVER silently accept missing dimension data

### 15.3 Temporal Analysis (Phase 3 — Deep only)

1. `git shortlog -sn --all` for contributor breakdown
2. `git log --format="%aI"` for commit velocity distribution
3. `git log --numstat` for churn hotspot detection
4. Bot-commit filtering (exclude dependabot, renovate, etc.)
5. Monthly aggregation for temporal fingerprint (Section 7)

### 15.4 Content Evaluation Detail (Phase 3.5)

> Absorbed from SKILL.md v5.0 to keep SKILL.md under ~330 lines. Phase 3.5 was
> numbered 4b prior to v5.0.

Evaluate embedded content for novelty, insight density, and its connection to
the repo's central idea. Runs before Creator View and respects the selected
depth's evidence cap.

#### 15.4.1 Curated-List / Registry Repos

The repo's value IS its links. Evaluate them, not just count them.

- **Depth 0 (MUST):** Parse entries, classify by category, and score categories
  by novelty and explanatory value.
- **Depth 1 (MUST for medium/high categories):** Evaluate individual entries
  within relevant categories. For each: name, what it does, auth requirements,
  the idea it demonstrates, and why it is distinctive. Filter structured
  metadata when it reveals an unusual pattern.
- **Depth 2 (interactive gate):** Targeted deep-dive on selected entries. Fetch
  docs, test endpoints, evaluate quality. Gate: _"N entries look relevant.
  Deep-dive? [Y/N/Select]"_

Output to `mined-links.jsonl` (curated-list) or `content-eval.jsonl` (other).
See §16 for link mining spec. If Depth 1 fetch fails for >50% of links, abort
Depth 1 and present Depth 0 results.

#### 15.4.2 Framework / Library / Tool Repos

Evaluate internal documentation artifacts identified in Deep Read (Phase 2b):

- **Guides and tutorials:** Read the highest-signal items within the evidence
  cap. Note the ideas unavailable from code alone.
- **Per-module docs** (e.g., 37 SKILL.md files in cli-anything): Sample
  representative examples. Identify the most and least instructive examples.
- **Embedded SKILL.md / instruction files:** Read representative files and note
  distinctive structural choices.

#### 15.4.3 Research / Experimental Repos

Evaluate referenced external resources:

- **Papers / arXiv references:** Summarize relevance. Note if the paper's
  methodology applies to home work.
- **Linked repos** (forks, parent repos, related projects): Catalog with
  one-line relevance assessment.
- **Datasets / models referenced:** Note if accessible and applicable.
- **Notebooks:** Read for methodology patterns, not just code.

#### 15.4.4 Output Schema

Write `content-eval.jsonl` with one entry per evaluated item:

```json
{
  "category": "guide|api|tutorial|paper|repo|notebook|skill-file",
  "name": "...",
  "url": "...",
  "relevance": "high|medium|low|none",
  "applicability": "...",
  "insight": "What this item teaches or reveals"
}
```

This output feeds directly into Creator View Section 2.

### 15.5 Coverage Audit Detail (Phase 6b)

> Absorbed from SKILL.md v5.0.

After all artifacts are written, scan for content that exists in the repo but
was NOT analyzed. Safety net that catches edge cases.

#### 15.5.1 Scan Categories

1. **Referenced but unfollowed links** — URLs in README, docs, or code comments
   pointing to external resources not evaluated in Phase 3.5.
2. **Internal artifacts not read** — guides, notebooks, examples, config files,
   embedded docs discovered in Phase 2b but not read.
3. **Structured data not queried** — metadata fields, categories, registry
   entries, and dependency lists that could reveal another strong idea.
4. **Cross-repo connections not traced** — references to other repos (analyzed
   or not) whose content relationships weren't explored.
5. **Anomalies** — unexpectedly large files, hidden directories, generated
   artifacts, binary blobs, config files suggesting undocumented features.

#### 15.5.2 Interactive Output Format

```
Coverage Audit: N unexplored items found.

  [A] Referenced links not evaluated (M items)
      - arXiv 2602.02474 (referenced in value-map)
      - https://github.com/karpathy/nanochat (parent repo)
  [B] Internal docs not read (K items)
      - guides/mcp-backend.md
      - guides/skill-generation.md
  [C] Structured data not queried (J items)
      - 807 API entries not ranked for novelty or insight density
  [D] Cross-repo connections (L items)
      - memskill arXiv -> autoresearch methodology overlap?
  [E] Anomalies (P items)
      - analysis.ipynb (8.4KB notebook, methodology patterns)

Analyze within remaining budget / Select categories / Defer? [A/S/N]
```

#### 15.5.3 User Decision Handling

- **Analyze** → Run one supplemental pass within the remaining depth budget,
  update affected artifacts, and re-verify.
- **Select categories** → Same as Analyze, but only for chosen categories.
- **Defer** → Record deferred items in `coverage-audit.jsonl` with
  `user_decision: "skip"`. Never recursively reopen analysis after the
  supplemental pass; a longer run requires explicit user extension.

### 15.6 Cross-Repo Extraction Tracking Detail

> Absorbed from SKILL.md v5.0.

Only after the user makes an extraction decision, append it to the extraction
journal and regenerate its reading view. Producing `value-map.json` alone does
not mutate downstream decision records.

#### 15.6.1 `extraction-journal.jsonl` Schema (v2.0, unified with website-analysis)

Machine-readable, one JSON object per line:

```json
{
  "schema_version": "2.0",
  "source_type": "repo",
  "source": "owner/name",
  "candidate": "Name",
  "type": "pattern|knowledge|content|anti-pattern|tool",
  "decision": "defer|extract|skip|investigate",
  "decision_date": "YYYY-MM-DD",
  "extracted_to": null,
  "extracted_at": null,
  "notes": "...",
  "novelty": "high|medium|low",
  "effort": "E0|E1|E2|E3",
  "relevance": "high|medium|low"
}
```

Keep the journal append-only. Record only user decisions; do not add every
discovered candidate.

#### 15.6.2 `EXTRACTIONS.md` Regeneration

Human-readable cross-repo summary with Table of Contents. **Do NOT edit
manually.** After updating the journal, run:

```bash
node scripts/generate-extractions.mjs
```

This regenerates the entire file from the journal including header stats, TOC
(source, type, candidate counts by category), and per-source tables.

#### 15.6.3 Canonicality

- `extraction-journal.jsonl` is the **data source** — always updated first.
- `EXTRACTIONS.md` is the **generated reading interface** — always regenerated
  from the journal, never manually appended.

Self-audit verifies: `grep -c "$SOURCE" .research/extraction-journal.jsonl` >= 1
AND the generator script output confirms the source is included in
EXTRACTIONS.md.

---

## 16. Link Mining Pipeline

Conditional part of Phase 3.5 that runs only when `repo_type` is
`curated-list` or `registry`. Extracts, scores, and optionally fetches links
found in the repository's markdown files. Output: `mined-links.jsonl` (Section
3.7).

### 16.1 Phase 3.5 Link-Mining Process (10 Steps)

```
3.5.1  Parse markdown structure --> extract all links with context
3.5.2  Categorize links using source repo's own category structure
3.5.3  Score at Depth 0 (novelty + connection to the repo's central idea)
3.5.4  Write mined-links.jsonl with confidence: "low"
3.5.5  Select the highest-signal links within the depth evidence cap
3.5.6  Depth 1: HEAD-first (5 req/sec), selective full fetch (1 req/sec)
3.5.7  Update mined-links.jsonl: confidence --> "high", fetch_status updated
3.5.8  Present top-N by novelty and insight density
3.5.9  Interactive gate: "Targeted deep-dive on specific links? [select/N]"
3.5.10 If yes --> Depth 2: full fetch + analysis on selected links only
```

### 16.2 Markdown Parsing Rules

Three link formats detected, in order of prevalence in curated lists:

**List format** (most common in awesome-lists):

```markdown
- [Title](URL) - Description
- [Title](URL) -- Description
```

**Table format:**

```markdown
| Name    | URL                                 | Description          |
| ------- | ----------------------------------- | -------------------- |
| FastAPI | https://github.com/tiangolo/fastapi | Modern web framework |
```

**Heading-based categories:**

```markdown
## Category Name

### Subcategory Name

- [Title](URL) - Description
```

The source repo's category taxonomy is preserved in the `category` field of
`mined-links.jsonl`. Heading hierarchy maps to category path (e.g.,
`"Web Frameworks > Python"`).

### 16.3 Depth 1 -- HEAD-First Strategy

Designed for bounded evaluation of large curated lists. Inventory all links,
then fetch no more than the selected depth's evidence cap.

1. **Group links by domain.** Links to the same domain share rate limit budget.
2. **HEAD request at 5 req/sec**, max 5 concurrent per domain. Record:
   - HTTP status code
   - Content-Type header
   - Content-Length header
   - Title from headers (if available)
3. **Filter for full fetch.** Only full-fetch links where:
   - Depth 0 novelty or insight score is high, and
   - the item helps explain the repo's central idea
4. **Full fetch filtered links at 1 req/sec.** Extract:
   - Page title (from `<title>` tag)
   - Meta description
   - Open Graph tags (`og:title`, `og:description`, `og:image`)
   - First 500 characters of body text
5. **Re-score with enriched data.** Update `confidence: "high"` in
   `mined-links.jsonl`.

### 16.4 Depth 2 -- Targeted Deep-Dive

User selects specific links from Depth 1 results. For each selected link:

1. Full page fetch and analysis
2. Follow internal links one level (links within the same domain)
3. Write enriched findings to `mined-links.jsonl` with `depth: 2`

### 16.5 Link Scoring Context

Use the repository's thesis, taxonomy, docs, and named peers. Load Personal
Brain project context only for an explicitly requested adoption follow-up.

---

## 17. Cross-Repo Awareness

Lightweight cross-referencing during per-repo analysis. Not full synthesis
(that's `/synthesize`) -- just awareness of what's already been analyzed and how
repos relate.

### 17.1 During Phase 4 (Creator View)

1. Check `.research/analysis/*/value-map.json` for existing analyses
2. If matches found (similar `ecosystem_tags`, overlapping candidates):
   - Add cross-reference notes in Creator View Section 2 (What's Relevant)
   - Example: "This repo's rate limiter pattern is similar to what you found in
     fastapi/fastapi (analyzed 2026-03-15). Their approach differs in..."
3. Record consequential repository relationships in `reading-chain.jsonl`;
   keep `value-map.json` focused on immutable knowledge candidates.

### 17.2 During Phase 6 (Value Map Generation)

1. Append to `.research/analysis/reading-chain.jsonl` (Section 3.8) for any repo
   relationships discovered during analysis
2. Check `reading-chain.jsonl` for existing chains that this repo extends
3. If this repo was referenced by a previously-analyzed repo, note the
   back-reference

### 17.3 Synthesis Auto-Offer

After analysis completion, if 3+ repos have been analyzed:

```
"You've analyzed [N] repos. Cross-repo synthesis available via /synthesize.
Run now? [y/N]"
```

Check: `ls .research/analysis/*/analysis.json | wc -l >= 3`

---

## 18. Version History

| Version | Date       | Description                                         |
| ------- | ---------- | --------------------------------------------------- |
| 4.3     | 2026-09-08 | Discovery-first Creator View, opt-in adoption, and  |
|         |            | bounded evidence and runtime budgets.               |
| 4.0     | 2026-04-05 | Creator View v2: dual scoring lens, 6-section CV,   |
|         |            | repo type classification, link mining pipeline,     |
|         |            | fit separation, anti-ideas, cross-repo awareness,   |
|         |            | reading chain. 30-decision deep-plan.               |
| 3.0     | 2026-04-03 | Dual-lens rewrite: Creator View + Engineer View.    |
|         |            | Knowledge dimensions (KN-01-05). No silent skips.   |
|         |            | Inline analysis for small repos. Repomix mandatory. |
|         |            | SKILL.md compressed to <300 lines.                  |
| 2.0     | 2026-04-03 | Schema alignment, adoption assessment, extraction   |
|         |            | persistence, agent capture fixes, repomix           |
| 1.2     | 2026-04-03 | Output path: .research/analysis/<slug>/             |
| 1.1     | 2026-04-02 | Skill-audit: 16 decisions — UX, guard rails, labels |
| 1.0     | 2026-04-02 | Initial: 3 tiers, 45 dimensions, routing, resume    |
