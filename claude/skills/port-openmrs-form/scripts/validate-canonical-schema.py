#!/usr/bin/env python3

import argparse
import hashlib
import json
import pathlib
import sys
from datetime import datetime, timezone


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate an OpenMRS O3 form against a supplied canonical form.schema.json."
    )
    parser.add_argument("form")
    parser.add_argument("schema")
    parser.add_argument("--report")
    args = parser.parse_args()

    try:
        import jsonschema
    except ImportError:
        print(
            "Canonical validation blocked: the selected Python environment does not provide jsonschema.",
            file=sys.stderr,
        )
        return 2

    form_path = pathlib.Path(args.form).resolve()
    schema_path = pathlib.Path(args.schema).resolve()

    try:
        form_bytes = form_path.read_bytes()
        schema_bytes = schema_path.read_bytes()
        form = json.loads(form_bytes)
        schema = json.loads(schema_bytes)
    except (OSError, json.JSONDecodeError) as error:
        print(f"Could not read input: {error}", file=sys.stderr)
        return 1

    report = {
        "tool": "port-openmrs-form canonical schema validator",
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "form": str(form_path),
        "schema": str(schema_path),
        "formSha256": hashlib.sha256(form_bytes).hexdigest(),
        "schemaSha256": hashlib.sha256(schema_bytes).hexdigest(),
        "valid": False,
        "errors": [],
    }

    validator_class = jsonschema.validators.validator_for(schema)
    validator_class.check_schema(schema)
    validator = validator_class(schema)
    validation_errors = sorted(validator.iter_errors(form), key=lambda error: list(error.absolute_path))

    for error in validation_errors:
        location = ".".join(str(part) for part in error.absolute_path) or "(root)"
        report["errors"].append({"location": location, "message": error.message})

    report["valid"] = not report["errors"]

    if args.report:
        pathlib.Path(args.report).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    if report["valid"]:
        print("Canonical O3 schema validation: PASS")
        print(f"Schema SHA-256: {report['schemaSha256']}")
        return 0

    print("Canonical O3 schema validation: FAIL")
    for error in report["errors"]:
        print(f"ERROR: {error['location']}: {error['message']}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
