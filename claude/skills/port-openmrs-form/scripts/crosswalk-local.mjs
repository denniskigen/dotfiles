#!/usr/bin/env node
// Cross-reference a form's concept UUIDs against local OpenMRS content repositories:
// Initializer concept CSVs and existing form JSON files.
// Local evidence supports the crosswalk but never replaces a live target check.
//
// Usage:
//   node crosswalk-local.mjs FORM.json --content-repo PATH [--content-repo PATH2] [--report crosswalk-local.json]

import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const formPath = args.find((arg, index) => !arg.startsWith("--") && !(args[index - 1] ?? "").startsWith("--"));
const repos = args.flatMap((arg, index) => (arg === "--content-repo" ? [args[index + 1]] : []));
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

if (!formPath || repos.length === 0) {
  console.error("Usage: crosswalk-local.mjs FORM.json --content-repo PATH [--content-repo PATH2] [--report crosswalk-local.json]");
  process.exit(2);
}

const reportPath = option("--report");
const uuidPattern = /^[A-Za-z0-9-]{36,38}$/;
const uuidTokenPattern = /[A-Za-z0-9-]{36,38}/;

let form;
try {
  form = JSON.parse(await fs.readFile(formPath, "utf8"));
} catch (error) {
  console.error(`Could not parse ${formPath}: ${error.message}`);
  process.exit(1);
}

// Collect the form's concept UUIDs with labels for readable output.
const formConcepts = new Map();
const collect = (value, label = null) => {
  if (Array.isArray(value)) return value.forEach((item) => collect(item, label));
  if (!value || typeof value !== "object") return;
  const ownLabel = typeof value.label === "string" ? value.label : label;
  for (const [key, child] of Object.entries(value)) {
    if (key === "concept" && typeof child === "string" && uuidPattern.test(child)) {
      if (!formConcepts.has(child)) formConcepts.set(child, new Set());
      if (ownLabel) formConcepts.get(child).add(ownLabel);
    }
    collect(child, ownLabel);
  }
};
collect(form);
const encounterTypeUuid = typeof form.encounterType === "string" ? form.encounterType : null;

// Minimal CSV parser that handles quoted fields.
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
};

const findColumn = (headers, matcher) => headers.findIndex((header) => matcher.test(header.trim()));

const listFiles = async (dir) => {
  const files = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full)));
    else files.push(full);
  }
  return files;
};

const definitions = new Map(); // uuid -> [{file, name, retired, dataClass, dataType, kind}]
const csvOccurrences = new Map(); // uuid -> Set(files)
const formUsage = new Map(); // uuid -> Set(form files)
const encounterTypeDefs = new Map(); // uuid -> [{file, name, retired}]
let csvCount = 0;
let jsonFormCount = 0;
let unreadable = 0;

for (const repo of repos) {
  const repoRoot = path.resolve(repo);
  const files = await listFiles(repoRoot);
  for (const file of files) {
    const relative = path.relative(repoRoot, file);
    const shortName = `${path.basename(repoRoot)}/${relative}`;
    if (file.endsWith(".csv")) {
      let rows;
      try {
        rows = parseCsv(await fs.readFile(file, "utf8"));
      } catch {
        unreadable += 1;
        continue;
      }
      if (rows.length === 0) continue;
      csvCount += 1;
      const headers = rows[0];
      const uuidColumn = findColumn(headers, /^uuid$/i);
      const nameColumn = findColumn(headers, /fully specified name|^name$|^display/i);
      const retireColumn = findColumn(headers, /void\/retire/i);
      const classColumn = findColumn(headers, /^data class$/i);
      const typeColumn = findColumn(headers, /^data type$/i);
      const isEncounterTypeCsv = /encountertype/i.test(relative);
      for (const row of rows.slice(1)) {
        for (const value of row) {
          const token = value.trim();
          if (uuidPattern.test(token)) {
            if (!csvOccurrences.has(token)) csvOccurrences.set(token, new Set());
            csvOccurrences.get(token).add(shortName);
          }
        }
        if (uuidColumn >= 0) {
          const uuid = (row[uuidColumn] ?? "").trim();
          if (!uuidPattern.test(uuid)) continue;
          const definition = {
            file: shortName,
            name: nameColumn >= 0 ? (row[nameColumn] ?? "").trim() || null : null,
            retired: retireColumn >= 0 ? /true|yes/i.test(row[retireColumn] ?? "") : false,
            dataClass: classColumn >= 0 ? (row[classColumn] ?? "").trim() || null : null,
            dataType: typeColumn >= 0 ? (row[typeColumn] ?? "").trim() || null : null,
          };
          if (isEncounterTypeCsv) {
            if (!encounterTypeDefs.has(uuid)) encounterTypeDefs.set(uuid, []);
            encounterTypeDefs.get(uuid).push(definition);
          } else {
            if (!definitions.has(uuid)) definitions.set(uuid, []);
            definitions.get(uuid).push(definition);
          }
        }
      }
    } else if (file.endsWith(".json")) {
      let parsed;
      try {
        parsed = JSON.parse(await fs.readFile(file, "utf8"));
      } catch {
        unreadable += 1;
        continue;
      }
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.pages)) continue;
      jsonFormCount += 1;
      const record = (value) => {
        if (Array.isArray(value)) return value.forEach(record);
        if (!value || typeof value !== "object") return;
        for (const [key, child] of Object.entries(value)) {
          if (key === "concept" && typeof child === "string" && uuidTokenPattern.test(child)) {
            if (!formUsage.has(child)) formUsage.set(child, new Set());
            formUsage.get(child).add(shortName);
          }
          record(child);
        }
      };
      record(parsed);
    }
  }
}

const classify = (uuid) => {
  if (definitions.has(uuid)) return "defined-locally";
  if (csvOccurrences.has(uuid) || formUsage.has(uuid)) return "referenced-only";
  return "not-found-locally";
};

const concepts = [...formConcepts.keys()].sort().map((uuid) => ({
  uuid,
  labels: [...formConcepts.get(uuid)],
  status: classify(uuid),
  definitions: definitions.get(uuid) ?? [],
  csvFiles: [...(csvOccurrences.get(uuid) ?? [])].sort(),
  usedInForms: [...(formUsage.get(uuid) ?? [])].sort(),
}));

const encounterType = encounterTypeUuid
  ? {
      uuid: encounterTypeUuid,
      status: encounterTypeDefs.has(encounterTypeUuid) ? "defined-locally" : classify(encounterTypeUuid),
      definitions: encounterTypeDefs.get(encounterTypeUuid) ?? [],
    }
  : null;

const summary = {
  formConcepts: concepts.length,
  definedLocally: concepts.filter((c) => c.status === "defined-locally").length,
  referencedOnly: concepts.filter((c) => c.status === "referenced-only").length,
  notFoundLocally: concepts.filter((c) => c.status === "not-found-locally").length,
  csvFilesScanned: csvCount,
  formJsonFilesScanned: jsonFormCount,
  unreadableFiles: unreadable,
};

const report = {
  tool: "port-openmrs-form local crosswalk",
  note: "Local repository evidence only. Verify live target metadata separately with fetch-target-metadata.mjs.",
  form: path.resolve(formPath),
  contentRepos: repos.map((repo) => path.resolve(repo)),
  checkedAt: new Date().toISOString(),
  summary,
  encounterType,
  concepts,
};

if (reportPath) await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Scanned ${csvCount} CSV file(s) and ${jsonFormCount} form JSON file(s) in ${repos.length} repo(s).`);
console.log(`Form concepts: ${summary.formConcepts} — ${summary.definedLocally} defined locally, ${summary.referencedOnly} referenced only, ${summary.notFoundLocally} not found locally.`);
if (encounterType) console.log(`Encounter type ${encounterType.uuid}: ${encounterType.status}`);
console.log("Local evidence only. Verify live target metadata with fetch-target-metadata.mjs.");
if (reportPath) console.log(`Crosswalk written to ${reportPath}`);
