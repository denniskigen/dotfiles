#!/usr/bin/env python3
"""Scan OpenMRS Talk for activity since the last run and print a JSON digest.

Uses only endpoints that load without a login: category topic lists and a
topic's last page of posts. Search and per-user pages sit behind a bot
challenge, so mentions and replies are found by reading recent posts.
"""
import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

BASE = "https://talk.openmrs.org"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")
CATEGORIES = {8: "dev", 24: "software", 7: "implementing", 6: "community",
              41: "ask", 17: "projects"}
KEYWORDS = ["o3", "frontend", "front-end", "esm", "react", "microfrontend",
            "micro-frontend", "form engine", "form builder", "patient chart",
            "release", "rfc", "carbon", "typescript", "yarn", "i18n",
            "translation", "angular", "ngx-formentry", "dev3", "playwright",
            "e2e", "eslint", "styleguide", "workspace", "spa", "app shell"]
STATE = os.path.expanduser("~/.claude/community-watch/state.json")


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


def parse(ts):
    return dt.datetime.fromisoformat(ts.replace("Z", "+00:00"))


def text(cooked, limit=280):
    t = re.sub(r"<[^>]+>", " ", cooked)
    t = html.unescape(re.sub(r"\s+", " ", t)).strip()
    return t if len(t) <= limit else t[:limit].rstrip() + "..."


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--user", default="dennis")
    ap.add_argument("--since", help="ISO timestamp; defaults to last run")
    ap.add_argument("--state", default=STATE)
    ap.add_argument("--dry", action="store_true", help="don't update state")
    ap.add_argument("--max-topics", type=int, default=60)
    a = ap.parse_args()

    now = dt.datetime.now(dt.timezone.utc)
    if a.since:
        since = parse(a.since)
    elif os.path.exists(a.state):
        since = parse(json.load(open(a.state))["last_run"])
    else:
        since = now - dt.timedelta(days=1)

    out = {"since": since.isoformat(), "now": now.isoformat(), "user": a.user,
           "mentions": [], "replies_to_me": [], "my_topics": [],
           "new_topics": [], "other_activity": [], "errors": []}
    seen = set()
    candidates = []
    for cid, slug in CATEGORIES.items():
        try:
            d = get(f"/c/{slug}/{cid}/l/latest.json?order=activity")
        except RuntimeError as e:
            out["errors"].append(str(e))
            continue
        for t in d["topic_list"]["topics"]:
            if t["id"] in seen or t.get("pinned"):
                continue
            seen.add(t["id"])
            if parse(t["last_posted_at"]) > since:
                candidates.append((t, slug))
    candidates.sort(key=lambda c: c[0]["last_posted_at"], reverse=True)
    if len(candidates) > a.max_topics:
        out["errors"].append(
            f"{len(candidates)} active topics; only the {a.max_topics} most recent were read")
        candidates = candidates[: a.max_topics]

    for t, slug in candidates:
        url = f"{BASE}/t/{t['slug']}/{t['id']}"
        try:
            d = get(f"/t/{t['id']}/last.json")
        except RuntimeError as e:
            out["errors"].append(str(e))
            continue
        posts = d["post_stream"]["posts"]
        participants = {p["username"] for p in d.get("details", {}).get("participants", [])}
        participants |= {p["username"] for p in posts}
        new_posts = [p for p in posts if parse(p["created_at"]) > since]
        is_new_topic = parse(t["created_at"]) > since
        title_l = t["title"].lower()
        hits = sorted({k for k in KEYWORDS if k in title_l})
        topic_entry = {"title": t["title"], "url": url, "category": slug,
                       "tags": t.get("tags", []), "posts": t["posts_count"],
                       "keywords": hits}
        mine = a.user in participants
        flagged = False
        for p in new_posts:
            if p["username"] == a.user:
                continue
            entry = {"topic": t["title"], "url": f"{url}/{p['post_number']}",
                     "by": p.get("name") or p["username"],
                     "username": p["username"], "at": p["created_at"],
                     "excerpt": text(p["cooked"])}
            mentions = set(re.findall(r'class="mention"[^>]*>@([\w.-]+)', p["cooked"]))
            reply_to = (p.get("reply_to_user") or {}).get("username")
            if a.user in mentions:
                out["mentions"].append(entry); flagged = True
            elif reply_to == a.user:
                out["replies_to_me"].append(entry); flagged = True
            elif mine:
                out["my_topics"].append(entry); flagged = True
        if flagged:
            continue
        if is_new_topic:
            first = posts[0] if posts and posts[0]["post_number"] == 1 else None
            topic_entry["by"] = (first or {}).get("name") or t.get("last_poster_username")
            topic_entry["excerpt"] = text(first["cooked"]) if first else ""
            out["new_topics"].append(topic_entry)
        elif new_posts:
            topic_entry["new_posts"] = len(new_posts)
            topic_entry["latest_by"] = new_posts[-1].get("name") or new_posts[-1]["username"]
            topic_entry["latest_excerpt"] = text(new_posts[-1]["cooked"], 160)
            out["other_activity"].append(topic_entry)

    out["counts"] = {k: len(out[k]) for k in
                     ("mentions", "replies_to_me", "my_topics", "new_topics", "other_activity")}
    json.dump(out, sys.stdout, indent=1, ensure_ascii=False)
    print()
    if not a.dry:
        os.makedirs(os.path.dirname(a.state), exist_ok=True)
        json.dump({"last_run": now.isoformat()}, open(a.state, "w"))


if __name__ == "__main__":
    main()
