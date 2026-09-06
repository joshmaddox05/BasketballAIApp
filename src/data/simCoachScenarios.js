// simCoachScenarios.js - Static SimCoach scenario catalog.
//
// Single source of truth for the tactical scenarios a coach can assign to an
// athlete and that the athlete studies in SimCoachScenarioScreen. Keyed by id so
// an assignment's `refId` resolves directly to a playable scenario.
//
// ─── What a scenario has to be ───────────────────────────────────────────────
// Every scenario here tests a DECISION, not recall. That imposes three rules the
// catalog is checked against in tests/content/simCoachScenarios.test.mjs:
//
//   1. The premise and the correct answer must agree. The original 'pnr-defense'
//      scenario described drop coverage and then marked "contest the mid-range
//      aggressively" correct — an answer that contradicts the coverage it had just
//      set up. A scenario that argues with itself teaches the wrong read.
//   2. Every wrong option must be a decision a real player would actually make.
//      Filler options ("call timeout", "foul immediately") make the question a
//      reading-comprehension test rather than a basketball one.
//   3. Where the right answer depends on scheme or personnel, the scenario states
//      the assumption in `assumptions` instead of pretending basketball has
//      universal answers. Several of these have a genuinely different answer under
//      a switch-everything scheme, and say so.
//
// `optionNotes` carries the per-option rationale (why the right one is right AND
// why each wrong one is tempting), which is the part that actually teaches.
import {
  SPOTS,
  off,
  def,
  ballAt,
  ballWith,
  arrow,
  nudge,
  toward,
} from '../services/gamePlan/courtLayout.js';

// Re-exported so scenario authors and the tests share one import.
export { SPOTS, arrow, nudge, toward };

// ─── Authoring helpers ───────────────────────────────────────────────────────

/**
 * Build one play step.
 *
 * @param {string} text  what happens on this beat
 * @param {Object} spec
 *   o       {[label]: spot}  offensive players on the floor
 *   d       {[label]: spot|number|null}  defenders. A spot places one explicitly;
 *           a number is the fraction of the way from his man toward the rim
 *           (0.22 by default — normal help-side depth); null omits the defender
 *           entirely, which is how advantage situations like 3-on-2 are drawn.
 *   ball    an offensive label (ball in his hands) or a spot (loose / in flight)
 *   arrows  movement paths, built with arrow()
 */
const step = (text, { o, d = {}, ball = null, arrows = [] }) => {
  const tokens = Object.entries(o).map(([label, spot]) => off(label, spot));

  Object.entries(o).forEach(([label, spot]) => {
    const spec = Object.prototype.hasOwnProperty.call(d, label) ? d[label] : undefined;
    if (spec === null) return; // deliberately unguarded
    const at =
      spec === undefined
        ? toward(spot, SPOTS.rim, 0.22)
        : typeof spec === 'number'
          ? toward(spot, SPOTS.rim, spec)
          : spec;
    tokens.push(def(label, at));
  });

  if (ball != null) {
    tokens.push(
      typeof ball === 'object' ? ballAt(ball) : ballWith(o[ball])
    );
  }

  return { text, tokens, arrows };
};

export const SCENARIO_CATEGORIES = { OFFENSE: 'Offense', DEFENSE: 'Defense' };

export const SCENARIO_DIFFICULTIES = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  ELITE: 'Elite',
};

const { OFFENSE, DEFENSE } = SCENARIO_CATEGORIES;
const { BEGINNER, INTERMEDIATE, ADVANCED, ELITE } = SCENARIO_DIFFICULTIES;

// Grouped by teaching theme so the catalog stays navigable as it grows; merged into
// SIM_COACH_SCENARIOS at the bottom of the file.
const PICK_AND_ROLL = {
  // ─── Pick-and-roll: defense ────────────────────────────────────────────────

  // REWRITTEN. The original version of this scenario set up drop coverage and then
  // marked "contest the mid-range aggressively" as the correct read — which is the
  // opposite of what drop is. It also asked a defensive question while describing
  // the ball handler's options, so there was no way to answer it as the defender.
  // The id is preserved because assignments in Firestore reference it.
  'pnr-defense': {
    id: 'pnr-defense',
    title: 'Drop Coverage: Your Job on the Ball',
    category: DEFENSE,
    subcategory: 'Ball-screen coverage',
    difficulty: INTERMEDIATE,
    position: 'Guard',
    concepts: ['drop coverage', 'over the top', 'ball-screen defense', 'divided responsibility'],
    coachingCue: 'Chase to his back hip. The big has the rim — you have the pull-up.',
    assumptions:
      'Assumes a drop scheme. A team that switches 1–5 or blitzes ball screens gives a different answer.',
    playSteps: [
      step('1 brings it to the top. 5 climbs from the right elbow to screen 1\'s right shoulder.', {
        o: { 1: SPOTS.top, 5: SPOTS.rightElbow, 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: 0.16, 5: 0.2 },
        ball: 1,
        arrows: [arrow('o5', SPOTS.rightElbow, nudge(SPOTS.top, 0.08, -0.03))],
      }),
      step('X5 sinks into a drop at the level of the free-throw line. You (X1) chase over the top.', {
        o: { 1: SPOTS.rightSlot, 5: nudge(SPOTS.top, 0.08, -0.03), 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.rightSlot, 0.04, 0.09), 5: SPOTS.nail },
        ball: 1,
        arrows: [
          arrow('o1', SPOTS.top, SPOTS.rightSlot),
          arrow('d5', nudge(SPOTS.top, 0.08, -0.03), SPOTS.nail),
        ],
      }),
      step('1 turns the corner downhill. 5 rolls to the rim behind X5. X2 is the low man in the weak-side corner.', {
        o: { 1: nudge(SPOTS.rightElbow, 0.02, 0.06), 5: SPOTS.rightBlock, 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.rightSlot, 0.02, 0.04), 5: SPOTS.nail, 2: 0.3 },
        ball: 1,
        arrows: [
          arrow('o5', nudge(SPOTS.top, 0.08, -0.03), SPOTS.rightBlock, nudge(SPOTS.rim, 0.04, 0)),
          arrow('o1', SPOTS.rightSlot, nudge(SPOTS.rightElbow, 0.02, 0.06)),
        ],
      }),
    ],
    question:
      'You went over the top of the screen and the ball handler has turned the corner. Your big is in drop between the ball and the rim, and the roller is diving behind him. What is YOUR responsibility?',
    options: [
      { label: 'A', text: 'Peel off the ball and pick up the roller — your big already has the ball handler.' },
      { label: 'B', text: 'Chase over the top to the ball handler\'s back hip and take away the pull-up.' },
      { label: 'C', text: 'Cut back underneath the screen to beat him to the driving lane.' },
      { label: 'D', text: 'Sprint into the paint to help on the roller before the lob.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'That is a switch, not drop. Trading assignments mid-action leaves your big chasing a guard on the perimeter and puts a guard on a rolling big — the two matchups drop is built to avoid.',
      'Correct. Drop divides the labor: the big owns the rim and the roller until help arrives, and the on-ball defender owns the ball handler. Getting to his back hip squeezes him between a trailing defender and a retreating big, which is what turns the shot drop concedes into a contested one.',
      'The screen has already been used — there is nothing left to go under. Recovering underneath puts you a full step behind and hands him exactly the clean pull-up your recovery is supposed to take away.',
      'Wrong helper. The roller is the low man\'s tag, not yours. Leaving the ball to help on a man who does not have it gives the offense an uncontested shot and no one guarding the basketball.',
    ],
    explanation:
      'Drop is a division of labor, not a passive coverage. The big holds the rim and delays the roller; the on-ball defender has to recover to the ball handler\'s back hip. The shot drop is willing to concede is a CONTESTED pull-up or floater — if the on-ball defender never recovers, the coverage stops conceding a hard shot and starts conceding an open one, which is when drop gets blamed for something that was actually a recovery failure.',
  },

  // ─── Pick-and-roll: offense ────────────────────────────────────────────────

  'pnr-vs-drop': {
    id: 'pnr-vs-drop',
    title: 'Attacking a Deep Drop',
    category: OFFENSE,
    subcategory: 'Ball-screen reads',
    difficulty: INTERMEDIATE,
    position: 'Guard',
    concepts: ['drop coverage', 'pull-up', 'pocket pass', 'reading the big'],
    coachingCue: 'Whatever the big gives you, take — but take it before he climbs.',
    assumptions:
      'Assumes you are a capable pull-up shooter from that range. If you are not, the coverage is correct to give it, and the counter becomes a rescreen or a deeper seal for the roller.',
    playSteps: [
      step('You come off 5\'s screen at the top. X5 is parked deep, at the front of the rim.', {
        o: { 1: SPOTS.top, 5: nudge(SPOTS.top, 0.08, -0.03), 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.top, 0.09, 0.06), 5: nudge(SPOTS.rim, 0, 0.06) },
        ball: 1,
        arrows: [arrow('o1', SPOTS.top, SPOTS.rightSlot, nudge(SPOTS.rightElbow, 0.02, 0.08))],
      }),
      step('X1 is trailing over the screen. There is open floor between the screen and the drop big.', {
        o: { 1: nudge(SPOTS.rightElbow, 0.03, 0.09), 5: SPOTS.rightBlock, 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.rightSlot, 0.03, 0.07), 5: nudge(SPOTS.rim, 0, 0.06), 2: 0.3 },
        ball: 1,
        arrows: [arrow('o5', nudge(SPOTS.top, 0.08, -0.03), SPOTS.rightBlock)],
      }),
    ],
    question:
      'The big is in a deep drop at the front of the rim and your defender is trailing you over the screen. What shot is this coverage giving you?',
    options: [
      { label: 'A', text: 'Drive all the way to the rim and finish over the big.' },
      { label: 'B', text: 'Rise into the pull-up in the space between the screen and the drop big.' },
      { label: 'C', text: 'Throw the pocket pass to the roller immediately off the screen.' },
      { label: 'D', text: 'Swing it to the weak-side corner and reverse the ball.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'This is the shot the coverage wants. A deep drop means the rim protector is already set and squared, and your own defender is arriving from behind — you would be finishing between two defenders with no angle.',
      'Correct. A deep drop concedes everything between the screen and the paint. That pull-up is the price the defense agreed to pay to keep you out of the rim, and taking it early — before the big can climb up to the level — is what makes the coverage a losing trade for them.',
      'There is no pocket to throw into. The pocket pass opens up when the big COMMITS up to the ball and leaves space behind him; a big who never left the rim has not given you that window.',
      'Safe, but it spends the advantage. The screen just created a numbers problem for the defense; reversing the ball lets all five defenders reset and you start the possession over with less clock.',
    ],
    explanation:
      'Every ball-screen coverage concedes something. Deep drop concedes the pull-up to protect the rim, so the read is not "what do I want" but "what did they just agree to give me". Punishing it also changes the next possession: once you make two of these, the big has to climb to the level of the screen, and THAT is when the pocket pass and the roll become available.',
  },

  'pnr-vs-blitz': {
    id: 'pnr-vs-blitz',
    title: 'Getting Out of a Blitz',
    category: OFFENSE,
    subcategory: 'Ball-screen reads',
    difficulty: ADVANCED,
    position: 'Guard',
    concepts: ['blitz', 'short roll', '4-on-3', 'playing out of a trap'],
    coachingCue: 'Two on the ball means four on three behind it. Find the short man.',
    playSteps: [
      step('5 screens at the top. X1 and X5 both jump out to trap you above the arc.', {
        o: { 1: SPOTS.top, 5: nudge(SPOTS.top, 0.08, -0.03), 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.top, -0.06, 0.05), 5: nudge(SPOTS.top, 0.09, 0.04) },
        ball: 1,
        arrows: [arrow('d5', nudge(SPOTS.top, 0.08, -0.03), nudge(SPOTS.top, 0.09, 0.04))],
      }),
      step('5 slips out of the trap into the middle of the floor at the free-throw line. Three defenders now cover four offensive players behind the ball.', {
        o: { 1: SPOTS.top, 5: SPOTS.nail, 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.top, -0.06, 0.05), 5: nudge(SPOTS.top, 0.09, 0.04), 2: 0.35, 4: 0.3 },
        ball: 1,
        arrows: [
          arrow('o5', nudge(SPOTS.top, 0.08, -0.03), SPOTS.nail),
          arrow('ball', nudge(SPOTS.top, 0.05, 0.06), nudge(SPOTS.nail, 0.03, 0.04)),
        ],
      }),
    ],
    question:
      'Two defenders have you trapped above the arc and your screener has slipped to the free-throw line. What creates the best advantage?',
    options: [
      { label: 'A', text: 'Split the trap with a dribble and attack downhill yourself.' },
      { label: 'B', text: 'Hit the short roll at the free-throw line and let him play 4-on-3.' },
      { label: 'C', text: 'Skip the ball across to the weak-side corner shooter.' },
      { label: 'D', text: 'Retreat dribble out of the trap and reset the offense.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'Tempting, and sometimes there. But splitting is a low-percentage play against two set defenders, and even a successful split only gets you back to the same 4-on-3 you could have created with one safe pass — after burning three seconds and risking the ball.',
      'Correct. The blitz has committed two defenders to the ball, which leaves three defending four. The short roll is the shortest and safest pass out of the trap, and it puts the ball in the middle of the floor where the roller can see both corners and the rim at once.',
      'The most-intercepted pass in basketball. A cross-court skip over two trapping defenders travels far enough for the weak side to rotate and read it, and the trap is designed to bait exactly this throw.',
      'This is what the defense is hoping for. A blitz is a gamble that costs them a 4-on-3 if you punish it; retreating hands the numbers back, resets the clock against you, and tells them the blitz works.',
    ],
    explanation:
      'A trap is not primarily a threat to the ball handler — it is a numbers concession everywhere else. The instinct is to solve the trap ("how do I escape?"); the correct frame is to exploit it ("who is now free?"). The short roll is the standard answer because it is the closest outlet and the best vantage point, turning the screener into a playmaker in the middle of a 4-on-3.',
  },

  'pnr-vs-switch': {
    id: 'pnr-vs-switch',
    title: 'Punishing a Switch',
    category: OFFENSE,
    subcategory: 'Ball-screen reads',
    difficulty: INTERMEDIATE,
    position: 'Guard',
    concepts: ['switch', 'mismatch', 'attacking early', 'advantage decay'],
    coachingCue: 'A switch is an advantage with an expiration date.',
    assumptions: 'Assumes 12 on the shot clock and a defense that helps rather than pre-switching rotations.',
    playSteps: [
      step('You use 5\'s screen at the top and the defense calls the switch.', {
        o: { 1: SPOTS.top, 5: nudge(SPOTS.top, 0.08, -0.03), 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.top, -0.02, 0.06), 5: nudge(SPOTS.top, 0.1, 0.02) },
        ball: 1,
        arrows: [arrow('d5', nudge(SPOTS.top, 0.1, 0.02), nudge(SPOTS.rightSlot, 0.02, 0.06))],
      }),
      step('X5 — a big — is now on you 25 feet out. Your 5 popped to the top with a guard on him.', {
        o: { 1: SPOTS.rightSlot, 5: SPOTS.top, 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.rightSlot, 0.02, 0.07), 5: nudge(SPOTS.top, 0, 0.07) },
        ball: 1,
        arrows: [arrow('o1', SPOTS.rightSlot, nudge(SPOTS.rightElbow, 0.02, 0.05), nudge(SPOTS.rim, 0.05, 0.02))],
      }),
    ],
    question:
      'The defense switched and a big is now guarding you 25 feet from the basket, with 12 seconds on the shot clock. What is the best first look?',
    options: [
      { label: 'A', text: 'Attack immediately, before the defense can set its help.' },
      { label: 'B', text: 'Wave everyone through and isolate with about 5 seconds left.' },
      { label: 'C', text: 'Pass to your 5 at the top and let him attack the smaller defender.' },
      { label: 'D', text: 'Rescreen with 5 to force the defense back out of the switch.' },
    ],
    correctIndex: 0,
    optionNotes: [
      'Correct. A switch is only an advantage while the defense is still resolving it. Attacking in the first two or three seconds forces the help defenders to commit before they are organised, which is what turns a mismatch into a paint touch instead of a contested step-back.',
      'The most common way players waste a mismatch. By 5 seconds the help side has loaded up, everyone knows where the ball is going, and a miss leaves no time for an offensive rebound or a second action.',
      'Real, but slow and in the wrong place. Your 5 popped to the TOP — posting him there means bringing him 20 feet from the rim against a defender who can front and dig. The mismatch that matters is the one already on the ball.',
      'This gives back exactly what you just won. Rescreening asks the defense to un-switch into the matchup you were trying to get away from in the first place.',
    ],
    explanation:
      'Mismatches decay. The moment a switch happens, the offense holds an advantage the defense is actively working to erase — by loading help, by pre-rotating, or by scramming the switch entirely. The decision is therefore about TIMING more than about technique, and "attack it now" beats a better-looking action that arrives four seconds late.',
  },

  'pnr-vs-ice': {
    id: 'pnr-vs-ice',
    title: 'Beating ICE on the Side',
    category: OFFENSE,
    subcategory: 'Ball-screen reads',
    difficulty: ADVANCED,
    position: 'Guard',
    concepts: ['ICE', 'side ball screen', 'short roll', 'vacated middle'],
    coachingCue: 'They sent both defenders to the sideline. Somebody is alone in the middle.',
    playSteps: [
      step('Side ball screen on the right wing. X1 jumps to the top side to force you baseline.', {
        o: { 1: SPOTS.rightWing, 5: nudge(SPOTS.rightWing, -0.04, 0.09), 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.rightWing, -0.05, 0.02), 5: nudge(SPOTS.rightWing, 0.02, 0.07) },
        ball: 1,
        arrows: [arrow('d1', nudge(SPOTS.rightWing, 0.02, 0.05), nudge(SPOTS.rightWing, -0.05, 0.02))],
      }),
      step('X5 is up at the level near the sideline. Both of their defenders are now on the outside of the floor.', {
        o: { 1: nudge(SPOTS.rightWing, 0.03, -0.1), 5: SPOTS.nail, 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.rightWing, -0.03, -0.06), 5: nudge(SPOTS.rightWing, 0.03, 0.0), 3: 0.3 },
        ball: 1,
        arrows: [
          arrow('o5', nudge(SPOTS.rightWing, -0.04, 0.09), SPOTS.rightElbow, SPOTS.nail),
          arrow('o1', SPOTS.rightWing, nudge(SPOTS.rightWing, 0.03, -0.1)),
        ],
      }),
    ],
    question:
      'The defense ICEs the side ball screen — your defender is above you forcing you baseline, and the big is up at the level of the screen. What is the read?',
    options: [
      { label: 'A', text: 'Drive baseline all the way to the corner and try to score over the big.' },
      { label: 'B', text: 'Attack the big\'s baseline shoulder, then hit the screener diving into the vacated middle.' },
      { label: 'C', text: 'Reject the screen and drive middle against your defender\'s top-side positioning.' },
      { label: 'D', text: 'Pass back to the top and re-run the same action from the other wing.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'This is the trap ICE is built to create. The sideline and baseline act as two extra defenders, and driving into the corner walks you into a dead pocket with no passing angle back to the middle.',
      'Correct. ICE deliberately sends BOTH defenders to the sideline half of the floor. That is a real cost: the middle is empty. Attacking the big\'s baseline shoulder holds him there, and the screener diving to the nail catches it with the whole middle of the floor and a numbers advantage in front of him.',
      'The one thing ICE is specifically designed to take away. Your defender jumped above the screen precisely so his body is already sitting in the middle-drive lane — rejecting into him is driving into a set defender.',
      'It escapes without punishing. Resetting to the other wing lets the defense ICE again, and now you have burned eight seconds to arrive at the identical problem.',
    ],
    explanation:
      'ICE trades middle-of-the-floor coverage for sideline containment. Reading it means asking what the coverage GAVE UP, not just what it took away: two defenders committed to one side of the court leaves the middle to be attacked by the screener. This is why the screener\'s dive, not the ball handler\'s drive, is usually the payoff against ICE.',
  },

  'pnr-vs-under': {
    id: 'pnr-vs-under',
    title: 'When Your Defender Goes Under',
    category: OFFENSE,
    subcategory: 'Ball-screen reads',
    difficulty: BEGINNER,
    position: 'Guard',
    concepts: ['going under', 'pull-up three', 'punishing a coverage', 'rescreen'],
    coachingCue: 'Under is a dare. Take it once and the dare stops.',
    assumptions: 'Assumes you are a confident and capable shooter from behind the screen. If you are not, the defense is right to go under and C becomes the correct counter.',
    playSteps: [
      step('5 sets the ball screen at the top. X1 goes UNDER — on the basket side of the screen.', {
        o: { 1: SPOTS.top, 5: nudge(SPOTS.top, 0.08, -0.03), 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.top, 0.06, -0.06), 5: SPOTS.nail },
        ball: 1,
        arrows: [arrow('d1', nudge(SPOTS.top, 0, 0.06), nudge(SPOTS.top, 0.06, -0.06))],
      }),
      step('He beats you to the driving lane but leaves the space behind the screen wide open.', {
        o: { 1: nudge(SPOTS.top, 0.06, 0.01), 5: nudge(SPOTS.top, 0.08, -0.03), 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.rightSlot, 0.0, -0.08), 5: SPOTS.nail },
        ball: 1,
        arrows: [],
      }),
    ],
    question:
      'Your defender goes under the screen. What is the immediate read?',
    options: [
      { label: 'A', text: 'Turn the corner and drive — he is out of position behind you.' },
      { label: 'B', text: 'Rise into the pull-up behind the screen before he can recover.' },
      { label: 'C', text: 'Have the screener rescreen higher to force a different coverage.' },
      { label: 'D', text: 'Throw the pocket pass to the roller.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'Backwards. Going under means he took the SHORTER path on the basket side — he is not behind you, he is in front of you, already sitting in the driving lane with a big behind him.',
      'Correct. Going under is an explicit trade: the defense concedes the shot behind the screen to stay attached to the drive. That shot is what the coverage is handing you, and it is available immediately, before any help can rotate.',
      'A genuine counter, and the right one if you cannot make that shot. But used first, it skips the punishment — a defense that never pays for going under will keep going under all night.',
      'There is usually no roll to throw to. Against an under, the screener typically pops or rescreens rather than diving, because the coverage never created the gap behind him that a roll needs.',
    ],
    explanation:
      'A defense that goes under has told you what it thinks of your shot. The right response is to answer that specific claim. This is also the read that unlocks everything else in the action: once you make it, the defender has to start going over, and going over is what creates the downhill drive and the roll.',
  },
};

const HELP_AND_ROTATION = {
  'pnr-tag-the-roller': {
    id: 'pnr-tag-the-roller',
    title: 'Low Man: Tag the Roller',
    category: DEFENSE,
    subcategory: 'Help positioning',
    difficulty: INTERMEDIATE,
    position: 'All',
    concepts: ['low man', 'tag', 'x-out', 'help and recover'],
    coachingCue: 'Touch him, then leave. A tag is a delay, not a rotation.',
    assumptions: 'Assumes a help-and-recover scheme with the big in drop. A switch-everything team removes the tag entirely.',
    playSteps: [
      step('Ball screen at the top going right. You are X2, the low man in the weak-side corner.', {
        o: { 1: SPOTS.rightSlot, 5: SPOTS.rightBlock, 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.rightSlot, 0.02, 0.07), 5: SPOTS.nail, 2: 0.25 },
        ball: 1,
        arrows: [arrow('o5', nudge(SPOTS.top, 0.08, -0.03), SPOTS.rightBlock)],
      }),
      step('Your big has the ball contained at the free-throw line — the rim is not open. The roller dives behind him.', {
        o: { 1: nudge(SPOTS.rightElbow, 0.03, 0.07), 5: nudge(SPOTS.rim, 0.06, 0.03), 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.rightSlot, 0.02, 0.05), 5: SPOTS.nail, 2: nudge(SPOTS.leftDunker, -0.03, 0.02) },
        ball: 1,
        arrows: [
          arrow('d2', toward(SPOTS.leftCorner, SPOTS.rim, 0.25), nudge(SPOTS.leftDunker, -0.03, 0.02)),
          arrow('o5', SPOTS.rightBlock, nudge(SPOTS.rim, 0.06, 0.03)),
        ],
      }),
    ],
    question:
      'You are the weak-side low man. Your big has the ball contained at the free-throw line, and the roller is diving to the rim behind him. Your man is a 40% corner shooter. What do you do?',
    options: [
      { label: 'A', text: 'Stay attached to your shooter — never help off a 40% corner shooter.' },
      { label: 'B', text: 'Step in and tag the roller until your big can recover, then x-out to the open perimeter man.' },
      { label: 'C', text: 'Fully rotate to the rim and take the roller, and let the perimeter sort itself out behind you.' },
      { label: 'D', text: 'Stunt at the ball handler to slow the drive down.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'Refusing to help gives up a lob or a dunk — a shot worth far more per attempt than the corner three you are protecting. Help-side defense exists because some concessions are cheaper than others.',
      'Correct. A tag is a two-step delay, not a rotation: you take away the pocket pass and the lob window long enough for the big to pick the roller up, then get back out. Because you never fully committed, the x-out is short and the closeout is contestable.',
      'Over-rotating. The rim is already protected — your big has the ball contained in front of it. Committing all the way in means you cannot recover, and the offense\'s weak-side lift turns your x-out into a closeout you cannot make in time.',
      'Wrong man. The ball is already contained by the big; the uncovered threat is the roller behind him. Stunting at the ball leaves the most dangerous player on the floor with a free run to the rim.',
    ],
    explanation:
      'The whole skill in help defense is calibrating HOW MUCH to help. The question is not "help or don\'t help" but "how long can I be gone and still get back?" A tag is the smallest possible amount of help that solves the roller — you delay him, you do not guard him. Full rotations are for when the rim is genuinely unprotected, which is not the case here.',
  },

  'blitz-weakside-rotation': {
    id: 'blitz-weakside-rotation',
    title: 'Rotating Behind a Blitz',
    category: DEFENSE,
    subcategory: 'Rotations',
    difficulty: ELITE,
    position: 'All',
    concepts: ['blitz', 'short roll', 'zone up', 'back-line triangle'],
    coachingCue: 'Two on the ball means three of us guard four. Take the man in the middle.',
    playSteps: [
      step('Your team blitzes the ball screen. Two defenders are on the ball above the arc.', {
        o: { 1: SPOTS.top, 5: nudge(SPOTS.top, 0.08, -0.03), 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.top, -0.06, 0.05), 5: nudge(SPOTS.top, 0.09, 0.04), 2: 0.3, 4: 0.25 },
        ball: 1,
      }),
      step('The screener short-rolls to the free-throw line and catches it. You are X2 in the weak-side corner.', {
        o: { 1: SPOTS.top, 5: SPOTS.nail, 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.top, -0.06, 0.05), 5: nudge(SPOTS.top, 0.09, 0.04), 2: 0.25, 4: 0.25 },
        ball: 5,
        arrows: [arrow('o5', nudge(SPOTS.top, 0.08, -0.03), SPOTS.nail)],
      }),
    ],
    question:
      'The blitz worked but the screener caught the ball on the short roll at the free-throw line, facing the rim. You are the weak-side defender nearest the corner. Who do you take?',
    options: [
      { label: 'A', text: 'Step up and meet the short roll at the free-throw line while the deepest defender splits the two shooters behind you.' },
      { label: 'B', text: 'Sprint to the rim to take away the lob to the roller.' },
      { label: 'C', text: 'Stay attached to your corner shooter and let the trapping defenders recover.' },
      { label: 'D', text: 'Run back at the ball handler to help reform the trap.' },
    ],
    correctIndex: 0,
    optionNotes: [
      'Correct. With two defenders committed to the ball, the remaining three have to zone up four players in a triangle: the top of the triangle meets the ball, the back of it splits the two deepest threats. Nobody man-guards anyone until the trappers recover — the priority is the man WITH the ball at the free-throw line, because from there he can pass, shoot, or drive.',
      'You are guarding a threat that no longer exists. The roller is not looking for a lob — he already has the basketball. Sprinting to the rim leaves the decision-maker completely unguarded 15 feet from it.',
      'Recovery from a blitz is slow by design; the trappers are 25 feet from the ball and running the wrong way. Waiting for them means the short roll gets a free look at a 4-on-3 with nobody in front of him.',
      'The trap is dead the moment the ball leaves it. Chasing the ball handler after he has already passed is the most common blitz rotation error — it adds a third defender to a man without the ball.',
    ],
    explanation:
      'A blitz converts man defense into temporary zone defense. Every rotation behind it follows one rule: guard the most dangerous SPACE, not your assignment. The man at the free-throw line with the ball is more dangerous than any shooter behind him, so the nearest weak-side defender takes him and everyone else slides one man over. It only fails when a defender keeps thinking in terms of "my man".',
  },

  'low-man-rotation': {
    id: 'low-man-rotation',
    title: 'Baseline Drive: Who Takes the Rim?',
    category: DEFENSE,
    subcategory: 'Rotations',
    difficulty: INTERMEDIATE,
    position: 'All',
    concepts: ['low man', 'baseline drive', 'x-out', 'rim protection'],
    coachingCue: 'On a baseline drive there is nobody behind you. You ARE the help.',
    assumptions: 'Assumes a standard help-and-rotate scheme where the low man has rim responsibility on baseline penetration.',
    playSteps: [
      step('3 catches on the right wing and drives baseline past X3. You are X2 in the weak-side corner.', {
        o: { 3: SPOTS.rightWing, 2: SPOTS.leftCorner, 1: SPOTS.top, 4: SPOTS.leftWing, 5: SPOTS.rightShortCorner },
        d: { 3: nudge(SPOTS.rightWing, 0.03, 0.02), 2: 0.25, 5: 0.3 },
        ball: 3,
        arrows: [arrow('o3', SPOTS.rightWing, nudge(SPOTS.rightCorner, -0.04, 0.12), nudge(SPOTS.rim, 0.1, 0.0))],
      }),
      step('He is past his man on the baseline with a clear angle to the rim. Nobody is between him and the basket.', {
        o: { 3: nudge(SPOTS.rightBlock, 0.12, -0.04), 2: SPOTS.leftCorner, 1: SPOTS.top, 4: SPOTS.leftWing, 5: SPOTS.rightShortCorner },
        d: { 3: nudge(SPOTS.rightWing, 0.02, -0.05), 2: 0.25, 5: 0.3 },
        ball: 3,
        arrows: [arrow('d2', toward(SPOTS.leftCorner, SPOTS.rim, 0.25), nudge(SPOTS.rim, -0.04, 0.02))],
      }),
    ],
    question:
      'A driver has beaten his man baseline. You are the low man on the weak side. What is your job?',
    options: [
      { label: 'A', text: 'Rotate up to the ball near the free-throw line to cut the drive off early.' },
      { label: 'B', text: 'Rotate to the rim to contest or take the charge, and trust the perimeter to x-out behind you.' },
      { label: 'C', text: 'Stay home on your corner shooter — a corner three is the worst shot to give up.' },
      { label: 'D', text: 'Dig down from behind and try to strip the ball as he gathers.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'You would be arriving above the ball on a drive that is already below you, which is a step behind the play and takes you out of the possession entirely. Baseline drives are attacked from the inside out, not the outside in.',
      'Correct. A baseline drive is the one drive with no second line of defense behind it — everything else on the floor is above the ball. The low man is the last line, so he takes the rim and the rest of the defense rotates one man over behind him.',
      'The most expensive version of doing your job too literally. Conceding a layup to protect a corner three trades a high-percentage shot for a lower one — the arithmetic runs the wrong way.',
      'Reaching from behind on a gathering driver is how you turn two points into three. It also means nobody ever actually got in front of the ball.',
    ],
    explanation:
      'Team defense is a set of agreements about who covers what when the first line breaks. On baseline penetration the agreement is universal enough to be worth memorising: the low man takes the rim, and the defense rotates behind him — the next perimeter defender x-outs to the low man\'s shooter rather than the nearest one, because that is the rotation that can actually be completed in time.',
  },

  'nail-help-and-recover': {
    id: 'nail-help-and-recover',
    title: 'Stunt or Commit?',
    category: DEFENSE,
    subcategory: 'Help positioning',
    difficulty: ADVANCED,
    position: 'All',
    concepts: ['nail help', 'stunt', 'dig', 'help and recover'],
    coachingCue: 'Show him two defenders. Be one of them for half a second.',
    assumptions:
      'Assumes your rim protector is home and able to meet the driver. If the rim is genuinely unprotected, the answer changes to a full commit — help decisions are downstream of who is behind you.',
    playSteps: [
      step('1 drives middle from the top. You are X2, one pass away on the left wing, sitting at the nail.', {
        o: { 1: SPOTS.top, 2: SPOTS.leftWing, 3: SPOTS.rightCorner, 4: SPOTS.leftCorner, 5: SPOTS.rightBlock },
        d: { 1: nudge(SPOTS.top, -0.02, 0.06), 2: SPOTS.nail, 5: 0.35 },
        ball: 1,
        arrows: [arrow('o1', SPOTS.top, nudge(SPOTS.nail, -0.02, 0.06))],
      }),
      step('He is into the paint. Your man — a good shooter — is spotted up one pass away, ready for the kick.', {
        o: { 1: nudge(SPOTS.nail, -0.02, 0.0), 2: SPOTS.leftWing, 3: SPOTS.rightCorner, 4: SPOTS.leftCorner, 5: SPOTS.rightBlock },
        d: { 1: nudge(SPOTS.top, -0.04, 0.02), 2: nudge(SPOTS.nail, -0.08, 0.02), 5: nudge(SPOTS.rim, 0.03, 0.04) },
        ball: 1,
        arrows: [arrow('d2', SPOTS.nail, nudge(SPOTS.nail, -0.08, 0.02), toward(SPOTS.leftWing, SPOTS.rim, 0.15))],
      }),
    ],
    question:
      'A driver is coming middle. You are one pass away at the nail, your rim protector is home, and your man is a good shooter. Do you commit or stunt?',
    options: [
      { label: 'A', text: 'Fully commit to the ball to force the pass out of the paint.' },
      { label: 'B', text: 'Stunt hard with your feet and hands, then recover as soon as he picks up his dribble.' },
      { label: 'C', text: 'Do not help at all — stay attached to a good shooter.' },
      { label: 'D', text: 'Leave early and set up in his path to draw the charge.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'This is the right answer only when the rim is unprotected behind you. Here your big is home, so a full commit spends a defender you did not need to spend and hands a good shooter a wide-open catch with no closeout coming.',
      'Correct. A stunt is a feint: enough to make the driver read a second defender and pick up his dribble, brief enough that you are back before the pass arrives. It buys the containment without paying the kick-out.',
      'A driver who sees no second defender at all gets to play the whole possession at full speed. Refusing to show anything is how a single drive collapses an entire defense.',
      'Leaving early telegraphs it. A driver reads a stationary defender in his path from 15 feet away and simply passes, and if you misjudge the timing you have given up position and a foul.',
    ],
    explanation:
      'Stunt versus commit is the central judgement call in help defense, and it has two inputs: is the rim protected behind me, and how much does my man punish an open catch? With a rim protector home and a shooter to guard, the stunt is the efficient answer — it borrows the deterrent effect of help without paying its cost. Change either input and the right answer changes with it.',
  },

  'closeout-discipline': {
    id: 'closeout-discipline',
    title: 'Closing Out to a Shooter',
    category: DEFENSE,
    subcategory: 'Closeouts',
    difficulty: BEGINNER,
    position: 'All',
    concepts: ['closeout', 'personnel', 'contain', 'shot vs drive'],
    coachingCue: 'The closeout is a scouting report, not a sprint.',
    playSteps: [
      step('You are helping in the gap. The ball is swung to your man in the corner.', {
        o: { 2: SPOTS.rightCorner, 1: SPOTS.rightWing, 3: SPOTS.top, 4: SPOTS.leftWing, 5: SPOTS.leftBlock },
        d: { 2: nudge(SPOTS.rightShortCorner, 0.06, 0.14), 1: 0.15, 5: 0.3 },
        ball: SPOTS.rightWing,
        arrows: [arrow('ball', nudge(SPOTS.rightWing, 0.05, 0.06), nudge(SPOTS.rightCorner, 0.0, 0.06))],
      }),
      step('He catches it behind the arc. He shoots 40% from three but has a slow first step.', {
        o: { 2: SPOTS.rightCorner, 1: SPOTS.rightWing, 3: SPOTS.top, 4: SPOTS.leftWing, 5: SPOTS.leftBlock },
        d: { 2: nudge(SPOTS.rightCorner, -0.02, 0.09), 1: 0.15, 5: 0.3 },
        ball: 2,
        arrows: [arrow('d2', nudge(SPOTS.rightShortCorner, 0.06, 0.14), nudge(SPOTS.rightCorner, -0.02, 0.09))],
      }),
    ],
    question:
      'The ball is swung to your man in the corner. He is a 40% three-point shooter with a slow first step. How do you close out?',
    options: [
      { label: 'A', text: 'Close out high and long to take the shot away, forcing him to put it on the floor toward your help.' },
      { label: 'B', text: 'Close out short and stay low to keep him in front, conceding the catch-and-shoot.' },
      { label: 'C', text: 'Sprint all the way and jump at the shot to guarantee a hard contest.' },
      { label: 'D', text: 'Stay in the gap to protect the paint and contest late from the inside.' },
    ],
    correctIndex: 0,
    optionNotes: [
      'Correct. The closeout is a personnel decision. Against a shooter who cannot beat you off the bounce, the shot is the expensive outcome and the drive is the cheap one — so you take away the expensive one and live with the other, especially with help waiting on the baseline side.',
      'This is the right closeout against a driver who cannot shoot. Applied to a 40% shooter it concedes his best shot on purpose, which is the one thing the closeout was supposed to prevent.',
      'Leaving your feet against a set shooter is how you get a shot fake, three free throws, or a straight-line drive past your momentum. A contest that requires a jump has usually already failed.',
      'This concedes an uncontested three to a 40% shooter — roughly the most efficient shot in basketball. Gap help is for when the ball is live in the paint, not after it has been swung out.',
    ],
    explanation:
      'There is no single correct closeout — there is a correct closeout for a specific opponent. Distance, angle, and hand position are all set by what the man you are guarding actually does well. Teaching the closeout as one fixed technique is what produces defenders who fly at non-shooters and drift at shooters.',
  },
};

const ADVANTAGE_OFFENSE = {
  'attacking-a-closeout': {
    id: 'attacking-a-closeout',
    title: 'Reading the Closeout',
    category: OFFENSE,
    subcategory: 'Closeout attacks',
    difficulty: BEGINNER,
    position: 'All',
    concepts: ['closeout attack', 'borrowing momentum', 'shot fake', 'advantage'],
    coachingCue: 'His speed is your separation. Go where he is already going.',
    playSteps: [
      step('The ball is swung to you on the right wing. Your defender is helping in the gap.', {
        o: { 2: SPOTS.rightWing, 1: SPOTS.top, 3: SPOTS.rightCorner, 4: SPOTS.leftWing, 5: SPOTS.leftBlock },
        d: { 2: nudge(SPOTS.rightElbow, 0.02, 0.03), 1: 0.15, 5: 0.3 },
        ball: SPOTS.top,
        arrows: [arrow('ball', nudge(SPOTS.top, 0.05, 0.06), nudge(SPOTS.rightWing, 0.02, 0.06))],
      }),
      step('He closes out hard and long, arriving past your outside shoulder and still moving.', {
        o: { 2: SPOTS.rightWing, 1: SPOTS.top, 3: SPOTS.rightCorner, 4: SPOTS.leftWing, 5: SPOTS.leftBlock },
        d: { 2: nudge(SPOTS.rightWing, 0.07, 0.02), 1: 0.15, 5: 0.3 },
        ball: 2,
        arrows: [
          arrow('d2', nudge(SPOTS.rightElbow, 0.02, 0.03), nudge(SPOTS.rightWing, 0.07, 0.02)),
          arrow('o2', SPOTS.rightWing, nudge(SPOTS.rightElbow, 0.0, 0.02), nudge(SPOTS.rim, 0.06, 0.02)),
        ],
      }),
    ],
    question:
      'You catch on the wing and the defender closes out hard and long, arriving past your outside shoulder while still moving. What is the read?',
    options: [
      { label: 'A', text: 'Shot fake and drive past his momentum into the space he has given up.' },
      { label: 'B', text: 'Rise and shoot before he gets all the way there.' },
      { label: 'C', text: 'Swing the ball to the next man and cut through.' },
      { label: 'D', text: 'Take a hard dribble backwards to create room for the shot.' },
    ],
    correctIndex: 0,
    optionNotes: [
      'Correct. A long, hard closeout is momentum you can borrow. A defender still moving cannot change direction, so a shot fake freezes him and the drive goes past a man who is running the wrong way — the closeout has effectively created the separation for you.',
      'The one shot this closeout is actually preventing. He is long and arriving with speed, so this is a contested three when an uncontested drive is available two feet away.',
      'Safe, but it passes the advantage rather than using it. The defense created a problem for itself by closing out that hard; swinging it lets them fix the problem for free.',
      'Retreating gives the closeout time to settle and square up, which converts a defender in motion — beatable — into a defender in a stance. You have traded a real advantage for a harder shot.',
    ],
    explanation:
      'Attacking a closeout is a read, not a preference. Hard and long means drive. Short and under control means shoot. Closing out to one shoulder means go the other way. The mistake is having a favourite answer and using it regardless of how the defender arrives — the defender\'s approach IS the information.',
  },

  'drive-and-kick-second-side': {
    id: 'drive-and-kick-second-side',
    title: 'The Extra Pass',
    category: OFFENSE,
    subcategory: 'Advantage basketball',
    difficulty: ADVANCED,
    position: 'All',
    concepts: ['drive and kick', 'second-side action', 'defense in rotation', 'extra pass'],
    coachingCue: 'Beat the rotation, do not race it.',
    playSteps: [
      step('1 drives from the right slot. Two defenders collapse to the paint.', {
        o: { 1: SPOTS.rightSlot, 2: SPOTS.rightWing, 3: SPOTS.leftCorner, 4: SPOTS.leftWing, 5: SPOTS.leftDunker },
        d: { 1: nudge(SPOTS.rightSlot, 0.0, 0.05), 5: nudge(SPOTS.rim, -0.03, 0.05), 2: 0.2, 3: 0.2, 4: 0.2 },
        ball: 1,
        arrows: [arrow('o1', SPOTS.rightSlot, nudge(SPOTS.rightElbow, -0.04, 0.02), nudge(SPOTS.nail, 0.03, -0.06))],
      }),
      step('You kick to 2 on the wing. His man is already closing out, but the two weak-side defenders are still rotating and are one pass behind.', {
        o: { 1: nudge(SPOTS.nail, 0.03, -0.06), 2: SPOTS.rightWing, 3: SPOTS.leftCorner, 4: SPOTS.leftWing, 5: SPOTS.leftDunker },
        d: { 2: nudge(SPOTS.rightWing, 0.02, 0.08), 5: nudge(SPOTS.rim, -0.03, 0.05), 3: 0.35, 4: 0.35, 1: nudge(SPOTS.nail, 0.06, 0.06) },
        ball: 2,
        arrows: [
          arrow('ball', nudge(SPOTS.nail, 0.08, 0.0), nudge(SPOTS.rightWing, 0.02, 0.06)),
          arrow('d2', toward(SPOTS.rightWing, SPOTS.rim, 0.3), nudge(SPOTS.rightWing, 0.02, 0.08)),
        ],
      }),
    ],
    question:
      'You drove, two defenders collapsed, and you kicked to the wing. His closeout is already arriving, but the two weak-side defenders are still rotating and are one pass behind. What is the highest-value next action?',
    options: [
      { label: 'A', text: 'The wing shoots it — it came off a drive, so take it.' },
      { label: 'B', text: 'Swing it one more time to the weak side, where the rotation has not arrived.' },
      { label: 'C', text: 'The wing drives it straight back into the help that just collapsed.' },
      { label: 'D', text: 'Reset the ball to the top and start a new action.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'It would be right if the closeout were not already there. But this specific shot is contested, and one more pass converts a contested three into an uncontested one — the defense is beaten, it just has not been made to pay yet.',
      'Correct. A rotating defense is always one pass behind the ball. Each swing costs the defense a step it can never fully recover, so the second and third passes off a drive are where the genuinely open shot appears, not the first.',
      'Driving into help that is already loaded is attacking the defense at its strongest point. The advantage created by the first drive lives on the weak side now, not in the paint.',
      'This is how offenses waste beaten defenses. A defense in rotation is scrambling; resetting to the top gives it the two or three seconds it needs to be a defense again.',
    ],
    explanation:
      'The first kick out of a drive rarely produces the best shot — it produces the ADVANTAGE. Rotating defenders move in a chain, and every additional pass makes the chain longer than the distance they can cover. The discipline is to not shoot the first available shot when a better one is one pass away, which is a decision most players find harder than any physical skill in the possession.',
  },

  'top-lock-backcut': {
    id: 'top-lock-backcut',
    title: 'Beating a Top-Lock',
    category: OFFENSE,
    subcategory: 'Off-ball reads',
    difficulty: INTERMEDIATE,
    position: 'Wing',
    concepts: ['top-lock', 'back cut', 'off-ball reads', 'denial'],
    coachingCue: 'If he takes one road, the other one is empty.',
    playSteps: [
      step('You come off 5\'s pindown looking for the catch on the wing.', {
        o: { 2: nudge(SPOTS.leftBlock, -0.03, 0.0), 5: SPOTS.leftElbow, 1: SPOTS.top, 3: SPOTS.rightCorner, 4: SPOTS.rightWing },
        d: { 2: nudge(SPOTS.leftBlock, -0.02, 0.07), 5: 0.2, 3: 0.2, 4: 0.2 },
        ball: 1,
        arrows: [arrow('o2', nudge(SPOTS.leftBlock, -0.03, 0.0), SPOTS.leftWing)],
      }),
      step('X2 top-locks you — he jumps above you, face-guarding, to deny the catch coming off the screen.', {
        o: { 2: nudge(SPOTS.leftBlock, -0.05, 0.06), 5: SPOTS.leftElbow, 1: SPOTS.top, 3: SPOTS.rightCorner, 4: SPOTS.rightWing },
        d: { 2: nudge(SPOTS.leftWing, -0.02, -0.03), 5: 0.2, 3: 0.2, 4: 0.2 },
        ball: 1,
        arrows: [
          arrow('d2', nudge(SPOTS.leftBlock, -0.02, 0.07), nudge(SPOTS.leftWing, -0.02, -0.03)),
          arrow('o2', nudge(SPOTS.leftBlock, -0.05, 0.06), nudge(SPOTS.leftDunker, -0.06, 0.0), nudge(SPOTS.rim, -0.05, 0.0)),
        ],
      }),
    ],
    question:
      'Your defender top-locks you to deny the catch coming off the screen. What is the read?',
    options: [
      { label: 'A', text: 'Fight over the top and get to the ball anyway.' },
      { label: 'B', text: 'Back-cut to the rim behind the top-lock.' },
      { label: 'C', text: 'Clear out and go set a screen for someone else.' },
      { label: 'D', text: 'Signal for the screener to rescreen from the other side.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'Fighting through a top-lock is a physical contest you usually lose, and even winning it means catching the ball late, further from the rim, with a defender attached — the exact outcome the top-lock is trying to produce.',
      'Correct. A defender who has committed to a position above you cannot simultaneously be behind you. The top-lock defines which lane is open by definition, and the back cut arrives at the rim with only the help defender to beat.',
      'Passive. Clearing out removes you from the possession and confirms that top-locking you works, which guarantees you see it every time down the floor.',
      'A legitimate counter, but a slower one — and top-locks are often rescreen-proof because the defender simply relocates above you again. The immediate punishment is available right now, behind him.',
    ],
    explanation:
      'Every denial is a commitment, and every commitment opens the opposite path. Top-lock, deny, face-guard and shooting the gap are all defenders telling you which way they will not be able to go. Reading off-ball defense is mostly this one habit: notice what the defender has taken away, then take the thing he gave up to do it.',
  },

  'spacing-on-a-drive': {
    id: 'spacing-on-a-drive',
    title: 'Where Do You Go When He Drives?',
    category: OFFENSE,
    subcategory: 'Spacing',
    difficulty: BEGINNER,
    position: 'All',
    concepts: ['spacing', 'relocation', 'passing angles', 'one defender two players'],
    coachingCue: 'If one defender can see you and the ball at the same time, move.',
    assumptions: 'Assumes a drive-and-kick system where corner players lift on baseline penetration. Some teams instead clear the corner through to the weak side.',
    playSteps: [
      step('You are in the right corner. 3 catches on the wing above you and drives baseline — straight at you.', {
        o: { 2: SPOTS.rightCorner, 3: SPOTS.rightWing, 1: SPOTS.top, 4: SPOTS.leftWing, 5: SPOTS.leftBlock },
        d: { 2: nudge(SPOTS.rightCorner, -0.02, 0.06), 3: nudge(SPOTS.rightWing, 0.02, 0.02), 5: 0.3 },
        ball: 3,
        arrows: [arrow('o3', SPOTS.rightWing, nudge(SPOTS.rightCorner, -0.05, 0.1), nudge(SPOTS.rim, 0.1, 0.0))],
      }),
      step('Now his defender and yours are both in the same narrow strip of floor.', {
        o: { 2: SPOTS.rightWing, 3: nudge(SPOTS.rightBlock, 0.12, -0.04), 1: SPOTS.top, 4: SPOTS.leftWing, 5: SPOTS.leftBlock },
        d: { 2: nudge(SPOTS.rightCorner, -0.02, 0.06), 3: nudge(SPOTS.rightCorner, 0.0, 0.12), 5: nudge(SPOTS.rim, -0.04, 0.04) },
        ball: 3,
        arrows: [arrow('o2', SPOTS.rightCorner, SPOTS.rightWing)],
      }),
    ],
    question:
      'A teammate drives baseline from the wing, straight at the corner you are standing in. What do you do?',
    options: [
      { label: 'A', text: 'Stay put — you are already behind the arc and ready to shoot.' },
      { label: 'B', text: 'Lift up the sideline toward the wing, out of the drive\'s path.' },
      { label: 'C', text: 'Cut to the rim to give him a dump-off.' },
      { label: 'D', text: 'Come toward him to give him a close outlet pass.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'Standing still lets one defender guard two people. Your man can sit between you and the ball and cover both, so the drive faces an extra defender and you never actually become a threat.',
      'Correct. Lifting does two things at once: it removes your defender from the driving lane, and it stretches the distance he has to close if the ball comes to you. Moving to a spot the passer can see is what makes spacing an action rather than a position.',
      'You would be filling the exact space he is driving into, and you would bring the rim protector with you. Cutting into a live drive is the most common way good spacing collapses.',
      'Shortening the pass shortens the closeout too. A defender only has to travel a few feet to contest, and you have crowded the driver at the same time.',
    ],
    explanation:
      'Spacing is not where you stand — it is how you move relative to the ball. The test is simple and worth carrying into every possession: can one defender guard both me and the basketball right now? If the answer is yes, the space is broken, and moving to fix it is worth more to the possession than any move the ball handler can make.',
  },

  // REWRITTEN. The original marked "move the ball quickly around the perimeter"
  // as the way to break a 2-3, which is close to the opposite of the consensus —
  // perimeter-only ball movement is what a zone is shaped to defend. Id preserved
  // because it is also the fallback in getScenarioById.
  'zone-offense': {
    id: 'zone-offense',
    title: 'Breaking Down a 2-3 Zone',
    category: OFFENSE,
    subcategory: 'Zone offense',
    difficulty: INTERMEDIATE,
    position: 'All',
    concepts: ['zone offense', 'middle touch', 'high post', 'short corner'],
    coachingCue: 'Make the zone turn its head. It cannot guard what it cannot see.',
    playSteps: [
      step('The defense sets up in a 2-3. Their top two are extended and pressuring the ball.', {
        o: { 1: SPOTS.top, 2: SPOTS.leftWing, 3: SPOTS.rightWing, 5: SPOTS.highPost, 4: SPOTS.rightShortCorner },
        d: {
          1: nudge(SPOTS.leftSlot, 0.04, 0.03),
          2: nudge(SPOTS.rightSlot, -0.04, 0.03),
          3: nudge(SPOTS.rightBlock, 0.06, 0.02),
          4: nudge(SPOTS.leftBlock, -0.06, 0.02),
          5: nudge(SPOTS.rim, 0, 0.05),
        },
        ball: 1,
      }),
      step('Their back three are spread wide to cover the corners, which leaves the middle of the zone soft.', {
        o: { 1: SPOTS.top, 2: SPOTS.leftWing, 3: SPOTS.rightWing, 5: SPOTS.highPost, 4: SPOTS.rightShortCorner },
        d: {
          1: nudge(SPOTS.leftSlot, 0.04, 0.03),
          2: nudge(SPOTS.rightSlot, -0.04, 0.03),
          3: nudge(SPOTS.rightShortCorner, 0.02, 0.05),
          4: nudge(SPOTS.leftShortCorner, -0.02, 0.05),
          5: nudge(SPOTS.rim, 0, 0.05),
        },
        ball: 1,
        arrows: [arrow('ball', nudge(SPOTS.top, 0.05, 0.06), nudge(SPOTS.highPost, 0.03, 0.04))],
      }),
    ],
    question:
      'You are attacking a 2-3 zone. The top two defenders are pressuring the ball and the back three are spread wide to the corners. What is most likely to break the zone down?',
    options: [
      { label: 'A', text: 'Move the ball quickly around the perimeter until someone is open.' },
      { label: 'B', text: 'Get a touch in the middle — high post or short corner — so the zone has to collapse and turn its head.' },
      { label: 'C', text: 'Post your biggest player on the block and feed him over the top.' },
      { label: 'D', text: 'Attack the gap between the two top defenders off the dribble.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'This is the most common thing offenses do against a zone and one of the least effective. A zone shifts as a unit and is built to slide with perimeter passes — passing around the outside asks it to do the exact thing it is designed to do well.',
      'Correct. A middle touch forces zone defenders to turn their heads away from the ball and collapse inward, which is the only moment their spacing genuinely breaks. From the high post or short corner the passer can see both baseline corners and the rim, so the defense is wrong whichever way it commits.',
      'Attacking the zone at its strongest point. The 2-3 keeps its biggest defender on the block precisely to make that entry hard, and the two wings sink to double it.',
      'A real weapon, but not against this alignment — the two top defenders are extended and pressuring, so the gap between them is the most crowded part of the floor. This becomes the right answer when the top pair sags instead.',
    ],
    explanation:
      'Zones defend the ball as a shape rather than as five matchups, so the way to distort them is to attack where the shape has no owner — the middle. Getting the ball inside the perimeter, whether at the high post, the short corner, or off the dribble into a genuine gap, forces individual defenders to make individual decisions, which is the moment a zone stops being a zone. Which of those entries is correct depends on how the specific zone is aligned, which is why the alignment is stated in the scenario.',
  },
};

const TRANSITION = {
  // REWRITTEN. The original question ("how should you play it?") had a correct
  // answer that stopped at "protect the rim", which is only the first half of the
  // tandem. The id and correctIndex are both preserved so historical results stay
  // comparable.
  'transition-defense': {
    id: 'transition-defense',
    title: 'Front of the Tandem: 3-on-2',
    category: DEFENSE,
    subcategory: 'Transition defense',
    difficulty: INTERMEDIATE,
    position: 'All',
    concepts: ['transition defense', 'tandem', 'stopping the ball', 'buying time'],
    coachingCue: 'Stop the ball, force the pass, then go get the next one.',
    playSteps: [
      step('They rebound and push. You and one teammate are the only two defenders back.', {
        o: { 1: SPOTS.halfCourt, 2: nudge(SPOTS.leftWingExtended, -0.04, 0.14), 3: nudge(SPOTS.rightWingExtended, 0.04, 0.14) },
        d: { 1: SPOTS.nail, 2: null, 3: null },
        ball: 1,
        arrows: [arrow('o1', SPOTS.halfCourt, SPOTS.top)],
      }),
      step('You are the FRONT defender in the tandem; your partner is protecting the rim behind you. The ball attacks the middle.', {
        o: { 1: SPOTS.top, 2: SPOTS.leftWing, 3: SPOTS.rightWing },
        d: { 1: SPOTS.nail, 2: null, 3: null },
        ball: 1,
        arrows: [arrow('d1', SPOTS.topExtended, SPOTS.nail)],
      }),
      step('Your partner sits between the two wings, ready to take whichever one gets the first pass.', {
        o: { 1: SPOTS.top, 2: SPOTS.leftWing, 3: SPOTS.rightWing },
        d: { 1: SPOTS.nail, 2: nudge(SPOTS.rim, 0, 0.06), 3: null },
        ball: 1,
        arrows: [arrow('d1', SPOTS.nail, nudge(SPOTS.leftElbow, -0.06, -0.06))],
      }),
    ],
    question:
      'You are the front defender in a two-man tandem against a 3-on-2 break, and the ball handler is attacking the middle. How do you play it?',
    options: [
      { label: 'A', text: 'Sprint out above the arc at the ball handler to force an early pass.' },
      { label: 'B', text: 'Stop the ball around the free-throw line, force the pass, then drop and rotate to cover the opposite side while your partner takes the first pass.' },
      { label: 'C', text: 'Drop to the rim alongside your partner and concede the pull-up.' },
      { label: 'D', text: 'Match up with the nearest wing and let your partner handle the ball.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'Going out that far turns a 3-on-2 into a 3-on-1. He passes around you before you arrive and now one defender is guarding two attackers at the rim with nobody recovering.',
      'Correct. The tandem is a delay mechanism, not a stop: the front defender takes away the drive at the free-throw line so the ball has to be passed, the back defender takes that first pass, and the front defender immediately drops to become the new back defender. That sequence buys the two or three seconds your teammates need to get back and make it 5-on-3.',
      'Two defenders at the rim leaves the ball completely uncontested. An open transition jumper is a bad concession, and if it misses the offense has three rebounders against two defenders standing under the basket.',
      'Guarding a man without the ball in a numbers disadvantage is how you concede a layup. In transition you defend the ball and the rim first; matchups get sorted out once the numbers are even.',
    ],
    explanation:
      'Transition defense in a disadvantage is not about getting a stop on this action — it is about surviving long enough to stop being in a disadvantage. Every job in the tandem is measured in seconds bought. The part players most often miss is the second half: after forcing the pass, the front defender has to keep working and rotate down, because a tandem that only executes its first responsibility becomes a 3-on-1 one pass later.',
  },

  'transition-offense-3on2': {
    id: 'transition-offense-3on2',
    title: 'Making the Tandem Commit',
    category: OFFENSE,
    subcategory: 'Transition offense',
    difficulty: INTERMEDIATE,
    position: 'Guard',
    concepts: ['transition offense', 'numbers advantage', 'holding the dribble', 'forcing commitment'],
    coachingCue: 'Do not pass until he has to choose.',
    playSteps: [
      step('You have the ball in a 3-on-2 with both wings filled wide.', {
        o: { 1: SPOTS.topExtended, 2: nudge(SPOTS.leftWing, -0.03, 0.12), 3: nudge(SPOTS.rightWing, 0.03, 0.12) },
        d: { 1: null, 2: null, 3: null },
        ball: 1,
        arrows: [
          arrow('o1', SPOTS.topExtended, SPOTS.top),
          arrow('o2', nudge(SPOTS.leftWing, -0.03, 0.12), SPOTS.leftWing),
          arrow('o3', nudge(SPOTS.rightWing, 0.03, 0.12), SPOTS.rightWing),
        ],
      }),
      step('The front defender steps up to meet you at the free-throw line; the back defender sits between your two wings.', {
        o: { 1: SPOTS.top, 2: SPOTS.leftWing, 3: SPOTS.rightWing },
        d: { 1: SPOTS.nail, 2: nudge(SPOTS.rim, 0, 0.07), 3: null },
        ball: 1,
        arrows: [arrow('o1', SPOTS.top, nudge(SPOTS.nail, 0.05, 0.05))],
      }),
    ],
    question:
      'You are attacking a 3-on-2 with your wings filled wide and the front defender has stepped up at the free-throw line. What is the read?',
    options: [
      { label: 'A', text: 'Pass to a wing early, before the defense gets set.' },
      { label: 'B', text: 'Attack the front defender\'s shoulder and hold your dribble until he commits, then deliver.' },
      { label: 'C', text: 'Pull up for the free-throw-line jumper he is giving you.' },
      { label: 'D', text: 'Drive all the way and challenge both defenders at the rim.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'Passing early is the most common way a 3-on-2 gets wasted. Nobody has committed yet, so the pass costs you nothing and gains you nothing — the back defender simply slides across and the advantage is gone.',
      'Correct. A numbers advantage only converts when a defender is forced to guard two players at once. Attacking his shoulder makes him choose between you and the pass, and keeping your dribble alive means you still hold both options at the moment he decides.',
      'The shot the defense is happy to give. Taking a mid-range jumper with a numbers advantage in transition converts your best available shot into one of your worst.',
      'Once you pick up your dribble in the paint against two defenders you have no options left. The advantage came from having three choices; driving into both of them reduces it to one.',
    ],
    explanation:
      'Advantages are not converted by moving the ball fast — they are converted by making a defender wrong. Until a defender commits, every pass is just a lateral move the defense can mirror. Attacking a specific defender with the dribble alive is what forces the commitment, and the pass is then a consequence of his decision rather than a guess about it.',
  },
};

const SITUATIONAL = {
  'late-clock-mismatch': {
    id: 'late-clock-mismatch',
    title: 'Six on the Clock, Big on You',
    category: OFFENSE,
    subcategory: 'Late clock',
    difficulty: ADVANCED,
    position: 'Guard',
    concepts: ['shot clock management', 'mismatch', 'offensive rebounding window', 'shot quality'],
    coachingCue: 'Late clock is not the same as late game.',
    assumptions: 'Tie game in the middle of the fourth quarter, not an end-of-game possession. If this were the last possession of the game, holding for the final shot would be correct.',
    playSteps: [
      step('You have a switch: a slower big is guarding you on the right wing. Six seconds on the shot clock.', {
        o: { 1: SPOTS.rightWing, 5: SPOTS.top, 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.rightWing, 0.0, 0.08), 5: 0.15, 2: 0.2, 3: 0.2, 4: 0.2 },
        ball: 1,
      }),
      step('The help side has not loaded up yet. Your teammates are spaced behind the arc.', {
        o: { 1: SPOTS.rightWing, 5: SPOTS.top, 2: SPOTS.leftCorner, 3: SPOTS.rightCorner, 4: SPOTS.leftWing },
        d: { 1: nudge(SPOTS.rightWing, 0.0, 0.08), 5: 0.15, 2: 0.2, 3: 0.2, 4: 0.2 },
        ball: 1,
        arrows: [arrow('o1', SPOTS.rightWing, nudge(SPOTS.rightElbow, 0.02, 0.02), nudge(SPOTS.rim, 0.07, 0.02))],
      }),
    ],
    question:
      'Six seconds on the shot clock, tied game in the middle of the fourth, and you have a slower big switched onto you on the wing. What is the best use of the possession?',
    options: [
      { label: 'A', text: 'Attack now and get to the rim or the foul line.' },
      { label: 'B', text: 'Hold it until about 2 seconds so a miss leaves them no time.' },
      { label: 'C', text: 'Swing it and run a quick pindown on the other side.' },
      { label: 'D', text: 'Drive and kick to the corner for a three.' },
    ],
    correctIndex: 0,
    optionNotes: [
      'Correct. Six seconds is enough time to attack, draw a foul, or generate an offensive rebound — but only if the shot goes up with time left. Attacking immediately also catches the help side before it has loaded, which is when a mismatch is worth the most.',
      'This confuses shot-clock management with game-clock management. Holding for the last shot is an end-of-game tactic; on a mid-quarter possession it just guarantees the worst shot of the possession with no rebound and no foul available.',
      'Six seconds is not enough to run a second action into a good shot. You would be catching with two or three seconds left, which is a rushed shot against a set defense — and it throws away the mismatch you already had.',
      'The kick arrives with a shot clock nearly expired, so the shooter is rushed and the closeout is live. It also spends a matchup advantage to create a harder shot for someone else.',
    ],
    explanation:
      'Shot-clock decisions are about maximising the value of ONE possession; game-clock decisions are about controlling how many possessions remain. Confusing the two is one of the most common late-clock errors — players hold the ball on a mid-quarter possession out of an instinct that only belongs in the last thirty seconds of a game. With an advantage and six seconds, the possession is worth the most right now.',
  },

  'down-three-foul-or-defend': {
    id: 'down-three-foul-or-defend',
    title: 'Down Three, 22 Seconds',
    category: DEFENSE,
    subcategory: 'Time and score',
    difficulty: ELITE,
    position: 'All',
    concepts: ['time and score', 'foul strategy', 'possession math', 'end of game'],
    coachingCue: 'Twenty-two seconds is two possessions. Ten is not.',
    assumptions:
      'Assumes a shot clock is running and you hold one timeout. Many staffs do start fouling under roughly 10 seconds; the disagreement is about the threshold, not the principle.',
    playSteps: [
      step('You are down 3 with 22 seconds left. They are inbounding in the backcourt and you are in the bonus.', {
        o: { 1: SPOTS.halfCourt, 2: nudge(SPOTS.leftWingExtended, -0.04, 0.16), 3: nudge(SPOTS.rightWingExtended, 0.04, 0.16), 4: SPOTS.leftWing, 5: SPOTS.rightWing },
        d: { 1: nudge(SPOTS.halfCourt, 0.0, -0.06), 2: 0.15, 3: 0.15, 4: 0.15, 5: 0.15 },
        ball: 1,
      }),
      step('If you get a stop you still have time for a full possession and a three to tie.', {
        o: { 1: SPOTS.top, 2: SPOTS.leftWing, 3: SPOTS.rightWing, 4: SPOTS.leftCorner, 5: SPOTS.rightCorner },
        d: { 1: 0.15, 2: 0.15, 3: 0.15, 4: 0.15, 5: 0.15 },
        ball: 1,
      }),
    ],
    question:
      'Down 3 with 22 seconds left, the opponent has the ball and you are in the bonus with one timeout. Foul immediately or defend?',
    options: [
      { label: 'A', text: 'Foul immediately to stop the clock and get the ball back.' },
      { label: 'B', text: 'Defend without fouling — there is still time for a stop and a full possession.' },
      { label: 'C', text: 'Trap the inbounds pass to force a turnover, accepting the risk of a layup.' },
      { label: 'D', text: 'Chase their worst free-throw shooter and foul him wherever he is.' },
    ],
    correctIndex: 1,
    optionNotes: [
      'Fouling down 3 turns a one-shot deficit into a likely two-shot one. You are trading a probable 5-point deficit for clock you do not yet need — at 22 seconds the clock is not the scarce resource.',
      'Correct. With 22 seconds and the shot clock working for you, a stop gives you a full possession and a three to tie with time still on the clock. Fouling only becomes correct when there is no longer enough time to get a stop AND run a possession, which is roughly inside 10 seconds.',
      'Aggressive and occasionally right if you are desperate, but a trap against an inbounds play concedes a layup when it fails — and a 5-point deficit at 20 seconds is a much worse position than a 3-point one.',
      'A real tactic, but it is still fouling, and hunting a specific player costs seconds and coverage while you chase him. The threshold question comes first: at 22 seconds you should not be fouling at all.',
    ],
    explanation:
      'End-of-game decisions come down to counting possessions against seconds. Down 3, you need one possession if you get a stop and two if you foul. At 22 seconds there is comfortably enough time for the stop-plus-possession path, so fouling spends points to buy time you already have. The number changes as the clock runs — the skill is knowing which side of the threshold you are on, not memorising a rule.',
  },
};

// ─── Catalog ─────────────────────────────────────────────────────────────────

export const SIM_COACH_SCENARIOS = {
  ...PICK_AND_ROLL,
  ...HELP_AND_ROTATION,
  ...ADVANTAGE_OFFENSE,
  ...TRANSITION,
  ...SITUATIONAL,
};

// Ordered list for pickers (id + display fields only). `difficulty` was added so
// AssignWorkoutScreen can show a coach what level a scenario is pitched at rather
// than making them open each one.
export const SIM_COACH_SCENARIO_LIST = Object.values(SIM_COACH_SCENARIOS).map((s) => ({
  id: s.id,
  title: s.title,
  category: s.category,
  subcategory: s.subcategory,
  difficulty: s.difficulty,
  steps: s.playSteps.length,
}));

export const getScenarioById = (id) => SIM_COACH_SCENARIOS[id] || SIM_COACH_SCENARIOS['zone-offense'];

export const getScenariosByCategory = (category) =>
  Object.values(SIM_COACH_SCENARIOS).filter((s) => s.category === category);

export const getScenariosByDifficulty = (difficulty) =>
  Object.values(SIM_COACH_SCENARIOS).filter((s) => s.difficulty === difficulty);

/** Scenarios touching a concept, e.g. 'drop coverage'. Matching is case-insensitive. */
export const getScenariosByConcept = (concept) => {
  const needle = String(concept).toLowerCase();
  return Object.values(SIM_COACH_SCENARIOS).filter((s) =>
    (s.concepts || []).some((c) => c.toLowerCase().includes(needle))
  );
};
