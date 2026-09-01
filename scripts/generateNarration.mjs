#!/usr/bin/env node
// generateNarration.mjs — generate narration audio for the tour and module intros
// with ElevenLabs, then rewrite the asset manifest Metro bundles.
//
// Run manually and COMMIT the output. The API key never ships in the app:
//
//   ELEVENLABS_API_KEY=sk_... node scripts/generateNarration.mjs
//
// Options:
//   --voice <id>     ElevenLabs voice id (default: ELEVENLABS_VOICE_ID env, else Adam)
//   --model <id>     model id (default eleven_multilingual_v2)
//   --force          regenerate every line, not just missing/changed ones
//   --dry-run        list what would be generated, call nothing, write nothing
//
// Lines are collected from the single source of truth for each surface, so adding
// narration is an edit to the copy — never to this script.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const OUT_DIR = resolve(root, 'assets/narration');
const MANIFEST = resolve(OUT_DIR, 'index.js');
const HASHES = resolve(OUT_DIR, '.hashes.json');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};

const DRY_RUN = flag('dry-run');
const FORCE = flag('force');
const VOICE_ID = opt('voice', process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'); // Adam
const MODEL_ID = opt('model', 'eleven_multilingual_v2');
const API_KEY = process.env.ELEVENLABS_API_KEY;

// ── collecting lines ─────────────────────────────────────────────────────────
// The copy lives in app source that imports React Native, so it is read as text
// and parsed rather than imported — the same constraint the pose/tracker tests hit.

/** Pull `{ id, narrationId, script }` triples out of a source file. */
function collectFrom(file, label) {
  const path = resolve(root, file);
  if (!existsSync(path)) {
    console.warn(`  ! ${file} not found — skipping ${label}`);
    return [];
  }
  const source = readFileSync(path, 'utf8');
  const lines = [];
  // Matches `narrationId: 'x',` followed within the same object by `script: '...'`
  // (or the reverse order), tolerating single quotes, double quotes and backticks.
  const re = /narrationId:\s*['"]([\w.-]+)['"][\s\S]{0,400}?script:\s*(['"`])((?:\\.|(?!\2)[\s\S])*?)\2/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    lines.push({ id: m[1], script: m[3].replace(/\\'/g, "'").replace(/\s+/g, ' ').trim(), from: label });
  }
  return lines;
}

const sources = [
  ['src/components/tour/tourConfig.js', 'tour'],
  ['src/config/moduleIntros.js', 'module intros'],
];

const collected = sources.flatMap(([file, label]) => collectFrom(file, label));

// Duplicate ids would silently overwrite each other's audio.
const seen = new Map();
const lines = [];
for (const line of collected) {
  if (seen.has(line.id)) {
    console.error(`  ! duplicate narrationId "${line.id}" (${seen.get(line.id)} and ${line.from})`);
    process.exitCode = 1;
    continue;
  }
  seen.set(line.id, line.from);
  if (!line.script) {
    console.warn(`  ! "${line.id}" has an empty script — skipping`);
    continue;
  }
  lines.push(line);
}

console.log(`Found ${lines.length} narration line(s).`);
if (!lines.length) process.exit(process.exitCode || 0);

// ── change detection ─────────────────────────────────────────────────────────
// Re-synthesizing unchanged copy costs money for an identical file, so hash the
// script + voice + model and skip anything that already matches.
const hashOf = (line) =>
  createHash('sha256').update(`${line.script}|${VOICE_ID}|${MODEL_ID}`).digest('hex').slice(0, 16);

const previous = existsSync(HASHES) ? JSON.parse(readFileSync(HASHES, 'utf8')) : {};
const pending = lines.filter((line) => {
  const file = resolve(OUT_DIR, `${line.id}.mp3`);
  if (FORCE) return true;
  return !existsSync(file) || previous[line.id] !== hashOf(line);
});

console.log(`${pending.length} to generate, ${lines.length - pending.length} unchanged.`);

if (DRY_RUN) {
  pending.forEach((l) => console.log(`  would generate ${l.id}.mp3  "${l.script.slice(0, 60)}…"`));
} else if (pending.length) {
  if (!API_KEY) {
    console.error('\nELEVENLABS_API_KEY is not set. Export it and re-run:');
    console.error('  ELEVENLABS_API_KEY=sk_... node scripts/generateNarration.mjs\n');
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  for (const line of pending) {
    process.stdout.write(`  ${line.id} … `);
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: line.script,
          model_id: MODEL_ID,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );
    if (!res.ok) {
      console.log('FAILED');
      console.error(`    ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 300)}`);
      process.exit(1);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(resolve(OUT_DIR, `${line.id}.mp3`), buf);
    previous[line.id] = hashOf(line);
    console.log(`${(buf.length / 1024).toFixed(0)}kB`);
  }
  writeFileSync(HASHES, `${JSON.stringify(previous, null, 2)}\n`);
}

// ── manifest ─────────────────────────────────────────────────────────────────
// Metro needs static require() paths, so the map is written out rather than built
// at runtime from a directory listing.
if (!DRY_RUN) {
  const present = existsSync(OUT_DIR)
    ? readdirSync(OUT_DIR).filter((f) => f.endsWith('.mp3')).map((f) => f.replace(/\.mp3$/, '')).sort()
    : [];

  const entries = present.map((id) => `  '${id}': require('./${id}.mp3'),`).join('\n');
  const manifest = readFileSync(MANIFEST, 'utf8');
  const next = manifest.replace(
    /\/\/ GENERATED-START[\s\S]*?\/\/ GENERATED-END/,
    `// GENERATED-START\nexport const NARRATION_ASSETS = {\n${entries}\n};\n// GENERATED-END`
  );
  writeFileSync(MANIFEST, next);

  const orphans = present.filter((id) => !seen.has(id));
  if (orphans.length) {
    console.log(`\nNote: ${orphans.length} generated file(s) no longer have copy: ${orphans.join(', ')}`);
    console.log('They stay bundled until deleted by hand.');
  }
  console.log(`\nManifest updated with ${present.length} asset(s).`);
}
