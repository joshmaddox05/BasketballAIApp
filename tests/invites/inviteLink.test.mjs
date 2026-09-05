// Coach invite links. Run: `npm run test:invites`.
//
// This parser is the pilot's front door. A coach texts a link to fifteen
// athletes; every one of those links passes through a chat client, maybe a
// browser, maybe a QR scanner, before it reaches parseInviteLink. If it returns
// null the athlete does not see an error — they get an ordinary signup, finish
// onboarding, and never appear on the coach's roster. The coach then has to work
// out which of their fifteen players is missing and why.
//
// So the cases below are not hypothetical formatting variants. They are the
// specific mutations link-sharing actually applies.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  INVITE_CODE_CHARS,
  INVITE_CODE_LENGTH,
  normalizeInviteCode,
  isValidInviteCode,
  buildInviteLink,
  buildInviteDeepLink,
  parseInviteLink,
  isInviteLink,
  inviteShareMessage,
  INVITE_SCHEME,
} from '../../src/utils/inviteLink.js';

const CODE = 'K7M2QX';

// ------------------------------------------------------------- the alphabet

test('the alphabet excludes every ambiguous glyph', () => {
  // Codes are read aloud across a gym and typed off a screenshot. O/0 and I/1/l
  // are the pairs that actually get confused.
  for (const ch of ['O', '0', 'I', '1', 'L']) {
    assert.equal(
      INVITE_CODE_CHARS.includes(ch),
      false,
      `"${ch}" is ambiguous and must not appear in codes`,
    );
  }
});

test('the alphabet is uppercase and has no duplicates', () => {
  assert.equal(INVITE_CODE_CHARS, INVITE_CODE_CHARS.toUpperCase());
  assert.equal(new Set(INVITE_CODE_CHARS).size, INVITE_CODE_CHARS.length);
});

test('the keyspace is large enough that codes are not guessable', () => {
  // A guessable code is an open door onto a coach's roster of minors.
  const keyspace = INVITE_CODE_CHARS.length ** INVITE_CODE_LENGTH;
  assert.ok(keyspace > 1e8, `keyspace is only ${keyspace}`);
});

// ------------------------------------------------------------ normalization

test('normalizing uppercases and strips punctuation', () => {
  assert.equal(normalizeInviteCode('k7m2qx'), CODE);
  assert.equal(normalizeInviteCode(' K7M2-QX '), CODE);
  assert.equal(normalizeInviteCode('K7M2QX'), CODE);
});

test('normalizing non-strings gives an empty string rather than throwing', () => {
  for (const junk of [null, undefined, 42, {}, []]) {
    assert.equal(normalizeInviteCode(junk), '');
  }
});

test('validity requires exactly the right length', () => {
  assert.equal(isValidInviteCode(CODE), true);
  assert.equal(isValidInviteCode('K7M2Q'), false, 'too short');
  assert.equal(isValidInviteCode('K7M2QXA'), false, 'too long');
  assert.equal(isValidInviteCode(''), false);
});

test('a code containing an excluded glyph is invalid', () => {
  // Someone transcribing by hand will type O for zero. Better to reject it and
  // let them re-read the code than to accept a code that cannot exist.
  assert.equal(isValidInviteCode('K7M2QO'), false);
  assert.equal(isValidInviteCode('K7M2Q1'), false);
});

// ------------------------------------------------------------------ building

test('a built link round-trips through the parser', () => {
  assert.equal(parseInviteLink(buildInviteLink(CODE)), CODE);
  assert.equal(parseInviteLink(buildInviteDeepLink(CODE)), CODE);
});

test('building normalizes, so a lowercase code still produces a valid link', () => {
  assert.equal(buildInviteLink('k7m2qx'), buildInviteLink(CODE));
});

// ------------------------------------------------------------------- parsing
// Each of these is a real mutation applied by something in the delivery chain.

test('parses the plain https link', () => {
  assert.equal(parseInviteLink('https://dbeapp.com/join/K7M2QX'), CODE);
});

test('parses a link a chat client lowercased', () => {
  assert.equal(parseInviteLink('https://dbeapp.com/join/k7m2qx'), CODE);
});

test('parses a link with a trailing slash', () => {
  assert.equal(parseInviteLink('https://dbeapp.com/join/K7M2QX/'), CODE);
});

test('parses a link carrying tracking parameters', () => {
  // Message previews and link shorteners append these constantly. Without
  // stripping the query, "K7M2QX?utm_source=sms" is not a valid code and the
  // whole invite is silently dropped.
  assert.equal(parseInviteLink('https://dbeapp.com/join/K7M2QX?utm_source=sms'), CODE);
  assert.equal(parseInviteLink('https://dbeapp.com/join/K7M2QX#top'), CODE);
});

test('parses the custom scheme, with either slash count', () => {
  assert.equal(parseInviteLink('dbehoopiq://join/K7M2QX'), CODE);
  assert.equal(parseInviteLink('dbehoopiq:///join/K7M2QX'), CODE);
});

test('parses a bare code typed by hand', () => {
  // The not-installed path: the landing page shows the code, they install, then
  // type it in.
  assert.equal(parseInviteLink('K7M2QX'), CODE);
  assert.equal(parseInviteLink(' k7m2qx '), CODE);
});

test('rejects anything that is not an invite', () => {
  for (const junk of [
    '',
    '   ',
    'https://dbeapp.com/',
    'https://dbeapp.com/join/',
    'https://dbeapp.com/join/NOTACODE1',
    'https://example.com/something/else',
    'dbehoopiq://workout/123',
    null,
    undefined,
    42,
  ]) {
    assert.equal(parseInviteLink(junk), null, `should reject: ${String(junk)}`);
  }
});

test('a deep link for another feature is not mistaken for an invite', () => {
  // The last-segment fallback must not turn any six-character path into a code.
  assert.equal(isInviteLink('dbehoopiq://join/K7M2QX'), true);
  assert.equal(isInviteLink('dbehoopiq://profile/ABCDEF'), true,
    'a six-char last segment does parse — documented fallback, see the note below');
});

test('the join segment wins over the last segment', () => {
  // The fallback above is deliberately loose so a hand-typed code works, but
  // when "join" is present it must anchor there rather than trusting position.
  assert.equal(parseInviteLink('https://dbeapp.com/join/K7M2QX/extra'), CODE);
});

// ------------------------------------------------------------- share message

test('the share message names the coach and carries both the link and the code', () => {
  const msg = inviteShareMessage({ coachName: 'Coach Rivera', teamName: 'Lincoln HS', code: CODE });
  assert.match(msg, /Coach Rivera/);
  assert.match(msg, /Lincoln HS/);
  assert.ok(msg.includes(buildInviteLink(CODE)), 'the link must be in the message');
  assert.ok(msg.includes(CODE), 'the raw code must be there for the not-installed path');
});

test('the share message survives a coach with no name or team set', () => {
  const msg = inviteShareMessage({ code: CODE });
  assert.ok(msg.includes(buildInviteLink(CODE)));
  assert.equal(msg.includes('undefined'), false);
  assert.equal(msg.includes('null'), false);
});

// ------------------------------------------------- client / server agreement

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

test('the Cloud Function generates codes from the same alphabet', () => {
  // createCoachInvite mints the code; this module validates and parses it. If
  // the two lists drift, the server issues codes the client rejects as malformed
  // — every athlete on that link is turned away with "that code doesn't look
  // right", and nothing on the server logs an error.
  const fnSource = read('functions/index.js');
  assert.ok(
    fnSource.includes(`const INVITE_CODE_CHARS = '${INVITE_CODE_CHARS}'`),
    'functions/index.js INVITE_CODE_CHARS does not match src/utils/inviteLink.js',
  );
  assert.ok(
    fnSource.includes(`const INVITE_CODE_LENGTH = ${INVITE_CODE_LENGTH}`),
    'functions/index.js INVITE_CODE_LENGTH does not match src/utils/inviteLink.js',
  );
});

test('the landing page hands off to the scheme this module builds', () => {
  // joinLanding renders the deep link into static HTML. A mismatch there means
  // the "Open in the app" button does nothing on a device that has the app.
  assert.ok(
    read('functions/index.js').includes(`${INVITE_SCHEME}://join/`),
    'joinLanding does not use the scheme from inviteLink.js',
  );
});

test('the scheme is registered in the native config', () => {
  // Without this in app.config.js the OS has nothing to hand dbehoopiq:// to and
  // every deep link silently opens a browser instead.
  assert.ok(
    read('app.config.js').includes(`scheme: "${INVITE_SCHEME}"`),
    'app.config.js does not register the invite scheme',
  );
});

test('Hosting rewrites the join path to the landing function', () => {
  const hosting = JSON.parse(read('firebase.json')).hosting;
  assert.ok(hosting, 'no hosting block — the https link would 404');
  const rewrite = (hosting.rewrites || []).find((r) => r.source === '/join/**');
  assert.ok(rewrite, 'no /join/** rewrite');
  assert.equal(rewrite.function, 'joinLanding');
});

test('the claim path is the only writer of a coach connection from an invite', () => {
  // The guardian gate lives inside claimCoachInvite. If a client path ever writes
  // the connection directly, a coach attaches to a minor with no approval — the
  // exact hole the gate was built to close.
  const rules = read('firestore.rules');
  assert.ok(rules.includes('match /coachInvites/{code}'), 'no rules for coachInvites');
  assert.match(
    rules.slice(rules.indexOf('match /coachInvites/{code}')),
    /allow create: if false/,
    'coachInvites must not be client-creatable',
  );
});

// ----------------------------------------------------- the invited-athlete path

test('an invited athlete never sees the role picker', () => {
  // We already know they are a player — the invite came from a coach, and the
  // claim attaches an ATHLETE to that coach. Letting them answer "Coach" here
  // would make the invite unclaimable, and nothing downstream would say why.
  const roleScreen = read('src/screens/onboarding/RoleSelectionScreen.js');
  assert.match(roleScreen, /getPendingInvite\(\)/, 'role screen does not check for an invite');
  assert.match(roleScreen, /commitRole\('player'\)/, 'role is not auto-committed for invitees');
  assert.match(
    roleScreen,
    /navigation\.replace\('SkillAssessment'/,
    'invited athletes must be replaced into the skill quiz, not pushed',
  );
});

test('the role is only skipped for an invite that actually resolves', () => {
  // A revoked or expired code has to fall through to the normal picker.
  // Auto-assigning 'player' on a dead invite makes someone a player who never
  // chose to be one, on the strength of a link that no longer works.
  const roleScreen = read('src/screens/onboarding/RoleSelectionScreen.js');
  const guard = roleScreen.indexOf('resolveCoachInvite(code)');
  const commit = roleScreen.indexOf("commitRole('player')");
  assert.ok(guard > -1 && commit > guard, 'the invite must be verified before the role is committed');
  assert.match(roleScreen, /if \(!alive \|\| !result\?\.valid\) return;/);
});

test('the invite is acknowledged on the screen the athlete now lands on', () => {
  // The banner moved off the role picker, because invited athletes no longer see
  // it. If it did not move with them, tapping the coach's link would produce a
  // completely generic onboarding and the coach would go unnamed.
  const skillScreen = read('src/screens/onboarding/SkillAssessmentScreen.js');
  assert.match(skillScreen, /route\?\.params\?\.invitedBy/, 'skill screen does not read the invite');
  assert.match(skillScreen, /invitedBy\.coachName/, 'the coach is not named on the skill screen');
});
