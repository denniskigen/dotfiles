#!/usr/bin/env python3
"""Print a Wispr Flow meeting transcript with speaker names, read-only.

Finds the newest finished meeting whose title matches --title (default
"O3 Squad Calls"), optionally on a given local date, and prints
"Name: text" lines from its refined transcript. Exits 2 if no matching
meeting exists yet, 3 if it exists but the transcript isn't ready.
"""
import argparse
import datetime as dt
import json
import os
import sqlite3
import sys

ROOT = os.path.expanduser("~/Library/Application Support/Wispr Flow")


def connect():
    uri = "file:" + os.path.join(ROOT, "flow.sqlite") + "?mode=ro"
    return sqlite3.connect(uri, uri=True)


def speaker_names(speaker_map):
    people = speaker_map.get("people", {})
    names = {}
    for sid, a in speaker_map.get("assignments", {}).items():
        pid = a.get("user") or a.get("consensus") or a.get("dom") or a.get("llm")
        person = people.get(pid) if pid else None
        names[sid] = person.get("name") if person and person.get("name") else f"Speaker {sid}"
    return names


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", default="O3 Squad Calls")
    ap.add_argument("--date", help="local date YYYY-MM-DD; defaults to the newest match")
    ap.add_argument("--list", action="store_true", help="list matching meetings and exit")
    a = ap.parse_args()

    db = connect()
    rows = db.execute(
        "SELECT id, title, createdAt, transcriptReady, refineStatus, speakerMap "
        "FROM Meetings WHERE isDeleted = 0 AND title = ? ORDER BY createdAt DESC",
        (a.title,)).fetchall()

    def local_date(created):
        t = dt.datetime.fromisoformat(created.replace(" +00:00", "+00:00"))
        return t.astimezone().date().isoformat()

    if a.list:
        for r in rows:
            print(r[0], local_date(r[2]), f"ready={r[3]}", r[4])
        return
    if a.date:
        rows = [r for r in rows if local_date(r[2]) == a.date]
    if not rows:
        print(f"No '{a.title}' meeting" + (f" on {a.date}" if a.date else ""), file=sys.stderr)
        sys.exit(2)

    mid, title, created, ready, status, smap = rows[0]
    path = os.path.join(ROOT, "meetings", mid, "refined.ndjson")
    if not ready or status != "complete" or not os.path.exists(path):
        print(f"Transcript for {title} ({local_date(created)}) isn't ready: "
              f"transcriptReady={ready}, refineStatus={status}", file=sys.stderr)
        sys.exit(3)

    names = speaker_names(json.loads(smap or "{}"))
    started = dt.datetime.fromisoformat(created.replace(" +00:00", "+00:00")).astimezone().strftime("%H:%M")
    print(f"# {title}, {local_date(created)}, recording started {started} (Wispr Flow meeting {mid})")
    last = None
    with open(path) as f:
        for line in f:
            e = json.loads(line)
            name = names.get(str(e["speaker"]["id"]), f"Speaker {e['speaker']['id']}")
            text = e["text"].strip()
            if not text:
                continue
            print(f"[{e['timestamp']}] {name}: {text}" if name != last else f"[{e['timestamp']}] {text}")
            last = name


if __name__ == "__main__":
    main()
