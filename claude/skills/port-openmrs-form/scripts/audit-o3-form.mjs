#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const formPath = args.find((arg) => !arg.startsWith("--"));
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

if (!formPath) {
  console.error("Usage: audit-o3-form.mjs FORM.json --mode review|exercise|release-candidate [--metadata-report metadata.json] [--report report.json]");
  process.exit(2);
}

const mode = option("--mode", "review");
if (!["review", "exercise", "release-candidate"].includes(mode)) {
  console.error(`Unsupported mode: ${mode}`);
  process.exit(2);
}

const reportPath = option("--report");
const metadataPath = option("--metadata-report");
// OpenMRS UUIDs are opaque strings (varchar(38)), commonly CIEL-style with no hyphens.
const uuidPattern = /^[A-Za-z0-9-]{36,38}$/;
const camelCasePattern = /^[a-z][A-Za-z0-9]*$/;
const errors = [];
const warnings = [];
const manualChecks = [];

let form;
try {
  form = JSON.parse(await fs.readFile(formPath, "utf8"));
} catch (error) {
  console.error(`Could not parse ${formPath}: ${error.message}`);
  process.exit(1);
}

const fields = [];
const collectFields = (questions, location) => {
  for (let index = 0; index < (questions ?? []).length; index += 1) {
    const field = questions[index];
    const fieldLocation = `${location}.questions[${index}]`;
    fields.push({ field, location: fieldLocation });
    collectFields(field.questions, fieldLocation);
  }
};

for (let pageIndex = 0; pageIndex < (form.pages ?? []).length; pageIndex += 1) {
  const page = form.pages[pageIndex];
  for (let sectionIndex = 0; sectionIndex < (page.sections ?? []).length; sectionIndex += 1) {
    collectFields(page.sections[sectionIndex].questions, `pages[${pageIndex}].sections[${sectionIndex}]`);
  }
}

if (!Array.isArray(form.pages) || form.pages.length === 0) errors.push("The form has no pages.");
if (fields.length === 0) errors.push("The form has no fields.");
if (form.published !== false) errors.push("Set published to false for a steps 1–7 candidate.");
if (typeof form.uuid !== "string" || !uuidPattern.test(form.uuid)) errors.push("The top-level form uuid is missing or malformed.");
if (typeof form.encounterType !== "string" || !uuidPattern.test(form.encounterType)) errors.push("The encounterType UUID is missing or malformed.");
if (typeof form.$schema !== "string" || !form.$schema.includes("form.schema.json")) warnings.push("The $schema value does not identify form.schema.json.");

const ids = [];
for (const { field, location } of fields) {
  if (typeof field.id !== "string" || field.id.length === 0) {
    errors.push(`${location} is missing id.`);
  } else {
    ids.push(field.id);
    if (!camelCasePattern.test(field.id)) errors.push(`${location}.id is not lower camel case: ${field.id}`);
  }
  if (!field.questionOptions || typeof field.questionOptions !== "object") {
    errors.push(`${location} is missing questionOptions.`);
  }
}

const idSet = new Set(ids);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
for (const id of duplicateIds) errors.push(`Duplicate field id: ${id}`);

const expressionKeys = new Set([
  "hideWhenExpression", "disableWhenExpression", "failsWhenExpression", "calculateExpression",
  "historicalExpression", "alertWhenExpression",
]);
// Helpers and scope variables the Angular form engine injects into expressions
// (openmrs-ngx-formentry: JsExpressionHelper.helperFunctions + ExpressionRunner scope,
// plus data sources registered by esm-form-entry-app). Implementations can register
// additional helpers and data sources, so unknown identifiers are never errors.
const expressionBuiltins = new Set([
  // JavaScript keywords and globals
  "false", "in", "instanceof", "isNaN", "new", "null", "parseFloat", "parseInt",
  "return", "this", "true", "typeof", "undefined",
  // JsExpressionHelper.helperFunctions
  "arrayContains", "arrayContainsAny", "calcBMI", "calcBMIForAgeZscore", "calcBSA",
  "calcGravida", "calcHeightForAgeZscore", "calcSouthEastAsiaNonLabCVDRisk",
  "calcWeightForHeightZscore", "doesNotMatchExpression", "extractRepeatingGroupValues",
  "formatDate", "getObsFromControlOrEncounter", "isEmpty",
  // ExpressionRunner scope and registered data sources
  "_", "age", "conceptAnswers", "diagnoses", "drug", "endpoint", "location", "moment",
  "monthlyScheduleResourceService", "myValue", "patient", "personAttribute", "problem",
  "provider", "rawPrevEnc", "rawPrevObs", "sex", "userLocation", "visitType",
  "visitTypeUuid",
]);
const expressions = [];
const conceptUuids = new Set();
const badKeyCases = [];
const fieldAnswerLabels = new Map();

const walk = (value, location = "") => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${location}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    const childLocation = location ? `${location}.${key}` : key;
    if (["ID", "Id", "UUID", "Uuid"].includes(key)) badKeyCases.push(childLocation);
    if (key === "concept" && typeof child === "string") conceptUuids.add(child);
    if (expressionKeys.has(key) && typeof child === "string") expressions.push({ location: childLocation, expression: child });
    walk(child, childLocation);
  }
};
walk(form);

for (const location of badKeyCases) errors.push(`Non-normalized identifier key: ${location}`);
for (const uuid of conceptUuids) {
  if (!uuidPattern.test(uuid)) errors.push(`Malformed concept UUID: ${uuid}`);
}

for (const { field, location } of fields) {
  // The Angular engine reads question.alert as a single object and hands
  // alert.alertWhenExpression to ExpressionRunner, which calls .indexOf on it outside its
  // try block. An array, or an alert without the expression (e.g.
  // {useConceptReferenceRange: true}), throws during change detection and the whole form
  // renders blank.
  if (field.alert) {
    if (Array.isArray(field.alert)) {
      errors.push(`${location}.alert is an array; the Angular engine expects one alert object and the form renders blank.`);
    } else if (typeof field.alert.alertWhenExpression !== "string") {
      errors.push(`${location}.alert has no alertWhenExpression; this crashes the Angular engine and the form renders blank.`);
    }
  }
  // Coded values are answer UUIDs at runtime; comparing a coded field to one of its own
  // answer labels can never match, so the condition is permanently true or false.
  const answerLabels = new Map();
  for (const answer of field.questionOptions?.answers ?? []) {
    if (typeof answer.label === "string") answerLabels.set(answer.label, field.id);
  }
  if (answerLabels.size > 0 && typeof field.id === "string") fieldAnswerLabels.set(field.id, answerLabels);
}

for (const { location, expression } of expressions) {
  for (const match of expression.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*(?:[!=]==?)\s*'((?:\\.|[^'\\])*)'/g)) {
    const [, identifier, literal] = match;
    const labels = fieldAnswerLabels.get(identifier);
    if (labels?.has(literal) && !uuidPattern.test(literal)) {
      errors.push(`${location} compares ${identifier} to the answer label '${literal}'; coded values are UUIDs, so this can never match.`);
    }
  }
}

for (const { field, location } of fields) {
  if (field.required && typeof field.required === "object") {
    const reference = field.required.referenceQuestionId;
    if (typeof reference !== "string" || !idSet.has(reference)) {
      errors.push(`${location}.required.referenceQuestionId does not resolve: ${reference ?? "(missing)"}`);
    }
  }
}

for (const { location, expression } of expressions) {
  const withoutStrings = expression.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, " ");
  const withoutProperties = withoutStrings.replace(/\.\s*[A-Za-z_$][A-Za-z0-9_$]*/g, " ");
  const tokens = withoutProperties.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) ?? [];
  for (const token of tokens) {
    if (idSet.has(token) || expressionBuiltins.has(token)) continue;
    if (/^[A-Z]/.test(token)) continue;
    warnings.push(`${location} contains an identifier that is not a field id or a known form-engine helper: ${token}`);
  }
}

const sampleFlags =
  form.meta?.exerciseOnly === true ||
  form.meta?.containsSampleConceptUuids === true ||
  /\bexercise\b|\bsample\b|\bplaceholder\b/i.test(`${form.name ?? ""} ${form.description ?? ""}`);

if (mode === "exercise" && !sampleFlags) warnings.push("Exercise mode is selected but the form is not clearly marked as an exercise.");
if (mode === "release-candidate" && sampleFlags) errors.push("Release-candidate mode cannot contain exercise, sample, or placeholder markers.");

let metadata = null;
if (metadataPath) {
  try {
    metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
  } catch (error) {
    errors.push(`Could not read metadata report: ${error.message}`);
  }
}

if (mode === "release-candidate") {
  if (!metadata) {
    errors.push("Release-candidate mode requires --metadata-report from live read-only target checks.");
  } else if (metadata.source === "dictionary-snapshot" || String(metadata.targetBaseUrl ?? "").startsWith("snapshot:")) {
    errors.push("The metadata report comes from a dictionary snapshot. Release-candidate mode needs live checks against the target (fetch-target-metadata.mjs).");
  } else {
    if (metadata.encounterType?.uuid !== form.encounterType || metadata.encounterType?.exists !== true || metadata.encounterType?.retired === true) {
      errors.push("The encounter type is not verified as existing and active in the metadata report.");
    }
    for (const uuid of conceptUuids) {
      const evidence = metadata.concepts?.[uuid];
      if (!evidence || evidence.exists !== true || evidence.retired === true) {
        errors.push(`Concept is not verified as existing and active: ${uuid}`);
      }
    }
  }
} else {
  manualChecks.push("Verify every target concept and the encounter type live before release-candidate status.");
}

manualChecks.push("Run canonical validation against the current OpenMRS form.schema.json.");
manualChecks.push("Complete the no-save Form Builder preview checklist.");

const report = {
  tool: "port-openmrs-form semantic audit",
  form: path.resolve(formPath),
  mode,
  summary: {
    pages: Array.isArray(form.pages) ? form.pages.length : 0,
    sections: (form.pages ?? []).reduce((count, page) => count + (page.sections?.length ?? 0), 0),
    fields: fields.length,
    uniqueFieldIds: idSet.size,
    conceptUuids: conceptUuids.size,
    errors: errors.length,
    warnings: [...new Set(warnings)].length,
  },
  conceptUuids: [...conceptUuids].sort(),
  errors,
  warnings: [...new Set(warnings)],
  manualChecks,
};

if (reportPath) await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Semantic audit: ${errors.length === 0 ? "PASS" : "FAIL"}`);
console.log(`Mode: ${mode}`);
console.log(`Pages: ${report.summary.pages}; sections: ${report.summary.sections}; fields: ${report.summary.fields}; concepts: ${report.summary.conceptUuids}`);
console.log(`Errors: ${report.summary.errors}; warnings: ${report.summary.warnings}`);
for (const error of errors) console.log(`ERROR: ${error}`);
for (const warning of report.warnings) console.log(`WARNING: ${warning}`);

process.exit(errors.length === 0 ? 0 : 1);
