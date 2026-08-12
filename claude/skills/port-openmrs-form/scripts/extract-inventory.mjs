#!/usr/bin/env node
// Extract a question, section, answer, and expression inventory from an O3 or AMPATH form JSON.
//
// Usage:
//   node extract-inventory.mjs FORM.json [--report inventory.json]

import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const formPath = args.find((arg) => !arg.startsWith("--"));
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

if (!formPath) {
  console.error("Usage: extract-inventory.mjs FORM.json [--report inventory.json]");
  process.exit(2);
}

const reportPath = option("--report");
const uuidPattern = /^[A-Za-z0-9-]{36,38}$/;
const expressionKeys = new Set([
  "hideWhenExpression", "disableWhenExpression", "failsWhenExpression", "calculateExpression",
  "historicalExpression",
]);

let form;
try {
  form = JSON.parse(await fs.readFile(formPath, "utf8"));
} catch (error) {
  console.error(`Could not parse ${formPath}: ${error.message}`);
  process.exit(1);
}

const questions = [];
const expressions = [];
const conceptIndex = new Map();

const recordConcept = (uuid, role, label, fieldId) => {
  if (typeof uuid !== "string") return;
  if (!conceptIndex.has(uuid)) {
    conceptIndex.set(uuid, { uuid, roles: new Set(), labels: new Set(), fields: new Set() });
  }
  const entry = conceptIndex.get(uuid);
  entry.roles.add(role);
  if (label) entry.labels.add(label);
  if (fieldId) entry.fields.add(fieldId);
};

const collectExpressions = (value, location, fieldId) => {
  if (Array.isArray(value)) return value.forEach((item, index) => collectExpressions(item, `${location}[${index}]`, fieldId));
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (expressionKeys.has(key) && typeof child === "string") {
      expressions.push({ location: `${location}.${key}`, fieldId, key, expression: child });
    } else {
      collectExpressions(child, `${location}.${key}`, fieldId);
    }
  }
};

const normalizeRequired = (required) => {
  if (required === true || required === "true") return "Yes";
  if (required && typeof required === "object") return "Conditional";
  return "No";
};

const collectQuestions = (items, context) => {
  for (let index = 0; index < (items ?? []).length; index += 1) {
    const question = items[index];
    const location = `${context.location}.questions[${index}]`;
    const options = question.questionOptions ?? {};
    const answers = (options.answers ?? []).map((answer) => ({
      concept: answer.concept ?? null,
      label: answer.label ?? null,
    }));
    const entry = {
      order: questions.length + 1,
      location,
      page: context.page,
      section: context.section,
      parentId: context.parentId,
      id: question.id ?? null,
      label: question.label ?? null,
      type: question.type ?? null,
      rendering: options.rendering ?? null,
      units: options.units ?? null,
      concept: options.concept ?? null,
      required: normalizeRequired(question.required),
      answers,
      validators: question.validators ?? [],
      expressions: {},
    };
    const before = expressions.length;
    collectExpressions(question, location, question.id ?? null);
    for (const item of expressions.slice(before)) {
      if (!(item.key in entry.expressions)) entry.expressions[item.key] = item.expression;
    }
    questions.push(entry);
    recordConcept(options.concept, "question", question.label, question.id);
    for (const answer of answers) recordConcept(answer.concept, "answer", answer.label, question.id);
    collectQuestions(question.questions, { ...context, location, parentId: question.id ?? context.parentId });
  }
};

const pages = [];
for (let pageIndex = 0; pageIndex < (form.pages ?? []).length; pageIndex += 1) {
  const page = form.pages[pageIndex];
  const sections = [];
  for (let sectionIndex = 0; sectionIndex < (page.sections ?? []).length; sectionIndex += 1) {
    const section = page.sections[sectionIndex];
    const before = questions.length;
    collectQuestions(section.questions, {
      location: `pages[${pageIndex}].sections[${sectionIndex}]`,
      page: page.label ?? `Page ${pageIndex + 1}`,
      section: section.label ?? `Section ${sectionIndex + 1}`,
      parentId: null,
    });
    sections.push({ label: section.label ?? null, questions: questions.length - before });
  }
  pages.push({ label: page.label ?? null, sections });
}

const concepts = [...conceptIndex.values()]
  .map((entry) => ({
    uuid: entry.uuid,
    malformed: !uuidPattern.test(entry.uuid) || undefined,
    roles: [...entry.roles].sort(),
    labels: [...entry.labels],
    fields: [...entry.fields],
  }))
  .sort((a, b) => a.uuid.localeCompare(b.uuid));

const report = {
  tool: "port-openmrs-form inventory",
  form: {
    path: path.resolve(formPath),
    name: form.name ?? null,
    uuid: form.uuid ?? null,
    version: form.version ?? null,
    encounterType: form.encounterType ?? null,
    published: form.published ?? null,
  },
  summary: {
    pages: pages.length,
    sections: pages.reduce((count, page) => count + page.sections.length, 0),
    questions: questions.length,
    answers: questions.reduce((count, question) => count + question.answers.length, 0),
    distinctConcepts: concepts.length,
    expressions: expressions.length,
  },
  pages,
  questions,
  concepts,
  expressions,
};

if (reportPath) await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Form: ${report.form.name ?? "(unnamed)"}`);
console.log(`Pages: ${report.summary.pages}; sections: ${report.summary.sections}; questions: ${report.summary.questions}`);
console.log(`Answers: ${report.summary.answers}; distinct concepts: ${report.summary.distinctConcepts}; expressions: ${report.summary.expressions}`);
if (reportPath) console.log(`Inventory written to ${reportPath}`);
