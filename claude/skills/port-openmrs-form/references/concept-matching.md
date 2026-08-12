# Concept matching

## Compare

Check the target concept's:

1. Meaning and description
2. Datatype and class
3. Allowed answers
4. Standard mappings
5. Actual retired or active state

Record source and target UUIDs separately. Different implementations may use different UUIDs for equivalent concepts.

## Classify

- `Strong live match`: meaning and structure agree.
- `Needs team confirmation`: a material detail differs.
- `No safe live match`: no active equivalent exists.
- `Question needs redesign`: the source structure cannot be represented safely.

## Evidence

- Evidence ladder: (1) a local dictionary snapshot when one exists (fast, offline; see below), (2) the live target REST resource via fetch-target-metadata.mjs — required for release-candidate, (3) local content-repo Initializer CSVs and cross-form usage — supporting evidence only; usage in another form does NOT prove a concept exists on the target.
- AMRS snapshot: bundled with the skill in `assets/amrs-dictionary-snapshot-*/` (concepts jsonl.gz + encountertypes.json, ~2 MB), so it travels with the skill to any machine; a copy also lives in `openmrs-content-amrs/drafts/`. Refresh it periodically by re-running the REST dump and replacing the dated directory. Generate a pipeline-compatible metadata report from it with `node scripts/snapshot-metadata.mjs FORM.json --snapshot DIR --report metadata-report.json`. Snapshot listings exclude retired concepts, so absent means "not active" — confirm retirement with a direct GET. Also use the snapshot for fully-specified-name collision checks before drafting new-concept CSVs: an exact name match is a map-to-existing suggestion, not proof of same meaning.
- Check local OpenMRS content repositories before remote examples.
- Record target, date, name, UUID, mappings, datatype, class, answers, and retired state.
- Treat HTTP 404 as `not found`, never as `retired`.
- Check both question and answer concepts for coded fields.
- Do not store credentials or tokens.

## New concepts

Record name, meaning, datatype, class, answers or format, mapping guidance, reason, decision, and final target UUID. Never manufacture a production UUID.

## Redesign

- Keep one clinical meaning per question.
- Separate screening questions from detail fields.
- Separate medication name, amount, unit, and frequency.
- Use conditions only with an explicit controlling answer.
- Require a clinical field only when the team approves that rule.
