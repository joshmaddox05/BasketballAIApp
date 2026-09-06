// inviteLink.js — the coach→athlete invite link, as a value.
//
// The pilot runs coach-first: we hand the app to a coach, they invite their team,
// the team signs up already attached to them. That inverts the original flow,
// where the athlete generated a code and the coach typed it — which cannot work
// when the athlete does not have the app yet.
//
// Everything here is pure, because the parsing is the part that silently breaks.
// A link arrives from a text message, a group chat, a QR scan or a browser
// bounce, and by the time it reaches the app it may have been lowercased,
// wrapped in tracking parameters, had a trailing slash added, or come through the
// custom scheme instead of https. A parser that only handles the shape we
// generate would fail on most of those and simply drop the athlete into a normal
// signup with no coach attached — no error, no clue, just an empty roster the
// coach has to chase.

// Ambiguous glyphs are omitted: no O/0, no I/1/l. Codes get read aloud across a
// gym and typed from a screenshot, so O-versus-zero is a real failure.
export const INVITE_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 6;

/** The https link a coach shares. Also what the landing page is served at. */
export const INVITE_WEB_BASE = 'https://dbeapp.com/join';

/** The custom scheme the landing page hands off to when the app is installed. */
export const INVITE_SCHEME = 'dbehoopiq';

const CODE_RE = new RegExp(`^[${INVITE_CODE_CHARS}]{${INVITE_CODE_LENGTH}}$`);

/**
 * Uppercase and strip FORMATTING only — whitespace and the hyphens people add
 * when writing a code down. Deliberately not a filter.
 *
 * An earlier version stripped every character outside the alphabet, which meant
 * garbage was silently repaired into something valid: "NOTACODE1" lost its two
 * O's and its 1 and became "NTACDE" — a well-formed six-character code that
 * would then be looked up, and could belong to a completely different coach.
 * A mistyped code has to fail, not resolve to someone else's team.
 */
export const normalizeInviteCode = (raw) =>
  typeof raw === 'string' ? raw.toUpperCase().replace(/[\s-]/g, '') : '';

/** Is this a well-formed code? Cheap client-side check before any network call. */
export const isValidInviteCode = (raw) => CODE_RE.test(normalizeInviteCode(raw));

/** The link a coach sends. */
export const buildInviteLink = (code) => `${INVITE_WEB_BASE}/${normalizeInviteCode(code)}`;

/** The deep link the landing page redirects to when the app is installed. */
export const buildInviteDeepLink = (code) =>
  `${INVITE_SCHEME}://join/${normalizeInviteCode(code)}`;

/**
 * Pull an invite code out of whatever arrived.
 *
 * Handles all of these, because all of them happen:
 *   https://dbeapp.com/join/K7M2QX
 *   https://dbeapp.com/join/k7m2qx/          (lowercased by a chat client)
 *   https://dbeapp.com/join/K7M2QX?utm_source=sms
 *   dbehoopiq://join/K7M2QX
 *   dbehoopiq:///join/K7M2QX                 (some Android intents add the slash)
 *   K7M2QX                                   (typed by hand after installing)
 *
 * @returns {string|null} a valid code, or null
 */
export const parseInviteLink = (input) => {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // A bare code, typed in. Checked first so a hand-typed code never falls
  // through the URL branches below.
  if (isValidInviteCode(trimmed) && !trimmed.includes('/')) {
    return normalizeInviteCode(trimmed);
  }

  // Drop the query and fragment before looking at the path — a code is never in
  // either, and utm parameters would otherwise land in the segment list.
  const withoutQuery = trimmed.split('?')[0].split('#')[0];
  const segments = withoutQuery.split('/').filter(Boolean);

  // The segment AFTER "join" is the code. Scanning for "join" rather than taking
  // the last segment means a trailing slash, an extra path prefix, or the
  // scheme's variable number of leading slashes all resolve the same way.
  const joinAt = segments.findIndex((seg) => seg.toLowerCase() === 'join');
  const candidate = joinAt >= 0 ? segments[joinAt + 1] : segments[segments.length - 1];

  return isValidInviteCode(candidate) ? normalizeInviteCode(candidate) : null;
};

/** Does this URL look like an invite at all? Used to ignore unrelated deep links. */
export const isInviteLink = (input) => parseInviteLink(input) !== null;

/**
 * The message a coach sends. Written to be forwarded into a group chat, so it
 * names the coach and the team — a bare link in a team thread is indistinguishable
 * from spam, and nobody taps it.
 */
export const inviteShareMessage = ({ coachName, teamName, code }) => {
  const who = coachName || 'Your coach';
  const team = teamName ? ` for ${teamName}` : '';
  return (
    `${who} invited you to DBE HoopIQ${team}.\n\n` +
    `${buildInviteLink(code)}\n\n` +
    `Tap the link to set up your account — you'll be connected automatically. ` +
    `If you already installed the app, use code ${normalizeInviteCode(code)}.`
  );
};
