---
name: o3-pr-review
description: "Use when reviewing OpenMRS or O3 pull requests, rereviewing latest commits, validating findings, or drafting evidence-backed inline review comments."
---

# O3 PR Review

Use this for OpenMRS/O3 PR reviews, rereviews, "validate those findings", review-comment drafting, and latest-commit review on an existing PR.

## Workflow

1. Establish the PR scope.
   - Read the PR title, body, changed files, latest commits, and relevant discussion.
   - Read existing PR discussion before drafting findings: inline threads, prior reviews, maintainer replies, and recent top-level comments. Treat unresolved feedback and maintainer-settled decisions as part of the review surface, even for first-pass reviews.
   - When the PR references a ticket, read the ticket's full state, not just its description: linked PRs, comments, and status. Interpret status as a pointer, not a label: "PR Pending" or "In Progress" names concrete work that exists somewhere; locate it and compare its dates with the PR under review. A status set months before this PR was opened almost always refers to a different PR.
   - When the PR belongs to a multi-PR feature series (same ticket epic, same contributor, components landing incrementally), build the series map before reviewing: what already merged unwired, what wires what, and which PR owns the integration. Findings about missing or dead behavior in one series PR are often a single cross-PR finding, and the wiring question ("where does this get connected, and when") is usually the most important question in the review.
   - Classify the review mode before going deep: frontend UI/workflow, frontend API/config contract, backend REST/API contract, backend implementation, distro/release coordination, docs/translations, or CI-only. The mode also selects which Maintainer Question Inventory groups to run; see the routing paragraph in that section.
   - Use the mode to choose evidence. Frontend API/config changes need backend contract checks. Backend REST/API changes need representation, validation, authorization, and consumer checks. Distro/release changes need dependency and version-order checks.
   - Prefer local checkouts where available. If team or project instructions define a checkout root, use that before searching GitHub. Fetch the PR branch when needed.
   - For rereviews or "latest commits" requests, identify the previously reviewed SHA or discussion state, then review only the new diff unless older context is needed.

2. Inspect the actual code.
   - Review changed code plus nearby callers, tests, fixtures, config, and translations.
   - For frontend PRs touching API calls or backend behavior, inspect the sibling `openmrs-module-*` repo locally before relying on assumptions.
   - If the backend module is missing, find the matching GitHub repo and clone it only when the contract check matters.
   - Match any suspected finding against unresolved review threads. If an issue is already covered, report it as already flagged with a link or author/context instead of drafting a duplicate comment.
   - When a PR swaps a base class, interface, service shape, resource parent, API wrapper, or schema owner, compare old inherited behavior against the replacement. Check representation fields, creatable properties, validation, authorization, search/list behavior, paging, error shapes, side effects, and subclass/extension hooks.
   - When a PR adds new public API (methods, constants, types) to a platform module or shared library, run the API Surface Review below. Correctness validation alone misses wrong-shape API.
   - When a PR adds a new component or substantial new logic, run the Canonical-Substitution Sweep below. Findings-driven review alone misses hand-rolled re-implementations of machinery that already exists.

3. Validate before judging.
   - Reproduce with focused tests or static checks when practical.
   - If workspace binaries fail with `command not found`, run package-local `npx jest` or `npx tsc`, then direct `./node_modules/.bin/*`.
   - For API contracts, confirm request fields, response shapes, validation rules, error behavior, and workflow side effects in backend code.
   - For a PR that fixes a bug, run the Fix-Location Gate below before endorsing where the fix lives.
   - For release-dependent changes, verify the paired backend, distro, or module PR/version that makes the change safe. Treat merge order or release availability separately from code correctness.
   - For visual, layout, or CSS findings, verify on the shipping build (dev3 or the Docker app shell), not only the local dev server. The app-shell Carbon version can differ between the two, so a spacing or sizing issue can appear or vanish depending on where you measure. Measure the rendered geometry rather than judging a local screenshot.
   - For any finding about a Carbon component's appearance, selected state, or focus behavior, check `esm-core/packages/framework/esm-styleguide/src/_overrides.scss` before judging: it globally restyles a dozen-plus Carbon components (buttons, data tables, content switchers, pagination, overflow menus, modals, notifications), so Carbon's documented default is often not what ships in O3. Heavy `!important` stacks in app scss usually mean the PR is fighting these global overrides, and the right fix is deleting the overrides, not refining them.
   - For frontend PRs that add user-facing strings, run `yarn turbo run extract-translations` and confirm it leaves `translations/en.json` unchanged. CI does not enforce extraction, so the file drifts in both directions and neither direction is visible from reading the diff. Keys the author forgot to extract never reach Transifex. Keys the extractor cannot see get deleted the next time anyone runs it: it scans only files it can statically resolve `t()` calls in, so keys built dynamically (`t(label.key, label.fallback)`), called optionally (`t?.('yes', 'Yes')`), or living in a helper module outside its scan set all disappear. The fix for the second kind is comment-form markers (`// t('genderMale', 'Male')`), and they only work in a file the extractor actually scans, which is not necessarily the file the keys are used in. Verify the marker placement by running the extractor again rather than assuming.

4. Write findings.
   - Lead with correctness, data integrity, workflow regressions, security, and missing tests.
   - Avoid style-only comments unless they materially improve maintainability or contributor clarity.
   - Ground every finding in a file and line. State the user-visible or maintainer-visible consequence.
   - Use plain severity words only when helpful, such as blocking, high impact, non-blocking, or follow-up.
   - Mark uncertain items as questions or follow-up risks, not blockers.
   - Do not fish for comments. If a PR is correct after validation, say there are no findings and include the evidence checked.
   - Separate blocking findings, non-blocking release coordination notes, test gaps, and private observations.
   - Before drafting a comment, validate that the finding is introduced by the PR, has real user/workflow/data/CI impact, is backed by code/backend/test/log evidence, and has a smallest safe fix or clear follow-up path.
   - Do not draft a new review comment for an issue that is already covered, already addressed, or settled by a maintainer unless new evidence materially changes the risk or the human reviewer asks for a stronger follow-up.

5. Adversarially verify high-stakes findings.
   - For every finding that would be a blocking comment, or that touches backend or REST contract, data integrity, workflow correctness, or security, run the Adversarial Verification gate below before drafting it.
   - Skip it for style nits, doc typos, and low-risk single-file findings. It is an extra pass per finding, so spend it where being wrong is expensive or embarrassing.
   - A finding that survives refutation is drafted with the refutation attempt as part of its evidence. A refuted finding is dropped or reframed as a question, never posted as a blocker.

6. Draft comments for approval first.
   - Prefer inline comments on the relevant hunks, unless the principal finding is about fix location or architecture rather than a specific hunk; then a single top-level comment carrying the full evidence chain beats scattered inline notes.
   - Keep the tone kind and specific. Acknowledge useful work before requesting changes. Write in the register described in Comment Voice below.
   - Do not post to GitHub until the human reviewer approves the exact comment text.

## Discussion Review Gate

Before drafting or posting review comments, read the existing PR discussion: inline threads, prior reviews, maintainer replies, and recent top-level comments.

- Do not re-raise points already addressed by the contributor.
- Do not duplicate unresolved feedback unless the existing comment is materially wrong or incomplete in a way that changes the requested fix.
- Do not relitigate decisions a maintainer already settled unless new evidence changes the risk.
- If a suspected issue is skipped because it was addressed or settled, report it as such with enough context to identify the thread or decision.
- Factual claims in existing review comments are unverified findings, not evidence, regardless of author or tooling. Before deferring to a prior comment, building on it, or letting it steer what the contributor is asked to change, validate its checkable claims (endpoints, response shapes, versions, runtime behavior) against the authoritative source, the same as your own findings. A prior comment refuted by authoritative evidence gets corrected kindly, with the evidence, as part of the new review; that is correcting the record, not relitigating a settled decision.

## Rereview Mode

Use this when the human reviewer asks for the latest upstream commits, a rereview, or whether a contributor fixed prior feedback.

1. Identify what changed since the last review.
   - Prefer the old reviewed SHA, latest local review notes, or unresolved review-thread state.
   - If no reliable baseline exists, say so and do a normal review with that caveat.
2. Review the new diff first.
   - Reopen older files only when needed to understand behavior or verify a prior finding.
   - Do not repeat old findings unless the latest commits failed to address them.
3. Report prior feedback status.
   - Use `fixed`, `still open`, `superseded`, or `not enough evidence`.
   - Draft new inline comments only for still-actionable issues.

## Finding Validation Gate

Run this gate before proposing or posting a review comment:

- Is the issue introduced or exposed by this PR?
- Is there a real impact on users, data integrity, workflow correctness, CI, security, maintainability, or contributor clarity?
- What evidence proves it: backend code, local test, static code path, CI/logs, or direct UI behavior?
- Have you traced why the code exists (git blame, the introducing commit, linked discussion) before critiquing its design or intent? A reactive patch, such as a Copilot or lint suggestion bundled into an unrelated commit, is not a deliberate design decision and should not be argued against as if it were.
- Is it blocking, non-blocking, or better handled as a follow-up ticket?
- What is the smallest safe fix the contributor can make?

If a finding fails the gate, drop it, reframe it as a question, or keep it as a private note instead of a review comment.

## Fix-Location Gate

Run this for any PR that fixes a bug, especially data-integrity or lifecycle-sync bugs (state that should change when a visit, encounter, order, or queue entry changes) fixed on the frontend. Run it before adjudicating implementation details of the fix (endpoint choice, response shape, error handling): those are questions about a layer that has not been validated yet, and they shrink or vanish once the layer verdict is in.

- Read the layer signal already in the diff: if the unchanged context around the fix shows the client already emits the right refresh signal (cache invalidation, a `queue-entry-updated`-style event) and the bug still reproduces, the client is refetching truthfully and the server state itself is wrong. That verdict is available before any endpoint or shape question; pivot to the owning backend module first.
- Reproduce the bug through the backend alone: drive the same lifecycle with direct REST calls against a running backend (local Docker stack or dev3), with no frontend involved. If the wrong state appears backend-side, it is a backend bug, and a frontend fix is a workaround that patches one client while every other consumer stays broken.
- The moment the layer verdict points at another repo, inventory existing work there before designing or recommending any fix: search that repo's open PRs and remote branches for the ticket ID and the defect's keywords (`gh pr list --search <ticket>`, `git branch -r | grep <ticket>` in the local checkout), and check recent commits in the affected area. The fix you are about to propose may already exist, implemented and stalled; finding it changes the recommendation from "file a ticket" to "review and land the existing PR".
- Interpret a live probe only after confirming every setup step in it succeeded. A failed create, or a probe run against leftover state from an earlier probe (for example a still-active queue entry blocking the next create), masquerades as a negative result. Isolate or clean up state between probes, and void test data when done.
- Search the owning module for code already intended to produce the missing behavior: handlers, AOP advice, event listeners, cascades. Finding such code does not make the PR redundant, and not finding it does not make the frontend fix correct. Code that reads correct can still never fire: Spring registration, `@Handler` order ties, AOP wiring, and guards that depend on another handler having already mutated the object can each defeat it. Only exercising the path live settles which one you have.
- When a lifecycle behavior half-works, probe the working sibling path live (for example: visit stop closes queue entries but visit void does not). A sibling that reaches the same outcome with no equivalent client call is strong evidence the backend owns the mechanism; locate that mechanism before scrutinizing the call the PR adds. The contrast discriminates "component never registered or invoked" from "component fires but a guard or ordering condition fails," and usually points at the exact broken condition.
- Do not recommend moving a fix to the backend without a mechanism concrete enough to file the backend ticket: name the class, the guard or ordering that fails, and the smallest backend change. "The backend should handle this" without a mechanism is an opinion, not a finding.
- If the frontend workaround is still worth merging as a stopgap, say so explicitly and separately from the root-cause recommendation, and state what becomes redundant once the backend is fixed.

## Adversarial Verification

The Finding Validation Gate above is a self-check. This is the stronger, separate layer for high-stakes findings: a skeptic whose only job is to prove the finding wrong. Use it because the reasoning that produced a finding also tends to rationalize it, and first-pass findings are frequently wrong.

Run it on findings that would block a PR, or that touch backend or REST contract, data integrity, workflow correctness, or security. Skip it on style, docs, and low-risk findings.

For each such finding:

- Spawn a separate verifier whose sole task is to refute the finding, not to confirm it. Instruct it to default to refuted when the evidence is inconclusive.
- Require authoritative evidence. For any backend or contract claim, the verifier uses `o3-backend-check`: read the full handler in the owning module, and for claims about runtime behavior, exercise the live endpoint. Code reading alone is inconclusive in both directions when registration, handler ordering, or AOP wiring can change the outcome: an endpoint can exist in a legacy controller the first grep misses, and a handler that reads correct can never fire. For a frontend claim, read the full surrounding code, callers, and tests.
- The verifier hunts for the counter-evidence a confirming re-read skips: a field still exposed via `@PropertyGetter`, a representation the frontend does not actually request, behavior already covered by an existing test or an unresolved thread, an inherited base-class default that still applies, backend code that exists but never fires at runtime (unregistered bean, `@Handler` order tie, a guard depending on another handler running first).

For the riskiest findings, run more than one verifier with distinct lenses and kill the finding on a majority refute:

- Does the issue actually reproduce?
- Is it already handled elsewhere (existing test, existing thread, inherited behavior)?
- Does the contract or behavior genuinely change for a client?

Outcome:

- Survives refutation: draft it, and fold what the refutation tried and failed to show into the evidence.
- Refuted: drop it or reframe as a question. Record why it was dropped so it appears in the already-considered part of the output, not as a silent omission.

## Contract Preservation Checks

Use this checklist when a PR changes a REST resource, service interface, base class, API client, config schema, or DTO:

- What did the previous inherited or shared abstraction provide that the new code must preserve?
- Did representation fields, creatable/updatable properties, paging, search, retired/includeAll behavior, validation, authorization, and error shapes stay compatible?
- Are frontend consumers, backend callers, and existing test fixtures still aligned with the contract?
- If contract behavior is manually reimplemented, is there a focused test for the endpoint, helper, or workflow that would catch missing fields or changed behavior?

Missing contract preservation is a review finding when it changes behavior used by clients. Missing tests are a finding only when the untested behavior is risky or was manually reimplemented. Before flagging a missing test, confirm the underlying logic is not already tested elsewhere: thin wrapper, barrel, or re-export files (for example a `*.workspace` shim that only mounts a component tested in its own `*.test.tsx`) do not need their own tests, and an import-presence check will false-positive on them.

## API Surface Review

Contract Preservation asks whether existing surface survived; this asks whether new surface should exist. Run it when a PR adds public API (methods, constants, types) to a platform module or shared library, where semver freezes whatever ships. It applies even when the author is a maintainer and the PR already has approvals: it is a first-class review dimension, not relitigating a settled decision, and not a style comment.

The core question, per new public member: what do its callers actually consume, and what is the smallest, most domain-shaped surface that serves them? Public surface can be added later; it can rarely be removed.

- Answer from the callers in the diff, not from the member's documentation or the PR description. If no caller uses what the member distinctively exposes (they discard it, only test it for presence, or convert it before use), the member exposes a mechanism or intermediate representation instead of the result callers want.
- Documentation that has to caveat the member's behavior (which of several valid results is returned, values callers must not rely on, ordering or determinism disclaimers) usually marks the abstraction as leaking, not the docs as thorough.
- Supporting surface multiplies: public constants, types, or overloads that exist only to feed the new member usually belong behind it, and each becomes surface that maintenance branches and consumers must then mirror exactly.
- Naming that describes the mechanism rather than the caller's intent is a secondary signal the shape grew out of the implementation instead of the domain.
- Before proposing an alternative shape, confirm it is constructible from what the call sites actually have; a cleaner-looking signature sometimes needs data that lives on a different object than the proposed parameter.

This pass hunts absences, so the validated-finding gates above do not trigger it; run it as its own step during code inspection. (Example of the class: a helper resolving a concept to a reference-term code string where every caller either null-checked the string or fed it straight back into a constructor; the right surface resolved the concept directly to the domain object and kept the codes internal.)

## Canonical-Substitution Sweep

The API Surface Review asks whether new surface should exist; this asks whether new implementation should exist. Run it for any PR adding a new component or substantial new logic. Like the other absence-hunting passes, the validated-finding gates do not trigger it, so run it as its own step during code inspection.

For each hand-rolled mechanism in the new code (UI shell, event handling, date or time formatting, state synchronization, styling composition, loading/empty/error affordances), search three layers for the canonical counterpart before accepting the hand-rolled version:

1. The framework: `@openmrs/esm-framework` exports (`formatDate`, `formatTime`, `showModal`, `showSnackbar`, `ErrorState`, `useLayoutType`, `OpenmrsDatePicker`, and the rest of the public surface).
2. The repo: a same-suffix or sibling file that already solves it (an existing `*.modal.tsx` for modal structure, an existing table for status label localization, an existing component for class composition idiom).
3. The design system: the Carbon primitive built for the interaction (`SelectableTag` for toggle chips, `ComposedModal` for dialogs), checked against the version actually pinned in the repo.

Cite the found counterpart in the comment; an in-repo example lands better than abstract advice. Frame the rework by net lines deleted: "this is less code, not more" is the most persuasive form of this comment class. Hand-rolled event handling deserves extra suspicion: document-level listeners, `stopPropagation`-based click-outside, manual Enter/Space handlers on non-button elements, and ref-mirror patterns written during render are each a marker that a canonical mechanism was missed.

## Maintainer Question Inventory

Recurring questions distilled from the review corpora of senior OpenMRS maintainers (platform, PIH, FHIR, and O3 frontend domains). Like the API Surface Review, these hunt absences, so run the applicable groups as their own step; each is cheap to ask and targets a finding class the evidence-driven gates do not. Phrase comments as questions where uncertain and calibrate directness to certainty; downgrade severity when the behavior is pre-existing rather than introduced. When a change affects functionality your team does not use, say so and loop in the team that does before endorsing a merge.

Route groups by the review mode classified in workflow step 1 rather than running all of them: backend contract or implementation PRs get Design and API surface, Correctness and data integrity, Tests, and Ecosystem (plus the API Surface Review for new public API); frontend UI/workflow PRs get Correctness, Frontend user-facing quality, Performance, and Tests; frontend API/config PRs add Design and Ecosystem; distro/release PRs are mostly Ecosystem; purely visual changes narrow to Frontend user-facing quality. The clinical-stakes lenses (unreachable bad states, authoritative state) stay in scope for every mode. Within a review, run the Correctness and Tests groups before the polish-leaning groups: a dead branch or a promise that resolves before the save completes must not survive a review that perfected the spacing tokens.

### Design and API surface

- Domain shape: do new signatures traffic in typed domain objects where they could, or in uuids, ids, and bare strings a domain object should replace? An untyped identifier in a new parameter or return needs a reason.
- Signature-accurate naming: a name states exactly what the member takes and returns (a method taking a Patient is not `...ById`); misleading names are defects, not nits.
- Idiom consistency: how does the nearest existing code in this codebase already do this (lookups, message resolution, attribute naming, error types)? New code that invents a second way needs a reason. Also check the contributor's sibling PRs for the same choice made differently.
- Spec fidelity with priced deviations: when code implements an external standard (FHIR, HL7, UCUM), validate field semantics, parameter types, and terminology bindings against the spec itself, honoring binding strength; deviations are permitted only when named explicitly and justified by cost.
- Configuration truth lives in one place: frontend or module config that duplicates a backend property should be removed in favor of the property; if no backend property exists, ask whether the backend should own the setting before adding it elsewhere.
- Endpoint necessity: a new REST endpoint, DTO, or wrapper class needs proof the existing resource cannot express the operation via parameters, representations, or status transitions. Search parameters compose as AND, not either/or; shortcut or aggregate parameter values must not shadow real enum values; every representation type gets handled deliberately, including returning null for custom representations.
- Layering invariants: hold architectural rules even when the violation works, for example a domain object calling a service, or a data hook rendering UI errors. A diff that fans out across many callers usually means the change belongs in the shared abstraction they call, not in the callers.
- Implementer customization: for code that generates UI or consumes configuration, can a downstream implementation adjust behavior and appearance (classes, ids, configurable options, overrideable beans) without forking? A config schema is itself a user interface for implementers: defaults are mandatory, descriptions legible to non-developers, units natural to the medium. Prefer one general extension point over proliferating purpose-specific slots.

### Correctness and data integrity

- Lifecycle-mode completeness: a feature shown working in one mode gets asked about all of them. What happens on enter, edit, view, void or retire, re-entry, and when the data is multiple where the code assumes single?
- Authoritative state over display artifacts: does consuming code read the data model's explicit flag (an attribute, a boolean property) or infer state from display strings and sentinel values? And are two correlated-but-distinct domain states being conflated (a patient in a bed is not thereby admitted)?
- Unreachable-bad-state proof: name the dangerous domain state the change could produce (health data shown for the wrong patient, two active visits, clinically impossible validation) and require an argument that it cannot be reached, not just that the happy path works.
- Security and data sensitivity: authorization and privilege checks on new endpoints and service methods, redirect and injection surface on anything URL- or input-derived, and PHI exposure in logs, URLs, exports, and printouts. In an EMR, a printing or export feature is a data-egress feature and gets reviewed as one.
- Whole-object integrity: never hand consumers a partially populated or subclassed persistent object; make derived collections explicit fields, and prove a re-save cannot silently destroy data the query filtered out.
- Reference stability: wherever a reference is persisted or must survive reload, prefer stable identifiers (uuids) over names; name-based matching breaks on rename and localization, and is worth flagging even when it is the local legacy pattern.
- Shared-reference integrity: before retiring, deleting, or mutating shared metadata (for example a concept reference term shared across mappings), check what else references it; destructive operations on shared entities need an ownership check, not just local validity.
- Null-safety from the schema: reason from what the database permits, not what the UI usually produces; every comparator and branch needs a fallback anchored on a field guaranteed non-null.
- Behavior-preserving defaults: the running system, not the ticket text, defines the default; new behavior ships configurable and defaults to what the system does today. Sanity-check default values against the real workflow (the person dispensing is almost never the person who prescribed).
- Error semantics: is any exception swallowed into a log or collapsed into a falsy return? A falsy result and a failure are different facts. Misconfiguration should fail at deploy or test time, not depend on someone reading logs. Are exception types the domain-appropriate ones for the failure?
- Execution-model correctness: judge code under the framework's actual execution model; DOM effects belong in effects (never per render), and promise ordering must be guaranteed, not assumed.
- Machine-level read: hunt guards already proven by control flow and machinery that can never fire (an abort controller nothing aborts), and judge idioms by their compiled or runtime form rather than their source appearance.

### Tests

- Tests prove what they claim: assertions discriminate the specific behavior (not "some validation error occurred"), fixtures actually instantiate the claimed scenario, and data includes rows that would fail if filtering were wrong. Cover both directions of symmetric behavior. Never comment out failing assertions. A test that only verifies a mock returns what it was told proves the mocking framework, not OpenMRS; interaction tests assert the real user path and event order.
- Round-trip persistence: for save-path changes, exercise the real cycle (fetch, mutate, flush, reload, assert); ORM behavior on re-save is part of what is under test.
- Know the shared harness: do not re-do what the shared jest config already does (mocks auto-clear); use the idiomatic utilities (one of fireEvent or userEvent, not both) and point contributors at the turbo test filter command for their package.

### Performance and scale

- Implementation scale: which collections here are implementation-sized in production (providers, locations, concepts run to thousands)? Dropdowns over full lists, eager loads, and per-item queries that pass on demo data are the recurring offenders.
- Network economy: count the requests a feature generates; waterfalls, duplicate fetches of the same hook, and serial awaits inside loops are the recurring offenders.

### Frontend user-facing quality

- Message and friction sizing: error text is written for the user, not the administrator; the affordance matches recoverability (toast for unrecoverable, inline for actionable), and cheap-to-undo actions do not warrant confirmation clicks.
- i18n as a design constraint: composed strings that only parse in English get restructured or cut; even placeholder values ("UNKNOWN") are localizable; locale comes from the framework's single source of truth; non-English translations flow through Transifex or they will be overwritten.
- Accessibility must be semantically true: wrong ARIA is worse than none; roles must match actual widget behavior; decorative a11y attributes that add no user value get removed. Check keyboard operability and focus flow, not just markup semantics.
- Async state completeness: every data-driven component has reachable loading, empty, error, and misconfigured states; a feature that silently vanishes on fetch failure is indistinguishable from unconfigured, which is itself a bug.
- Right design-system primitive: use the Carbon component built for the interaction (IconButton for icon-only buttons, MultiSelect for multi-choice, one primary button per view); do not hand-roll what Carbon provides or override defaults it already handles.
- Convention-by-citation: O3 file suffixes encode component kind (`.modal.tsx`, `.workspace.tsx`, `.resource.ts`, `.ts` for files without JSX); enforce naming and taxonomy with a link to the canonical o3-docs page rather than bare assertion.
- Style containment: styles must not leak past the component's scope (no overriding a design-system class globally), spacing uses the design system's tokens, and units match the medium (print sizes in physical units). Do not flag hardcoded colors on theming grounds; O3 does not use theme tokens.

### Ecosystem and process

- Prior art in both directions: does the platform already provide this method or utility, and, symmetrically, does this change undo or re-solve something a prior fix already handled? Check the ticket and blame history before accepting a re-solution.
- Dependency edges are contract: a pom scope change (provided to compile), a new config.xml requirement, or a reflection-based soft dependency each changes what downstream deployments must run. Verify conditional loading still works and optional modules stay optional.
- Credential and key lifecycle: no hard-coded keys, secrets, or trust anchors in build and deploy paths; keys need expiry, rotation, and scope validation designed in from the start.
- Version-gating: for code spanning core versions, prefer a runtime version check behind a named capability method with graceful degradation (empty result, no-op) over new submodules or hard errors; prefer supporting the oldest platform version practical; verify claimed cross-version behavior rather than accepting a comment that asserts it.
- Migration sequencing: new patterns land beside the old ones, deprecating in place; refactoring existing consumers belongs in follow-up PRs. A replacement component needs a feature-parity inventory of what it replaces. When design is unsettled or the mainline is broken, shrink to a placeholder or disable the feature and ticket the real fix rather than merge speculation or let the PR rot.
- PR scope is change-control: a commit is a revert unit, so incidental changes ride separately; the conventional-commit label is a SemVer contract, so breaking or config-renaming changes do not ship under fix.
- Route ecosystem questions out of the PR: separate PR-blocking findings from platform-wide pattern questions; raise the latter explicitly as non-blocking conversation starters bound for Talk, Slack, or tickets, and do not hold the merge on them.
- Contributor claims are unverified findings too: when a contributor justifies a choice with "it breaks tests" or "that approach did not work," ask for the specific evidence before accepting the constraint into the design.
- Annotate the surprise: any non-obvious behavior or magic value in code or tests needs an inline comment saying why (why the fixture now has six rows, why the legacy fallback fires).
- Dead-artifact elimination: unused imports, files, classes, and config properties get deleted rather than left around to confuse, with unused-ness proven by an org-wide code search link, not asserted.

## Release Coordination Notes

Some O3 PRs are correct only when a paired module, distro, or backend PR lands first.

- Verify the paired PR or local sibling repo before treating the dependency as safe.
- Report merge-order or version dependency as a non-blocking coordination note unless the PR would break current supported environments by itself.
- Do not present release coordination as a code defect when the code and contract are otherwise correct.

## OpenMRS Defaults

- Default local OpenMRS backend base URL is `http://localhost`.
- For `openmrs-esm-*` API behavior, check local sibling `openmrs-module-*` repos first. If team or project instructions define a checkout root, use that before searching GitHub.
- OpenMRS repos use squash merge. Do not ask contributors to clean up branch history.
- Do not use `refactor` as a conventional commit label in OpenMRS repos.
- Review comments should not use em dashes.

## Comment Voice

Drafted comments are posted under the human reviewer's name, so match his organic register (anchor on his pre-2025 corpus; later machine-assisted comments drifted toward report prose and are not the target).

- Reach for a GitHub suggestion block before a paragraph. Committable suggestions, sometimes whole functions, often with no prose; a deletion is an empty suggestion block with a one-line reason beneath it.
- Map register to stakes: questions for design and judgment calls ("Shouldn't the rendering be contingent on the config property?"), hedged proposals for optional improvements ("It'd be nice to...", "Probably better to..."), flat imperatives only for settled conventions and hygiene ("These validation errors must be translated.").
- Label optional items "Nit:" and say they can be ignored. Compress repeats with "Ditto" or "Same as above".
- Open a review with a short name-addressed, progress-calibrated acknowledgment ("Good start, @x. I've left some suggestions."; "This is very close, @y."). Keep approvals terse ("LGTM! Thanks, @x.").
- No emoji; warmth comes through words. No em dashes. No report scaffolding inside comments: no headers, no numbered bold findings, no "Fix:" sections.
- Link the canonical source instead of asserting: o3-docs conventions, Carbon docs, design documentation, MDN, the backend Java source, rest.openmrs.org.
- When endorsing prior feedback that is buried in a poorly formatted review body, quote its key sentence inline at the relevant code location and state the endorsement plainly. Location plus maintainer weight rescues feedback that formatting buried.
- For UI findings, attach the reproduction (annotated screenshot or screencast) and ask authors to provide the same for their changes.
- On out-of-domain rulings (platform architecture, visual design), flag the question and tag the domain owner rather than adjudicating.
- Deviate from the organic register in exactly one place: severity. When one finding matters more than the rest, say so explicitly up front instead of letting a blocker arrive with the same weight as fifteen nits.

## Output Shape

For an initial review:

1. Findings ordered by severity, with file and line references.
2. Open questions or assumptions.
3. Already-flagged, already-addressed, or maintainer-settled issues, plus any candidate findings dropped after adversarial verification, with links or enough context to explain whether they are still relevant or why they were dropped.
4. Release coordination notes, if any.
5. Suggested inline comments for new issues only, not posted yet.
6. Tests or validation performed, plus any gaps.
7. Scope the verdict by lens: state which review dimensions were actually run (correctness, contract preservation, API surface, release coordination, discussion state) and which were not. "No findings" is a claim about the dimensions examined, never about the PR in general; an unscoped clean verdict silently overclaims completeness.

For "validate those findings":

1. Keep, revise, or drop each finding.
2. Cite the code or backend behavior that proves it.
3. Return revised comment text only for findings worth posting.
