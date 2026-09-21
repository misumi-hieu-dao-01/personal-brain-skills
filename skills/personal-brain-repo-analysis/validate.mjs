#!/usr/bin/env node

import { readFileSync } from "node:fs";

const [kind, path, findingsPath] = process.argv.slice(2);
const fail = message => { throw new Error(message); };
const object = (value, name) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${name} must be an object`);
};
const string = (value, name) => {
  if (typeof value !== "string" || !value.trim()) fail(`${name} must be a non-empty string`);
};
const oneOf = (value, values, name) => {
  if (!values.includes(value)) fail(`${name} must be one of: ${values.join(", ")}`);
};
const json = file => JSON.parse(readFileSync(file, "utf8"));

if (!path || !["analysis", "value-map"].includes(kind)) {
  fail("usage: validate.mjs analysis <analysis.json> | value-map <value-map.json> [findings.jsonl]");
}

const data = json(path);
object(data, kind);

if (kind === "analysis") {
  string(data.id, "id");
  oneOf(data.schema_version, ["3.0"], "schema_version");
  oneOf(data.source_type, ["repo"], "source_type");
  for (const key of ["source", "slug", "title", "analyzed_at", "summary", "creator_view"]) string(data[key], key);
  oneOf(data.depth, ["quick", "standard", "deep"], "depth");
  if (!Array.isArray(data.tags)) fail("tags must be an array");
  if (!Array.isArray(data.candidates)) fail("candidates must be an array");
  object(data.scoring, "scoring");
  oneOf(data.scoring.quality_band, ["Excellent", "Healthy", "Needs Work", "Critical"], "scoring.quality_band");
  if (typeof data.scoring.quality_score !== "number" || data.scoring.quality_score < 0 || data.scoring.quality_score > 100) fail("scoring.quality_score must be between 0 and 100");
  if (data.last_synthesized_at !== null && typeof data.last_synthesized_at !== "string") fail("last_synthesized_at must be a string or null");
} else {
  oneOf(data.schema_version, ["3.0"], "schema_version");
  for (const key of ["repository", "analyzed_at"]) string(data[key], key);
  oneOf(data.depth, ["standard", "deep"], "depth");
  if (!Array.isArray(data.candidates)) fail("candidates must be an array");
  if (!data.candidates.length) string(data.no_candidates_reason, "no_candidates_reason");
  const ids = new Set();
  const ranks = new Set();
  const evidence = new Set();
  for (const [index, candidate] of data.candidates.entries()) {
    object(candidate, `candidates[${index}]`);
    for (const key of ["id", "name", "mechanism", "why_it_matters", "limitations"]) string(candidate[key], `candidates[${index}].${key}`);
    oneOf(candidate.kind, ["pattern", "knowledge", "content", "anti-pattern"], `candidates[${index}].kind`);
    oneOf(candidate.confidence, ["confirmed", "inferred", "unverified"], `candidates[${index}].confidence`);
    for (const key of ["novelty", "portability", "relevance"]) oneOf(candidate[key], ["high", "medium", "low"], `candidates[${index}].${key}`);
    oneOf(candidate.effort, ["E0", "E1", "E2", "E3"], `candidates[${index}].effort`);
    if (!Number.isInteger(candidate.rank) || candidate.rank < 1) fail(`candidates[${index}].rank must be a positive integer`);
    if (!Array.isArray(candidate.evidence) || !candidate.evidence.length) fail(`candidates[${index}].evidence must be a non-empty array`);
    if (ids.has(candidate.id) || ranks.has(candidate.rank)) fail("candidate ids and ranks must be unique");
    ids.add(candidate.id);
    ranks.add(candidate.rank);
    candidate.evidence.forEach(id => evidence.add(id));
  }
  if (findingsPath) {
    const findingIds = new Set(readFileSync(findingsPath, "utf8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line).id));
    for (const id of evidence) if (!findingIds.has(id)) fail(`missing finding for evidence id: ${id}`);
  }
}

console.log(`${kind}: valid`);
