// Screen wiring. Run: `npm run test:simcoach`.
//
// The new workspace screens import a dozen service functions and schema helpers by
// name. A typo in any of them is invisible until a coach opens the screen and gets
// "undefined is not a function" — there is no compile step in this project that would
// catch it, and node_modules is not installed in CI here, so the screens cannot simply
// be imported. So: read the imports out of the source and check each one is really
// exported by the module it claims to come from.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

const SCREENS = [
  'src/screens/main/SimCoachWorkspaceScreen.js',
  'src/screens/main/SimCoachWorkspaceDetailScreen.js',
  'src/screens/main/SimCoachGamePrepScreen.js',
];

/** Named exports of a module, by scraping `export const X` / `export { ... }`. */
const exportsOf = (path) => {
  const src = read(path);
  const names = new Set(
    [...src.matchAll(/export const (\w+)/g)].map((m) => m[1]),
  );
  for (const m of src.matchAll(/export \{([^}]+)\}/g)) {
    m[1].split(',').forEach((n) => {
      const name = n.trim().split(/\s+as\s+/).pop().trim();
      if (name) names.add(name);
    });
  }
  return names;
};

/** Named imports in `src` from a module whose path ends with `suffix`. */
const importsFrom = (src, suffix) => {
  const re = new RegExp(`import \\{([^}]+)\\} from '[^']*${suffix}'`, 'g');
  const out = [];
  for (const m of src.matchAll(re)) {
    m[1].split(',').forEach((n) => {
      const name = n.trim().split(/\s+as\s+/)[0].trim();
      if (name) out.push(name);
    });
  }
  return out;
};

const SOURCES = {
  firestoreService: exportsOf('src/services/firestoreService.js'),
  workspaceSchema: exportsOf('src/services/simcoach/workspaceSchema.js'),
  migration: exportsOf('src/services/simcoach/migration.js'),
  evidenceConfidence: exportsOf('src/services/simcoach/evidenceConfidence.js'),
};

test('every service function the screens import actually exists', () => {
  for (const screen of SCREENS) {
    const src = read(screen);
    for (const name of importsFrom(src, 'firestoreService')) {
      assert.ok(
        SOURCES.firestoreService.has(name),
        `${screen} imports ${name} from firestoreService, which does not export it`,
      );
    }
  }
});

test('every schema helper the screens import actually exists', () => {
  for (const screen of SCREENS) {
    const src = read(screen);
    for (const name of importsFrom(src, 'workspaceSchema')) {
      assert.ok(
        SOURCES.workspaceSchema.has(name),
        `${screen} imports ${name} from workspaceSchema, which does not export it`,
      );
    }
    for (const name of importsFrom(src, 'simcoach/migration')) {
      assert.ok(
        SOURCES.migration.has(name),
        `${screen} imports ${name} from migration, which does not export it`,
      );
    }
  }
});

test('firestoreService imports from the pure modules resolve', () => {
  const src = read('src/services/firestoreService.js');
  for (const name of importsFrom(src, 'simcoach/workspaceSchema')) {
    assert.ok(SOURCES.workspaceSchema.has(name), `firestoreService imports missing ${name}`);
  }
  for (const name of importsFrom(src, 'simcoach/migration')) {
    assert.ok(SOURCES.migration.has(name), `firestoreService imports missing ${name}`);
  }
});

test('every screen the new ones navigate to is registered', () => {
  // navigate() to an unregistered name throws at tap time, not at build time.
  const nav = read('src/navigation/SharedStackNavigator.js');
  const registered = new Set(
    [...nav.matchAll(/\{ name: '([^']+)'/g)].map((m) => m[1]),
  );
  const targets = new Set();
  for (const screen of [...SCREENS, 'src/screens/main/SimCoachScreen.js']) {
    for (const m of read(screen).matchAll(/navigation\.navigate\(\s*'([^']+)'/g)) {
      targets.add(m[1]);
    }
  }
  assert.ok(targets.size > 0, 'found no navigation targets — did the screens change shape?');
  for (const t of targets) {
    assert.ok(registered.has(t), `navigate('${t}') has no registered screen`);
  }
});

test('the new screens are registered and their components imported', () => {
  const nav = read('src/navigation/SharedStackNavigator.js');
  for (const [name, component] of [
    ['SimCoachWorkspace', 'SimCoachWorkspaceScreen'],
    ['SimCoachWorkspaceDetail', 'SimCoachWorkspaceDetailScreen'],
    ['SimCoachGamePrep', 'SimCoachGamePrepScreen'],
  ]) {
    assert.ok(nav.includes(`import ${component} from`), `${component} is not imported`);
    assert.ok(
      new RegExp(`\\{ name: '${name}', component: ${component}`).test(nav),
      `${name} is not registered to ${component}`,
    );
  }
});

test('the coach hub reaches the workspace', () => {
  const hub = read('src/screens/main/SimCoachScreen.js');
  assert.match(hub, /navigate\('SimCoachWorkspace'\)/, 'no entry point into Teams');
  assert.match(hub, /id: 'teams'/, 'no Teams tab');
  // The tab branch must exist, or selecting Teams renders another tab's content.
  assert.match(hub, /tab === 'teams'/, 'Teams tab has no branch');
});

test('each new screen has a default export', () => {
  for (const screen of SCREENS) {
    assert.match(read(screen), /export default \w+;/, `${screen} has no default export`);
  }
});
