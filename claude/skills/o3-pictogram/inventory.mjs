#!/usr/bin/env node
// Inventory of styleguide pictograms and where they are used, plus app-local
// header illustrations that do not come from the styleguide.
//
//   node inventory.mjs                                  # every non-archived openmrs-esm-* checkout under $O3_REPOS_DIR, ~/Code/OpenMRS or ~/Code
//   node inventory.mjs --repo ./fixture/esm-core --repo ./fixture/admin-tools --esm-core ./fixture/esm-core
//   node inventory.mjs --github --out inventory.md      # also query GitHub code search (partial results)
//   node inventory.mjs --include-archived               # also search the ARCHIVED repos below
//
// The report lists every source searched and its revision. A source that was
// not searched, or only partly searched, is listed as such: an incomplete
// search is never evidence that a pictogram is unused.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs, expandHome, DEFAULT_REPOS_DIR, gitRevision } from './lib.mjs';

// Archived on GitHub, so their usage doesn't count. Refresh with:
//   gh repo list openmrs --archived --limit 1000 --json name --jq '.[].name | select(startswith("openmrs-esm-"))'
const ARCHIVED = new Set(['openmrs-esm-form-entry', 'openmrs-esm-home', 'openmrs-esm-metadataexport', 'openmrs-esm-task-list']);

const args = parseArgs(process.argv.slice(2), { repeatable: ['repo'], booleans: ['github', 'include-archived'] });
const reposDir = expandHome(args.repos || DEFAULT_REPOS_DIR);
// Only a folder named after its origin repo counts. Branch checkouts and review
// clones of the same repo would count its usage again.
const isCanonical = (d) => {
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: path.join(reposDir, d), stdio: ['ignore', 'pipe', 'ignore'] });
    return path.basename(url.toString().trim(), '.git') === d;
  } catch {
    return false;
  }
};
const found = fs.existsSync(reposDir)
  ? fs.readdirSync(reposDir).filter((d) => d.startsWith('openmrs-esm-') && isCanonical(d))
  : [];
const skippedArchived = args.repo || args['include-archived'] ? [] : found.filter((d) => ARCHIVED.has(d));
const repos = args.repo
  ? args.repo.map(expandHome)
  : found.filter((d) => !skippedArchived.includes(d)).map((d) => path.join(reposDir, d));
const esmCore = expandHome(args['esm-core'] || repos.find((r) => path.basename(r) === 'openmrs-esm-core') || path.join(reposDir, 'openmrs-esm-core'));
const pictogramsTsx = path.join(esmCore, 'packages/framework/esm-styleguide/src/pictograms/pictograms.tsx');

const NOT_COMPONENTS = new Set(['Pictogram', 'PictogramProps', 'SvgPictogramProps', 'PictogramId', 'MaybePictogram']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo', 'coverage', 'docs', '.claude']);
const isTest = (f) => /\.(test|spec|stories)\.[jt]sx?$/.test(f) || /__mocks__|\/mock(-jest)?\.tsx?$/.test(f);

function sourceFiles(root) {
  let files;
  try {
    files = execFileSync('git', ['ls-files', '*.ts', '*.tsx'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 })
      .toString()
      .split('\n')
      .filter(Boolean);
  } catch {
    files = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        if (e.isDirectory()) {
          if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name));
        } else if (/\.tsx?$/.test(e.name)) files.push(path.join(dir, e.name));
      }
    };
    walk('.');
  }
  return files.filter((f) => !f.split('/').some((p) => SKIP_DIRS.has(p)) && !isTest(f) && !f.includes('esm-styleguide/src/pictograms/'));
}

// 1. What the styleguide registers and exports.
const registered = { ids: [], components: new Map(), aliases: new Map() };
if (fs.existsSync(pictogramsTsx)) {
  const src = fs.readFileSync(pictogramsTsx, 'utf8');
  const idBlock = src.match(/pictogramIds\s*=\s*\[([\s\S]*?)\]/);
  registered.ids = idBlock ? [...idBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
  for (const m of src.matchAll(/export const (\w+Pictogram) = memo\([\s\S]*?pictogram="([^"]+)"/g)) registered.components.set(m[1], m[2]);
  for (const m of src.matchAll(/export const (\w+Pictogram) = (\w+Pictogram);/g)) registered.aliases.set(m[1], m[2]);
}

// 2. Usage across repos, and app-local illustrations.
const usage = new Map();
const illustrations = [];
for (const repo of repos) {
  if (!fs.existsSync(repo)) continue;
  for (const rel of sourceFiles(repo)) {
    // git ls-files still lists files deleted from the working tree
    if (!fs.existsSync(path.join(repo, rel))) continue;
    const src = fs.readFileSync(path.join(repo, rel), 'utf8');
    const where = `${path.basename(repo)}/${rel}`;
    for (const m of new Set([...src.matchAll(/\b([A-Z]\w*Pictogram)\b/g)].map((x) => x[1]))) {
      if (!NOT_COMPONENTS.has(m)) (usage.get(m) || usage.set(m, new Set()).get(m)).add(where);
    }
    for (const m of new Set([...src.matchAll(/['"`](omrs-pict-[a-z0-9-]+)['"`]/g)].map((x) => x[1]))) {
      (usage.get(m) || usage.set(m, new Set()).get(m)).add(where);
    }
    if (rel.endsWith('.tsx') && /<svg\b/.test(src) && /illustration|pictogram|header/i.test(rel) && !/empty/i.test(rel) && !rel.includes('esm-styleguide/')) {
      illustrations.push(where);
    }
  }
}

// 3. Optional GitHub code search. Partial by nature: only indexed default branches, capped results.
let github = 'not searched (pass --github to include GitHub code search)';
if (args.github) {
  try {
    const out = execFileSync('gh', ['search', 'code', 'Pictogram', '--owner', 'openmrs', '--extension', 'tsx', '--limit', '100', '--json', 'repository,path,textMatches'], {
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    }).toString();
    const results = JSON.parse(out);
    for (const r of results) {
      if (/esm-styleguide\/|esm-framework\/|mock|stories|\.test\./.test(r.path)) continue;
      const where = `github:${r.repository.nameWithOwner}/${r.path}`;
      for (const t of r.textMatches || []) {
        for (const m of t.fragment.match(/\b[A-Z]\w*Pictogram\b/g) || []) {
          if (!NOT_COMPONENTS.has(m)) (usage.get(m) || usage.set(m, new Set()).get(m)).add(where);
        }
      }
    }
    github = `searched, ${results.length} raw results (PARTIAL: GitHub code search indexes default branches only and caps results)`;
  } catch (e) {
    github = `search failed (${e.message.split('\n')[0]}); treat GitHub as not searched`;
  }
}

// Report.
const lines = [];
lines.push('# Pictogram inventory', '', '## Sources searched', '');
lines.push(`- Styleguide registry: ${fs.existsSync(pictogramsTsx) ? `${pictogramsTsx} (${gitRevision(esmCore)})` : `NOT FOUND at ${pictogramsTsx}`}`);
const STALE_DAYS = Number(args['stale-days'] || 14);
const stale = [];
for (const r of repos) {
  const rev = fs.existsSync(r) ? gitRevision(r) : 'missing';
  const date = rev.match(/ (\d{4}-\d{2}-\d{2}) /)?.[1];
  const old = date && (Date.now() - Date.parse(date)) / 86400000 > STALE_DAYS;
  if (old) stale.push(path.basename(r));
  lines.push(`- ${r}: ${rev}${old ? ` **(last commit over ${STALE_DAYS} days old: may be behind upstream)**` : ''}`);
}
if (!repos.length) lines.push(`- No repos found under ${reposDir}. Pass --repos or --repo.`);
if (skippedArchived.length) lines.push(`- Skipped as archived: ${skippedArchived.join(', ')} (pass --include-archived to search them)`);
lines.push(`- GitHub: ${github}`, '');
if (stale.length) lines.push(`> Warning: ${stale.length} checkout(s) may be stale (${stale.join(', ')}). Pull them, or pass --github, before treating "no use found" as unused. For historical fixtures, staleness is expected.`, '');

// A feature branch has recent commits but can still lack pictograms that main has.
const pictogramsRel = 'packages/framework/esm-styleguide/src/pictograms';
try {
  const opts = { cwd: esmCore, stdio: ['ignore', 'pipe', 'ignore'] };
  const behind = Number(execFileSync('git', ['rev-list', '--count', 'HEAD..origin/main', '--', pictogramsRel], opts).toString().trim());
  if (behind) {
    const missing = execFileSync('git', ['diff', '--name-only', '--diff-filter=A', 'HEAD', 'origin/main', '--', `${pictogramsRel}/svgs`], opts)
      .toString()
      .split('\n')
      .filter(Boolean)
      .map((f) => path.basename(f));
    lines.push(
      `> Warning: the esm-core checkout is ${behind} commit(s) behind origin/main for ${pictogramsRel}${missing.length ? `, missing ${missing.join(', ')}` : ''}. Export main (\`git archive origin/main ${pictogramsRel} | tar -x -C <dir>\`) and pass --esm-core <dir>.`,
      '',
    );
  }
} catch {}

lines.push('## Styleguide pictograms', '', '| Component | Id | Used in |', '|---|---|---|');
const idOf = (name) => registered.components.get(name) || registered.components.get(registered.aliases.get(name));
const allNames = [...registered.components.keys(), ...registered.aliases.keys()].sort();
for (const name of allNames) {
  const id = idOf(name);
  // Names that share an id show the same artwork, so a use under any of them counts
  const others = allNames.filter((n) => n !== name && idOf(n) === id);
  const uses = new Set([
    ...(usage.get(name) || []),
    ...(usage.get(id) || []),
    ...others.flatMap((n) => [...(usage.get(n) || [])].map((where) => `${where} (as ${n})`)),
  ]);
  const alias = registered.aliases.has(name) ? ` (alias of ${registered.aliases.get(name)})` : '';
  lines.push(`| ${name}${alias} | ${id || '?'} | ${uses.size ? [...uses].join('<br>') : 'no use found in the sources above'} |`);
}
const unexported = registered.ids.filter((id) => ![...registered.components.values()].includes(id));
if (unexported.length) lines.push('', `Registered ids with no component export: ${unexported.join(', ')}`);
const unknown = [...usage.keys()].filter((k) => !allNames.includes(k) && !registered.ids.includes(k));
if (unknown.length) lines.push('', `Referenced but not in this styleguide revision: ${unknown.map((k) => `${k} (${[...usage.get(k)].join(', ')})`).join('; ')}`);

// SVG files in the styleguide that the registration file never imports have
// no component yet, but they are drawn in the house style and can be reused.
const svgDir = path.join(path.dirname(pictogramsTsx), 'svgs');
const registrationTs = path.join(path.dirname(pictogramsTsx), 'pictogram-registration.ts');
if (fs.existsSync(svgDir)) {
  const svgFiles = fs.readdirSync(svgDir).filter((f) => f.endsWith('.svg')).sort();
  const registrationSrc = fs.existsSync(registrationTs) ? fs.readFileSync(registrationTs, 'utf8') : '';
  const imported = new Set([...registrationSrc.matchAll(/from\s+['"]\.\/svgs\/([^'"]+\.svg)['"]/g)].map((m) => m[1]));
  const unregistered = svgFiles.filter((f) => !imported.has(f));
  lines.push('', '## SVG files not registered', '');
  lines.push(
    unregistered.length
      ? `In ${svgDir} but never imported by pictogram-registration.ts, so no component exists yet. Check these for reuse before drawing: ${unregistered.join(', ')}`
      : '- none',
  );

  const byContent = new Map();
  for (const f of svgFiles) {
    const key = fs.readFileSync(path.join(svgDir, f), 'utf8').replace(/\s+/g, '');
    (byContent.get(key) || byContent.set(key, []).get(key)).push(f);
  }
  const identical = [...byContent.values()].filter((group) => group.length > 1);
  lines.push('', '## Identical artwork', '');
  lines.push(...(identical.length ? identical.map((g) => `- ${g.join(' = ')}: pages using these show the same picture`) : ['- none']));
}

lines.push('', '## App-local illustrations (inline SVG components outside the styleguide)', '');
lines.push(...(illustrations.length ? illustrations.map((i) => `- ${i}`) : ['- none found in the sources above']));
lines.push('', 'Render these next to candidates with preview.mjs --jsx; a candidate can collide with them too.');

const report = lines.join('\n');
if (args.out) fs.writeFileSync(expandHome(args.out), report + '\n');
console.log(report);
