#!/usr/bin/env python3
"""Apply team decisions recorded in the review workbook to a candidate form JSON.

Usage:
  python3 apply-decisions.py --workbook REVIEW.xlsx --candidate FORM.json --out FINAL.json
      [--mark-exercise]

Reads:
- Build Results: the "Encounter type UUID" and "Form UUID" values in the header block
  (set them there once decided).
- Concept Decisions: rows with an "Approved target UUID" different from "Concept UUID"
  are remapped everywhere in the form, including inside expressions. Rows whose
  Team decision is "Remove from target form" have their questions and answers removed.

Prints what was applied and how many concept rows still have no team decision.
Works on Python 3.9+ and needs only openpyxl.
"""

import argparse
import json
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is required (see build-workbook.py for an isolated-venv example).")


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", required=True)
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--mark-exercise", action="store_true",
                        help="Mark the output as exercise-only (sample decisions).")
    return parser.parse_args()


def main():
    args = parse_args()
    workbook = openpyxl.load_workbook(args.workbook, data_only=True)

    overview = {}
    for row in workbook["Build Results"].iter_rows(values_only=True):
        if row and row[0] == "Step":
            break
        if row and row[0]:
            overview[row[0]] = row[1]
    decisions = workbook["Concept Decisions"]
    header = [c.value for c in decisions[1]]
    col = {name: header.index(name) for name in ("Concept UUID", "Team decision", "Approved target UUID")}

    remaps, removals, pending = {}, set(), 0
    for row in decisions.iter_rows(min_row=2, values_only=True):
        uuid = row[col["Concept UUID"]]
        if not uuid:
            continue
        decision = (row[col["Team decision"]] or "").strip()
        approved = (row[col["Approved target UUID"]] or "").strip() if row[col["Approved target UUID"]] else ""
        if decision == "Remove from target form":
            removals.add(uuid)
        elif approved and approved != uuid:
            remaps[uuid] = approved
        elif not decision:
            pending += 1

    with open(args.candidate, encoding="utf-8") as handle:
        text = handle.read()
    for old, new in remaps.items():
        text = text.replace(old, new)
    form = json.loads(text)

    removed_questions, removed_answers = 0, 0
    for page in form.get("pages", []):
        for section in page.get("sections", []):
            kept = []
            for question in section.get("questions", []):
                options = question.get("questionOptions", {})
                if options.get("concept") in removals:
                    removed_questions += 1
                    continue
                answers = options.get("answers")
                if answers:
                    filtered = [a for a in answers if a.get("concept") not in removals]
                    removed_answers += len(answers) - len(filtered)
                    options["answers"] = filtered
                kept.append(question)
            section["questions"] = kept

    encounter_uuid = overview.get("Encounter type UUID")
    if encounter_uuid:
        form["encounterType"] = encounter_uuid
        if "encounter" in form:
            form["encounter"] = overview.get("Encounter type name") or encounter_uuid
    form_uuid = overview.get("Form UUID")
    if form_uuid:
        form["uuid"] = form_uuid
    form["published"] = False
    if args.mark_exercise:
        form.setdefault("meta", {})["exerciseOnly"] = True

    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(form, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print("Wrote {}".format(args.out))
    print("Applied: {} concept remap(s), {} question removal(s), {} answer removal(s).".format(
        len(remaps), removed_questions, removed_answers))
    print("Encounter type UUID: {}; form UUID: {}.".format(encounter_uuid or "(not set)", form_uuid or "(not set)"))
    print("Concept rows with no team decision: {}.".format(pending))
    if pending or not encounter_uuid or not form_uuid:
        print("Not release-ready: resolve pending rows and the header-block UUIDs, then rerun validation.")


if __name__ == "__main__":
    main()
