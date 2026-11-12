#!/usr/bin/env python3
"""Print the OpenMRS Squad Dashboard as JSON, in the order the view shows it.

Reads the public Jira Product Discovery view behind om.rs/squad-dashboard,
so it needs no login and returns exactly the ideas the view's own filter
selects. Comments aren't in this feed; fetch them per key through Jira.
"""
import datetime as dt
import json
import sys
import time
import urllib.error
import urllib.request

VIEW = "01a60d0e-0be1-452c-b7e6-da261ea7967a"
BASE = f"https://openmrs.atlassian.net/gateway/api/jpd/views/public/v1/views/{VIEW}"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")

SQUAD = "customfield_10104"
ORGS = "customfield_10165"
LEADS = "customfield_10166"
STAGE = "customfield_10152"
RANK = "customfield_10019"
DOCS = "customfield_10170"
CODE = "customfield_10172"
DISCUSS = "customfield_10173"


def get(path, tries=3):
    req = urllib.request.Request(BASE + path, headers={
        "User-Agent": UA, "Accept": "application/json"})
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}"
        except Exception as e:  # noqa: BLE001
            last = repr(e)
        time.sleep(2 * (i + 1))
    raise RuntimeError(f"{path}: {last}")


def main():
    search = get("/search")
    fields = get("/fields")

    options = {}
    for f in fields["issueTypeFields"].get("10044", []):
        for o in f.get("options") or []:
            options[o["id"]] = o["value"]
    users = {k: v.get("displayName", k) for k, v in search.get("users", {}).items()}

    def opt(v):
        return options.get(v, str(v))

    rows = []
    for issue in sorted(search["issues"], key=lambda i: i["fields"].get(RANK) or ""):
        f = issue["fields"]
        updated = f.get("updated")
        rows.append({
            "key": issue["key"],
            "url": f"https://openmrs.atlassian.net/browse/{issue['key']}",
            "summary": f.get("summary"),
            "squad": [opt(v) for v in f.get(SQUAD) or []],
            "stage": opt(f[STAGE]) if f.get(STAGE) else None,
            "leads": [users.get(u, u) for u in f.get(LEADS) or []],
            "orgs": [opt(v) for v in f.get(ORGS) or []],
            "docs": f.get(DOCS),
            "code": f.get(CODE),
            "discuss": f.get(DISCUSS),
            "updated": dt.datetime.fromtimestamp(updated / 1000, dt.timezone.utc).isoformat()
            if isinstance(updated, (int, float)) else updated,
        })

    total = search.get("pagination", {}).get("total")
    json.dump({"view": f"https://openmrs.atlassian.net/jira/discovery/share/views/{VIEW}",
               "total": total, "returned": len(rows), "ideas": rows},
              sys.stdout, ensure_ascii=False, indent=1)
    print()


if __name__ == "__main__":
    main()
