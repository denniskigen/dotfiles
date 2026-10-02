---
name: o3-backend-check
description: "Use when verifying a claim about OpenMRS backend behavior (REST contract, resource representation, creatable/updatable properties, validation, search, or form-engine runtime) against the authoritative source: the sibling openmrs-module-* repo or the live local backend. Composes into o3-pr-review."
---

# O3 Backend Check

Use this to validate any claim about backend behavior that an `openmrs-esm-*` frontend depends on, whether it comes from a PR under review, code you are writing, or a question you are answering. The point is to decide the claim by the mechanism that actually determines it: the runtime handler in the owning module, or the live API response, not the frontend's TypeScript types and not a guess.

This composes into `o3-pr-review` (its "inspect the actual code" and "validate before judging" steps) and stands alone when you are writing or debugging frontend code that calls an API.

## Workflow

1. State the claim precisely.
   - Reduce it to the smallest checkable assertion. Examples: "the `default` representation includes field X", "this property is creatable via POST", "the endpoint rejects an empty Y", "the search supports filter Z", "the React form engine handles property P at runtime".
   - A vague claim ("the backend handles this") cannot be validated. Sharpen it first.

2. Find the authoritative source.
   - Map the REST path to its handler. The frontend calls `/ws/rest/v1/<resource>`. Grep for the `@Resource(` annotation carrying that path segment across cloned modules to find the `*Resource.java` (usually under `omod/src/main/java/.../web/resources/`).
   - Standard and core resources live in `openmrs-module-webservices.rest`. FHIR endpoints live in `openmrs-module-fhir2`. Domain resources live in their owning module (for example queue endpoints in `openmrs-module-queue`).
   - Check local sibling `openmrs-module-*` repos under `~/Code/OpenMRS/` first. Pull the checkout before reading, so you are not validating against stale source. If the tree is dirty or diverged, skip the pull and say the read may be stale.
   - If the owning module is not cloned, find it on GitHub and clone it before reading.
   - Read the right checkout. There are PR worktrees under `~/Code/OpenMRS/worktrees/` (e.g. `openmrs-esm-core-pr-1881`); make sure you are in the intended one.

3. Read the runtime, not just the types.
   - For a REST contract, read the handler in full: `getRepresentationDescription(Representation)` for which fields ship per `DEFAULT`/`FULL`/`REF`, `getCreatableProperties()` and `getUpdatableProperties()` for what POST accepts, `@PropertyGetter`/`@PropertySetter` for custom field handling, `doSearch`/`doGetAll` for filters and paging, and the `validate` path or the service call it delegates to.
   - The frontend TS interface can be narrower than the runtime payload. A field missing from the `.d.ts` or the esm type can still ship. Grep the Java handler, not the frontend type.
   - Read the whole handler, not the first matching line. A representation can be overridden, a property added via `@PropertyGetter`, or a default changed further down. Do not anchor on the first signal.

4. Confirm empirically when it matters.
   - For contract questions where reading code leaves any doubt, query the live local backend at `http://localhost/openmrs/ws/rest/v1/<resource>` (FHIR is under `/openmrs/ws/fhir2/R4`) with the local admin credentials (`curl -u admin:Admin123`), using the representation the frontend actually requests (`?v=default`, `?v=full`, or the custom `v=custom:(...)`), and read the real response.
   - Match the request the frontend makes (same params, same representation) so you are comparing like for like.
   - An actual response is ground truth over inferred behavior. A pending or unrun check is unknown, not support for a guess.

5. Report verified vs inferred.
   - Separate what you confirmed (handler read in full, or live response observed) from what you are still inferring. Never present an inference with the confidence of a checked fact.
   - Cite module `file:line` or paste the relevant response fields as the evidence.

## Source Authority Order

When sources could disagree, trust them in this order:

1. Live API response from the running backend for the exact representation in question.
2. The runtime handler in the owning module (pulled fresh), read in full.
3. The frontend TS type. Use it only to know what the frontend expects, never as proof of what the backend returns.

## REST Contract Checklist

For a claim about a REST resource:

- Which fields does each representation expose (`DEFAULT`, `FULL`, `REF`)?
- What is creatable and updatable (POST and POST-update)?
- What validation runs (the resource's own path or a delegated service call)?
- What authorization or privileges are required?
- How do search and list behave (filters, paging, `includeAll`/retired handling)?
- What error shape does the claimed failure actually produce?

## Form Engine Note

O3 has two form engines that consume similar JSON with divergent shapes: Angular `ngx-formentry` (AMPATH's target) and React `esm-form-engine-lib` (the O3 target).

- When validating a form-schema or form-behavior claim for O3, filter Angular/AMPATH patterns against the React engine before trusting them.
- Grep the runtime handler in the engine, not just its TS interfaces. The interfaces can be narrower than what the runtime accepts.
- Validate schema claims against real corpora (LIME-EMR, reference-app-demo), not only the type definitions.

## OpenMRS Defaults

- Modules are `openmrs-module-<name>` under `~/Code/OpenMRS/`. REST resources usually live in `omod/src/main/java/.../web/resources/`.
- Live local REST base is `http://localhost/openmrs/ws/rest/v1`. Requests without auth get a 401.
- Pull the module before reading; skip only if dirty or diverged, and say so.
- TS interfaces can be narrower than runtime. Read the Java handler.
- Standard/core resources: `openmrs-module-webservices.rest`. FHIR: `openmrs-module-fhir2`.

## Output Shape

1. The precise claim being checked.
2. The authoritative source used: module `file:line`, and/or the live endpoint plus representation. Note that the checkout was pulled, or why it was not.
3. Verdict: confirmed, refuted, partly correct, or not enough evidence.
4. Verified facts and inferences, kept separate.
5. If this feeds a review: the evidence string ready to drop into a finding, or the reason to retire the finding.
