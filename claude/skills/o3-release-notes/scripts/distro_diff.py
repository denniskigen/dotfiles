"""List the module versions that changed between two reference application tags.

  python3 distro_diff.py <old-tag> <new-tag> [--repo PATH]

Reads, at each tag of openmrs-distro-referenceapplication:
- frontend/spa-assemble-config.json  frontendModules (npm package -> version)
- distro/pom.xml                     <name.version> properties (Platform and backend modules)

Frontend packages that moved between the same two versions are grouped on one line, since a
monorepo (patient chart, patient management, core) releases all its apps together.
RC tags often pin frontend modules to "latest"; those are flagged, because the real version then
depends on what npm published before the release was built. Compare against the final tag instead.
"""
import argparse, collections, json, re, subprocess

p = argparse.ArgumentParser()
p.add_argument('old')
p.add_argument('new')
p.add_argument('--repo', default='.')
args = p.parse_args()


def show(tag, path):
    return subprocess.run(['git', '-C', args.repo, 'show', f'{tag}:{path}'], capture_output=True, text=True, check=True).stdout


def frontend(tag):
    return json.loads(show(tag, 'frontend/spa-assemble-config.json')).get('frontendModules', {})


def backend(tag):
    return dict(re.findall(r'<([\w.-]+)\.version>([^<]+)</\1\.version>', show(tag, 'distro/pom.xml')))


def changes(old, new):
    rows = []
    for name in sorted(set(old) | set(new)):
        a, b = old.get(name, '(new)'), new.get(name, '(removed)')
        if a != b:
            rows.append((name, a, b))
    return rows


floating = {'latest', 'next'}
fe = changes(frontend(args.old), frontend(args.new))
be = changes(backend(args.old), backend(args.new))

print(f'## Frontend ({args.old} -> {args.new})')
groups = collections.defaultdict(list)
for name, a, b in fe:
    groups[(a, b)].append(name.replace('@openmrs/', ''))
for (a, b), names in sorted(groups.items(), key=lambda kv: kv[1][0]):
    flag = '  <- floating version, check the final tag' if {a, b} & floating else ''
    print(f'- {a} -> {b}: {", ".join(names)}{flag}')

print(f'\n## Platform and backend modules ({args.old} -> {args.new})')
for name, a, b in be:
    print(f'- {name}: {a} -> {b}')
unchanged = len(set(backend(args.old)) & set(backend(args.new))) - sum(1 for n, a, b in be if a != '(new)' and b != '(removed)')
print(f'\n{len(fe)} frontend packages and {len(be)} backend properties changed; {unchanged} backend properties unchanged.')
