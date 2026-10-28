"""Merged PRs by organization, for the release notes' Contributors and Contributor Metrics sections.

  python3 org_contributions.py commits.tsv <out-dir> --from 3.7.1 --to 3.8.0 [--ledger DIR]

commits.tsv is collect_commits.sh output. A commit whose subject ends in "(#N)" counts as merged PR N,
credited to the commit's GitHub account (the PR author, since O3 repos squash-merge). Merge commits,
bot accounts, translation syncs and release commits are left out. Organizations come from the private
ledger (default ~/Code/o3-release-notes-archive/ledger): pr-overrides.tsv first, then people.tsv.

Writes to <out-dir>:
  prs.tsv             one row per PR with its organization and where that came from, for the release
                      team to review before anything is published
  contributors.tsv    one row per person with their organization and PR counts
  sheet.csv           the release's tab in the "Release Org Contributions to PRs" sheet
  sheet-platform.csv  the same for Platform (openmrs-core) PRs, which are counted separately
  metrics.txt         the Contributor Metrics numbers and method sentence for the page
  chart.png           the bar chart, drawn by contrib_chart.py from sheet.csv

Exits 1 when a PR author isn't in people.tsv. Their PRs are counted as Unconfirmed and listed, so
add them to the ledger and run this again.
"""
import argparse, collections, csv, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
BOT = re.compile(r"(bot|renovate|dependabot|github-actions|transifex|copilot)", re.I)
SKIP = re.compile(r"^\(release\)|translation|^\[maven-release|prepare (release|for next)|^\[skip-ci\]|^Release \d|"
                  r"Update dependency versions|^Merge ", re.I)
PRNUM = re.compile(r"\s*\(#(\d+)\)\s*$")
PLATFORM = "openmrs-core"
NOT_ORGS = {"Independent", "Unconfirmed"}

# Organization labels as the sheet spells them; an organization missing here uses its ledger name
LABEL = {"OpenMRS Support": "OMRS", "UW ITECH DIGI": "DIGI", "Palladium-Kenya": "Palladium", "AMPATH": "Ampath",
         "EPCare": "ePcare", "Independent": "Volunteer"}
# Order of the sheet's per-organization counts (column E), as in the 3.7 and 3.8 tabs
COUNT_ORDER = ["DIGI", "SolDevelo", "Madiro", "OMRS", "PIH", "ICRC", "Palladium", "ePcare", "Volunteer", "Ampath",
               "HISP India", "Intellisoft", "Unconfirmed"]
# Sheet "Where" names, in the sheet's row order; other repos are named from the repo and go last
WHERE = {"openmrs-esm-patient-chart": "Patient Chart", "openmrs-esm-core": "ESM Core",
         "openmrs-esm-patient-management": "Patient Management", "openmrs-esm-admin-tools": "Admin Tools",
         "openmrs-esm-laboratory-app": "Laboratory", "openmrs-esm-dispensing-app": "Dispensing",
         "openmrs-esm-fast-data-entry-app": "Fast Data Entry", "openmrs-esm-stock-management-app": "Stock Management",
         "openmrs-esm-billing-app": "Billing", "openmrs-esm-form-builder": "Form Builder",
         "openmrs-esm-cohortbuilder-app": "Cohort Builder", "openmrs-esm-user-onboarding-app": "User Onboarding",
         "openmrs-esm-form-engine-lib": "React Form Engine", "openmrs-ngx-formentry": "Angular Form Engine",
         "openmrs-distro-referenceapplication": "Distro RefApp", "openmrs-core": "Platform",
         "openmrs-module-queue": "Queue", "openmrs-module-openconceptlab": "Open Concept Lab",
         "openmrs-module-addresshierarchy": "Address Hierarchy", "openmrs-module-authentication": "Authentication",
         "openmrs-module-emrapi": "EMR API", "openmrs-module-billing": "Billing",
         "openmrs-module-patientdocuments": "Patient Documents", "openmrs-module-attachments": "Attachments",
         "openmrs-module-fhir2": "FHIR2", "openmrs-module-webservices.rest": "Webservices REST",
         "openmrs-module-reporting": "Reporting", "openmrs-module-legacyui": "Legacy UI",
         "openmrs-module-referencedemodata": "Reference Demo Data", "openmrs-module-metadataexport": "Metadata Export",
         "openmrs-content-referenceapplication-demo": "Demo Content"}
WHERE_ORDER = {w: i for i, w in enumerate(dict.fromkeys(WHERE.values()))}


def area(repo):
    if repo.startswith("openmrs-esm-") or repo == "openmrs-ngx-formentry":
        return "Frontend"
    if repo == "openmrs-distro-referenceapplication":
        return "Distro"
    if repo.startswith("openmrs-content-"):
        return "Content"
    return "Backend"


def where(repo):
    if repo in WHERE:
        return WHERE[repo]
    name = re.sub(r"^openmrs-(esm-|module-|content-)?", "", repo).removesuffix("-app")
    return name.replace("-", " ").title()


def read_tsv(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f, delimiter="\t"))


def prs_from_commits(path):
    prs, seen = {}, set()
    for line in open(path):
        p = line.rstrip("\n").split("\t")
        if len(p) < 5:
            continue
        repo, sha, login, subject, parents = p[:5]
        if (repo, sha) in seen or parents != "1" or BOT.search(login) or SKIP.search(subject):
            continue
        seen.add((repo, sha))
        m = PRNUM.search(subject)
        if m and (repo, int(m.group(1))) not in prs:
            prs[(repo, int(m.group(1)))] = {"repo": repo, "pr": int(m.group(1)), "author": login.lstrip("?"),
                                           "title": PRNUM.sub("", subject), "sha": sha}
    return list(prs.values())


def write_sheet(path, rows):
    kind_rank = lambda t: 0 if t.startswith("(feat)") else 1 if t.startswith("(fix)") else 2
    rows = sorted(rows, key=lambda r: (WHERE_ORDER.get(r["where"], len(WHERE_ORDER)), r["where"], r["kind"],
                                       kind_rank(r["title"]), r["pr"]))
    labels = {r["label"] for r in rows}
    present = [o for o in COUNT_ORDER if o in labels] + sorted(labels - set(COUNT_ORDER))
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["", "Where", "Org", "", "", "PR"])
        for i, r in enumerate(rows):
            count = f'=COUNTIF(C:C,"{present[i]}")' if i < len(present) else ""
            w.writerow(["", r["where"], r["label"], r["kind"], count, f'{r["title"]} by @{r["author"]} in #{r["pr"]}'])


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("commits")
    ap.add_argument("out")
    ap.add_argument("--from", dest="prev", required=True, help="previous release, e.g. 3.7.1")
    ap.add_argument("--to", dest="new", required=True, help="this release, e.g. 3.8.0")
    ap.add_argument("--ledger", default=os.path.expanduser("~/Code/o3-release-notes-archive/ledger"))
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    people = {p["login"]: p for p in read_tsv(os.path.join(args.ledger, "people.tsv"))}
    overrides = {(o["repo"], int(o["pr"])): o for o in read_tsv(os.path.join(args.ledger, "pr-overrides.tsv"))}

    prs = prs_from_commits(args.commits)
    for r in prs:
        o = overrides.get((r["repo"], r["pr"]))
        person = people.get(r["author"])
        if o:
            r["org"], r["source"] = o["count_as_org"], "override: " + o["reason"]
        elif person:
            r["org"], r["source"] = person["org"], "ledger"
        else:
            r["org"], r["source"] = "Unconfirmed", "not in people.tsv"
        r["label"] = LABEL.get(r["org"], r["org"])
        r["where"], r["area"] = where(r["repo"]), area(r["repo"])
        r["kind"] = "Frontend" if r["area"] == "Frontend" else "Backend"

    release = [r for r in prs if r["repo"] != PLATFORM]
    platform = [r for r in prs if r["repo"] == PLATFORM]

    with open(os.path.join(args.out, "prs.tsv"), "w", newline="") as f:
        w = csv.writer(f, delimiter="\t", lineterminator="\n")
        w.writerow(["org", "author", "name", "repo", "pr", "title", "org source", "url"])
        for r in sorted(prs, key=lambda r: (r["org"], r["author"].lower(), r["repo"], r["pr"])):
            w.writerow([r["org"], r["author"], people.get(r["author"], {}).get("name", ""), r["repo"], r["pr"],
                        r["title"], r["source"], f'https://github.com/openmrs/{r["repo"]}/pull/{r["pr"]}'])

    counts = collections.Counter((r["author"], r["repo"] == PLATFORM) for r in prs)
    with open(os.path.join(args.out, "contributors.tsv"), "w", newline="") as f:
        w = csv.writer(f, delimiter="\t", lineterminator="\n")
        w.writerow(["org", "author", "name", "release PRs", "platform PRs"])
        for a in sorted({r["author"] for r in prs}, key=lambda a: (people.get(a, {}).get("org", "Unconfirmed"), a.lower())):
            w.writerow([people.get(a, {}).get("org", "Unconfirmed"), a, people.get(a, {}).get("name", ""),
                        counts[(a, False)], counts[(a, True)]])

    write_sheet(os.path.join(args.out, "sheet.csv"), release)
    write_sheet(os.path.join(args.out, "sheet-platform.csv"), platform)

    by_org = collections.Counter(r["org"] for r in release)
    orgs = sorted(o for o in by_org if o not in NOT_ORGS)
    n = len(release)
    lines = [
        f"Number of PRs: {n}",
        f"Number of organizations: {len(orgs)} ({', '.join(orgs)})",
        f"% from OpenMRS Support: {100 * by_org['OpenMRS Support'] / n:.1f}%" if n else "% from OpenMRS Support: -",
        "",
        "Method: Merged PRs across the frontend, backend, distro and content repositories between "
        f"{args.prev} and {args.new}, excluding bots, translation syncs and release commits. "
        "Platform (openmrs-core) PRs are counted separately.",
        "",
        "By organization:",
        *(f"  {o}: {c} ({100 * c / n:.1f}%)" for o, c in sorted(by_org.items(), key=lambda kv: (-kv[1], kv[0]))),
        f"Overrides applied: {sum(r['source'].startswith('override') for r in release)}",
        "",
        f"Platform PRs (counted separately): {len(platform)}",
        *(f"  {o}: {c}" for o, c in collections.Counter(r["org"] for r in platform).most_common()),
    ]
    open(os.path.join(args.out, "metrics.txt"), "w").write("\n".join(lines) + "\n")
    print("\n".join(lines))

    run = ["uv", "run", "--quiet"] if shutil.which("uv") else [sys.executable]
    subprocess.run([*run, os.path.join(HERE, "contrib_chart.py"), os.path.join(args.out, "sheet.csv"),
                    os.path.join(args.out, "chart.png"), f"O3 {args.new}"], check=True, stdout=subprocess.DEVNULL)

    missing = collections.Counter(r["author"] for r in prs if r["org"] == "Unconfirmed")
    if missing:
        print(f"\n{len(missing)} authors aren't in people.tsv; their PRs are counted as Unconfirmed:", file=sys.stderr)
        for a, c in missing.most_common():
            print(f"  {a}\t{c} PRs\thttps://github.com/{a}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
