#!/usr/bin/env python3
"""Record a gate result in the review workbook's Build Results sheet.

Usage:
  python3 record-gate.py --workbook REVIEW.xlsx --step N --status "Passed|Blocked|Not started"
      [--evidence "..."] [--action "..."] [--artifact "..."]

Run this after each gate so the workbook, not the person who ran the port, is the
source of truth for run status. Works on Python 3.9+ and needs only openpyxl.
"""

import argparse
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is required (see build-workbook.py for an isolated-venv example).")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", required=True)
    parser.add_argument("--step", type=int, required=True, choices=range(1, 8))
    parser.add_argument("--status", required=True, choices=["Passed", "Blocked", "Not started"])
    parser.add_argument("--evidence")
    parser.add_argument("--action")
    parser.add_argument("--artifact")
    args = parser.parse_args()

    workbook = openpyxl.load_workbook(args.workbook)
    sheet = workbook["Build Results"]
    for row in sheet.iter_rows(min_row=2):
        if row[0].value == args.step:
            row[2].value = args.status
            if args.evidence is not None: row[3].value = args.evidence
            if args.action is not None: row[4].value = args.action
            if args.artifact is not None: row[5].value = args.artifact
            workbook.save(args.workbook)
            print(f"Step {args.step}: {args.status}" + (f" — {args.evidence}" if args.evidence else ""))
            return
    sys.exit(f"Step {args.step} not found in Build Results.")


if __name__ == "__main__":
    main()
