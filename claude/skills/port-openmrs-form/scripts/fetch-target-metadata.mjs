#!/usr/bin/env node
// Read-only fetch of target metadata for every concept and encounter type in a form.
// Produces the metadata report consumed by audit-o3-form.mjs --metadata-report.
//
// Usage:
//   node fetch-target-metadata.mjs FORM.json [--base-url URL] [--report metadata-report.json] [--concurrency 5]
//
// Credentials: set OPENMRS_USER and OPENMRS_PASSWORD, or answer the prompt.
// Credentials are used for read-only GET requests only and are never stored.

import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

const args = process.argv.slice(2);
const formPath = args.find((arg) => !arg.startsWith("--"));
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

if (!formPath) {
  console.error("Usage: fetch-target-metadata.mjs FORM.json [--base-url URL] [--report metadata-report.json] [--concurrency 5]");
  process.exit(2);
}

const baseUrl = option("--base-url", "https://kibana.ampath.or.ke/openmrs").replace(/\/+$/, "");
const reportPath = option("--report", "metadata-report.json");
const concurrency = Math.max(1, Number(option("--concurrency", "5")) || 5);
const uuidPattern = /^[A-Za-z0-9-]{36,38}$/;

let form;
try {
  form = JSON.parse(await fs.readFile(formPath, "utf8"));
} catch (error) {
  console.error(`Could not parse ${formPath}: ${error.message}`);
  process.exit(1);
}

const conceptUuids = new Set();
const walk = (value) => {
  if (Array.isArray(value)) return value.forEach(walk);
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "concept" && typeof child === "string" && uuidPattern.test(child)) conceptUuids.add(child);
    walk(child);
  }
};
walk(form);

const encounterTypeUuid = typeof form.encounterType === "string" ? form.encounterType : null;
console.log(`Target: ${baseUrl}`);
console.log(`Concepts to check: ${conceptUuids.size}; encounter type: ${encounterTypeUuid ?? "(missing)"}`);

const ask = (question, { hidden = false } = {}) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      process.stdout.write(question);
      rl._writeToOutput = () => {};
      rl.question("", (answer) => {
        rl.close();
        process.stdout.write("\n");
        resolve(answer);
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });

let user = process.env.OPENMRS_USER;
let password = process.env.OPENMRS_PASSWORD;
if (!user || !password) {
  if (!process.stdin.isTTY) {
    console.error("Set OPENMRS_USER and OPENMRS_PASSWORD (no terminal available for a prompt).");
    process.exit(2);
  }
  console.log("Enter read-only credentials for the target. They are not stored.");
  user = user || (await ask("Username: "));
  password = password || (await ask("Password: ", { hidden: true }));
}

const authHeader = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
const get = async (resourcePath) => {
  const response = await fetch(`${baseUrl}${resourcePath}`, {
    headers: { Authorization: authHeader, Accept: "application/json" },
  });
  if (response.status === 404) return { status: 404, body: null };
  if (!response.ok) return { status: response.status, body: null };
  return { status: response.status, body: await response.json() };
};

const session = await get("/ws/rest/v1/session");
if (!session.body?.authenticated) {
  console.error(`Authentication failed against ${baseUrl} (HTTP ${session.status}). Check the credentials and try again.`);
  process.exit(1);
}
console.log(`Authenticated as ${session.body.user?.display ?? user}.`);

const requestErrors = [];
const concepts = {};
const conceptView = "custom:(uuid,display,retired,datatype:(display),conceptClass:(display))";
const queue = [...conceptUuids];
let checked = 0;

const worker = async () => {
  while (queue.length > 0) {
    const uuid = queue.shift();
    try {
      const { status, body } = await get(`/ws/rest/v1/concept/${uuid}?v=${conceptView}`);
      if (status === 404) {
        concepts[uuid] = { exists: false };
      } else if (body) {
        concepts[uuid] = {
          exists: true,
          retired: body.retired === true,
          name: body.display ?? null,
          datatype: body.datatype?.display ?? null,
          conceptClass: body.conceptClass?.display ?? null,
        };
      } else {
        requestErrors.push(`Concept ${uuid}: HTTP ${status}`);
      }
    } catch (error) {
      requestErrors.push(`Concept ${uuid}: ${error.message}`);
    }
    checked += 1;
    if (checked % 20 === 0 || checked === conceptUuids.size) {
      console.log(`Checked ${checked}/${conceptUuids.size} concepts`);
    }
  }
};
await Promise.all(Array.from({ length: concurrency }, worker));

let encounterType = null;
if (encounterTypeUuid) {
  try {
    const { status, body } = await get(`/ws/rest/v1/encountertype/${encounterTypeUuid}?v=custom:(uuid,display,retired)`);
    if (status === 404) {
      encounterType = { uuid: encounterTypeUuid, exists: false };
    } else if (body) {
      encounterType = { uuid: encounterTypeUuid, exists: true, retired: body.retired === true, name: body.display ?? null };
    } else {
      requestErrors.push(`Encounter type ${encounterTypeUuid}: HTTP ${status}`);
    }
  } catch (error) {
    requestErrors.push(`Encounter type ${encounterTypeUuid}: ${error.message}`);
  }
}

const report = {
  targetBaseUrl: baseUrl,
  checkedAt: new Date().toISOString(),
  form: path.resolve(formPath),
  encounterType,
  concepts,
  requestErrors,
};
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

const found = Object.values(concepts).filter((c) => c.exists).length;
const missing = Object.values(concepts).filter((c) => c.exists === false).length;
const retired = Object.values(concepts).filter((c) => c.retired === true).length;
console.log(`Report written to ${reportPath}`);
console.log(`Concepts: ${found} found (${retired} retired), ${missing} not found, ${requestErrors.length} request error(s).`);
if (encounterType) {
  console.log(`Encounter type: ${encounterType.exists ? `${encounterType.name ?? encounterType.uuid}${encounterType.retired ? " (RETIRED)" : ""}` : "not found"}`);
}
for (const error of requestErrors) console.log(`ERROR: ${error}`);

process.exit(requestErrors.length === 0 ? 0 : 1);
