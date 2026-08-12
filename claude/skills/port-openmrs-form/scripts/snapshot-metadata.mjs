#!/usr/bin/env node
// Build a metadata report for a form from a local dictionary snapshot instead of live REST.
// The report has the same shape audit-o3-form.mjs and build-workbook.py consume.
//
// Usage:
//   node snapshot-metadata.mjs FORM.json --snapshot DIR --report metadata-report.json
//
// DIR must contain a concepts *.jsonl.gz (one concept per line: uuid, name, retired, ...)
// and optionally encountertypes.json. Example: openmrs-content-amrs/drafts/amrs-dictionary-snapshot-*/.
//
// Limitation: snapshot listings exclude retired concepts, so "not found" here means
// "not active on the target" — a concept may exist as retired. Confirm retirement with a
// direct GET or fetch-target-metadata.mjs. Snapshot evidence is fine for review mode;
// release-candidate mode requires a live fetch-target-metadata.mjs report.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const args = process.argv.slice(2);
const formPath = args.find((arg) => !arg.startsWith("--"));
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
let snapshotDir = option("--snapshot");
const reportPath = option("--report") ?? "metadata-report.json";
if (!snapshotDir) {
  // Default to the newest snapshot bundled with the skill (assets/ next to scripts/).
  const assets = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "assets");
  const bundled = fs.existsSync(assets)
    ? fs.readdirSync(assets).filter((d) => d.includes("dictionary-snapshot")).sort().at(-1)
    : null;
  if (bundled) snapshotDir = path.join(assets, bundled);
}
if (!formPath || !snapshotDir) {
  console.error("Usage: snapshot-metadata.mjs FORM.json [--snapshot DIR] [--report metadata-report.json]");
  console.error("No --snapshot given and no bundled snapshot found in the skill's assets directory.");
  process.exit(2);
}

const conceptsFile = fs.readdirSync(snapshotDir).find((f) => f.endsWith(".jsonl.gz"));
if (!conceptsFile) {
  console.error(`No *.jsonl.gz concepts file found in ${snapshotDir}`);
  process.exit(2);
}
const snapshot = new Map();
const lines = zlib.gunzipSync(fs.readFileSync(path.join(snapshotDir, conceptsFile))).toString("utf8").split("\n");
for (const line of lines) {
  if (!line.trim()) continue;
  const concept = JSON.parse(line);
  snapshot.set(concept.uuid, concept);
}

const form = JSON.parse(fs.readFileSync(formPath, "utf8"));
const conceptUuids = new Set();
const walk = (value) => {
  if (Array.isArray(value)) return value.forEach(walk);
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "concept" && typeof child === "string" && child) conceptUuids.add(child);
    walk(child);
  }
};
walk(form);

const concepts = {};
let found = 0;
for (const uuid of conceptUuids) {
  const hit = snapshot.get(uuid);
  if (hit) {
    concepts[uuid] = { exists: true, retired: Boolean(hit.retired), name: hit.name };
    found += 1;
  } else {
    concepts[uuid] = { exists: false };
  }
}

let encounterType = { uuid: form.encounterType ?? "", exists: false, retired: false };
const encounterFile = path.join(snapshotDir, "encountertypes.json");
if (form.encounterType && fs.existsSync(encounterFile)) {
  const types = JSON.parse(fs.readFileSync(encounterFile, "utf8")).results ?? [];
  const hit = types.find((t) => t.uuid === form.encounterType);
  if (hit) encounterType = { uuid: hit.uuid, exists: true, retired: Boolean(hit.retired), name: hit.name };
}

const snapshotDate = (conceptsFile.match(/(\d{4}-\d{2}-\d{2})/) ?? [null, null])[1];
const report = {
  targetBaseUrl: `snapshot:${path.resolve(snapshotDir)}`,
  checkedAt: snapshotDate ? `${snapshotDate}T00:00:00Z` : new Date(0).toISOString(),
  source: "dictionary-snapshot",
  note: "Snapshot listings exclude retired concepts: exists=false means not active; it may exist as retired. Use fetch-target-metadata.mjs for release-candidate verification.",
  encounterType,
  concepts,
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 1)}\n`);
console.log(`Snapshot (${snapshot.size} concepts, ${snapshotDate ?? "undated"}): ${found} of ${conceptUuids.size} form concepts active; encounter type ${encounterType.exists ? "found" : "not found"}.`);
console.log(`Report written to ${reportPath}`);
