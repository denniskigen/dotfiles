# Schema validation and preview

## JSON

- Use the exact keys `id`, `uuid`, and `referenceQuestionId`.
- Use unique lower-camel-case field IDs, including nested groups.
- Ensure every required, hide, disable, calculation, and validation reference resolves.
- Use target concept and encounter UUIDs.
- Verify existence and active state separately from UUID syntax.
- Keep `published` false.
- Mark exercise JSON with `meta.exerciseOnly` and `meta.containsSampleConceptUuids` when applicable.

## Validation layers

1. Canonical: current OpenMRS `form.schema.json`.
2. Semantic: IDs, references, UUID syntax, mode, and placeholders.
3. Target: every release-candidate concept and encounter type exists and is active.
4. Preview: the form renders and behaves as approved on the target's form engine.

Passing only layer 1 does not make a form deployable.

## Release metadata report

Generate it with the fetch script (read-only GET requests; credentials come from
`OPENMRS_USER` and `OPENMRS_PASSWORD` or a prompt, and are never stored):

```text
node scripts/fetch-target-metadata.mjs FORM.json --base-url TARGET_URL --report metadata-report.json
```

The user runs this when the target requires credentials the assistant does not have.
Then pass `--metadata-report FILE.json` to the semantic auditor. The format:

```json
{
  "targetBaseUrl": "https://kibana.ampath.or.ke/openmrs",
  "checkedAt": "2026-07-23T12:00:00Z",
  "encounterType": {
    "uuid": "00000000-0000-4000-8000-000000000000",
    "exists": true,
    "retired": false
  },
  "concepts": {
    "11111111-1111-4111-8111-111111111111": {
      "exists": true,
      "retired": false,
      "name": "Example concept"
    }
  }
}
```

Create it only from read-only target checks. Include no credentials or patient data.

## No-save preview

### Choose the harness

- Angular-engine target (for example AMRS): use the ngx-formentry demo app below. It is the only preview that runs the same engine the ported form will run on. It has caught real crashes that static validation and the React preview missed (example: `alert` with `useConceptReferenceRange` rendered the whole form blank).
- The O3 Form Builder preview renders with the React engine. Use it as a secondary check only, and record any engine-difference caveats.

### ngx-formentry demo app (Angular engine)

1. Use a local clone of `openmrs-ngx-formentry` (for example `~/Code/OpenMRS/openmrs-ngx-formentry`). Clone it from `https://github.com/openmrs/openmrs-ngx-formentry` if missing. Confirm the working tree is clean before editing.
2. Copy the candidate JSON into the demo app (for example `src/app/candidate-form.json`) and temporarily point the form `require()` in `src/app/app.component.ts` at it.
3. Run `npm install` (first time only), then `npx ng serve`, and open `http://localhost:4200`.
4. Work through the checklist below. Keep the browser console open: a blank or partial form usually means the Angular engine rejected a schema feature, and the console error names it.
5. Revert when done: stop the dev server, restore the edited file (`git checkout -- src/app/app.component.ts`), and delete the copied JSON. Leave the repo clean.

This is render-and-interact only. Do not submit an encounter or use patient data.

### Checklist

Record `Pass`, `Fail`, or `Not tested` for:

1. Full render, labels, order, and encounter fields
2. Required and optional behavior
3. Show and hide conditions, including blank controls
4. Exclusive answers such as `None`
5. Repeat groups and added rows
6. Numeric, date, and text validation messages
7. No raw UUID or field ID shown to users
8. No form, encounter, or patient data saved
9. No engine errors in the browser console

Test valid, invalid, blank, and controlling-answer changes. Mark submission-only behavior as a later controlled-save check.
