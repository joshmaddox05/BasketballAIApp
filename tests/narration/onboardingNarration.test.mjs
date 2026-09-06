// Onboarding narration copy. Run: `npm run test:narration`.
//
// Every one of these lines is spoken aloud to someone in their first two minutes
// with the app, and the failure modes are all silent ones:
//
//   - a duplicate id makes two screens overwrite each other's generated audio,
//     so one of them speaks the wrong line (the generator errors on this, but
//     only if someone runs it — this catches it in CI instead)
//   - an id the generator's regex cannot see never gets audio produced, and
//     quietly degrades to the robotic OS voice forever
//   - a missing role mapping means a coach or parent finishes onboarding hearing
//     copy written for a player
//
// None of these break a build or throw. They just make the app say the wrong
// thing to a real person.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  ONBOARDING_NARRATION,
  completionNarrationFor,
} from '../../src/config/onboardingNarration.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

const LINES = Object.entries(ONBOARDING_NARRATION);

// ------------------------------------------------------------------ the lines

test('every line has an id and a script', () => {
  for (const [key, line] of LINES) {
    assert.equal(typeof line.narrationId, 'string', `${key} narrationId`);
    assert.equal(typeof line.script, 'string', `${key} script`);
    assert.ok(line.narrationId.length, `${key} has an empty narrationId`);
    assert.ok(line.script.trim().length, `${key} has an empty script`);
  }
});

test('ids are unique', () => {
  const ids = LINES.map(([, l]) => l.narrationId);
  assert.equal(new Set(ids).size, ids.length, 'two lines share a narrationId');
});

test('ids are namespaced and collide with nothing else that gets generated', () => {
  // The generator writes assets/narration/<id>.mp3 into one flat directory
  // shared with the tour and the module intros.
  const others = read('src/components/tour/tourConfig.js') + read('src/config/moduleIntros.js');
  for (const [key, line] of LINES) {
    assert.ok(
      line.narrationId.startsWith('onboarding.'),
      `${key}: "${line.narrationId}" is not namespaced under onboarding.`,
    );
    assert.equal(
      others.includes(`'${line.narrationId}'`),
      false,
      `${line.narrationId} is also used by the tour or a module intro`,
    );
  }
});

test('ids use only characters the generator will accept', () => {
  // scripts/generateNarration.mjs matches [\w.-]+ and writes the id straight
  // into a filename. Anything else is silently skipped — no audio, no error.
  for (const [key, line] of LINES) {
    assert.match(line.narrationId, /^[\w.-]+$/, `${key}: "${line.narrationId}"`);
  }
});

// -------------------------------------------------------- generator visibility

test('the generator can actually see every line', () => {
  // Reproduces the scraper's own regex against this file. The scripts live in a
  // plain object rather than the array-of-steps shape the tour uses, so this is
  // the assertion that the two formats really are both parseable.
  const source = read('src/config/onboardingNarration.js');
  const re = /narrationId:\s*['"]([\w.-]+)['"][\s\S]{0,400}?script:\s*(['"`])((?:\\.|(?!\2)[\s\S])*?)\2/g;
  const found = new Set([...source.matchAll(re)].map((m) => m[1]));

  for (const [key, line] of LINES) {
    assert.ok(
      found.has(line.narrationId),
      `${key}: the generator's regex cannot find "${line.narrationId}" — it would never get audio`,
    );
  }
});

test('this file is registered as a generator source', () => {
  assert.ok(
    read('scripts/generateNarration.mjs').includes('src/config/onboardingNarration.js'),
    'onboardingNarration.js is not in the generator sources — nothing here would ever be produced',
  );
});

// ------------------------------------------------------------------ the copy

test('lines are long enough to say something and short enough to sit through', () => {
  for (const [key, line] of LINES) {
    const words = line.script.trim().split(/\s+/).length;
    assert.ok(words >= 12, `${key} is ${words} words — too short to be worth interrupting for`);
    // Roughly 30 seconds at a conversational pace. Past that a first-time user
    // has already tapped Continue and is listening to the previous screen.
    assert.ok(words <= 90, `${key} is ${words} words — too long for a step someone will skip past`);
  }
});

test('no line is a verbatim reading of on-screen copy', () => {
  // A voice that only reads the screen aloud is noise. Spot-checked against the
  // one case most likely to be copy-pasted.
  assert.equal(
    ONBOARDING_NARRATION.role.script.includes(
      'Your role tailors the app experience to your specific needs',
    ),
    false,
    'the role line repeats the subtitle verbatim',
  );
});

// ------------------------------------------------------------ role completions

test('every role gets its own closing line', () => {
  const roles = ['player', 'coach', 'scout', 'parent'];
  const ids = roles.map((r) => completionNarrationFor(r).narrationId);
  assert.equal(new Set(ids).size, roles.length, 'two roles share a closing line');
  for (const role of roles) {
    assert.ok(completionNarrationFor(role)?.script, `${role} has no closing script`);
  }
});

test('an unknown or missing role falls back to the player line', () => {
  // userData.role defaults to 'player' throughout the app; this must not return
  // undefined and leave the last screen of onboarding silent.
  const expected = ONBOARDING_NARRATION.completePlayer.narrationId;
  assert.equal(completionNarrationFor(undefined).narrationId, expected);
  assert.equal(completionNarrationFor(null).narrationId, expected);
  assert.equal(completionNarrationFor('astronaut').narrationId, expected);
});

// ------------------------------------------------------------ the wiring

test('every onboarding screen that should narrate does', () => {
  // The hook is what makes any of this audible. A screen that silently loses its
  // call just stops talking, which is indistinguishable from working.
  const screens = [
    'src/screens/onboarding/RoleSelectionScreen.js',
    'src/screens/onboarding/SkillAssessmentScreen.js',
    'src/screens/onboarding/GoalSettingScreen.js',
    'src/screens/onboarding/PersonalizationScreen.js',
    'src/screens/onboarding/FeaturesIntroScreen.js',
    'src/screens/onboarding/WelcomeCompleteScreen.js',
    'src/screens/main/ArchetypeSelectScreen.js',
  ];
  for (const path of screens) {
    const source = read(path);
    assert.ok(source.includes('useScreenNarration('), `${path} has no narration hook`);
    assert.ok(source.includes('NarrationToggle'), `${path} narrates with no way to mute it`);
  }
});

// ------------------------------------------------------- the invited variant

test('an athlete arriving on a coach link gets their own welcome', () => {
  // They skip role selection, so the welcome that lives there never plays. The
  // skill quiz is the first screen they see and has to greet them.
  const invited = ONBOARDING_NARRATION.skillInvited;
  assert.ok(invited?.script, 'no invited variant of the skill line');
  assert.notEqual(
    invited.narrationId,
    ONBOARDING_NARRATION.skill.narrationId,
    'the two skill lines must be separate assets',
  );
  assert.match(invited.script, /welcome/i, 'the invited line has to actually say hello');
});

test('the invited line never names the coach', () => {
  // Narration is pre-generated per narrationId at build time, so a name in the
  // script would be baked into one audio file and spoken to every athlete on
  // every team. The on-screen banner carries the name.
  const script = ONBOARDING_NARRATION.skillInvited.script;
  assert.equal(/\bcoach [A-Z]/.test(script), false, 'the script appears to name a specific coach');
  assert.equal(script.includes('${'), false, 'the script is interpolated — it cannot be pre-generated');
});

test('the invited line does not promise the roster', () => {
  // A high-school athlete's link sits pending a guardian. "You are on their
  // roster" would be a small lie told in the first ten seconds.
  const script = ONBOARDING_NARRATION.skillInvited.script.toLowerCase();
  assert.equal(script.includes('on their roster'), false);
  assert.equal(script.includes("you're connected"), false);
});

test('the skill screen picks the line from the invite, not at random', () => {
  const screen = read('src/screens/onboarding/SkillAssessmentScreen.js');
  assert.match(
    screen,
    /invitedBy \? ONBOARDING_NARRATION\.skillInvited : ONBOARDING_NARRATION\.skill/,
    'the skill screen does not switch narration on the invite',
  );
});
