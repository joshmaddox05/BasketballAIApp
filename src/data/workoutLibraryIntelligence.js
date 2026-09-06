// workoutLibraryIntelligence.js — the read/decision layer for src/data/workouts.js.
//
// WHY A SECOND FILE
// The app has two workout catalogs that grew independently:
//
//   workoutTemplates.js  37 shared step templates, composed into workouts.
//                        Enriched by drillIntelligence.js, keyed by template KEY.
//   workouts.js          55 workouts with 212 bespoke, per-workout steps.
//                        Enriched here, keyed by step TITLE.
//
// The second one has no shared step objects — a step is prose written inline for
// one workout — so there is no key to hang content on except the title. 207 of
// the 212 titles are unique; the five that repeat are disambiguated by
// STEP_CONCEPTS_BY_WORKOUT below.
//
// HOW IT IS ORGANISED
// Writing bespoke reads for 212 steps would produce 212 near-duplicates ("Corner
// Three Practice" and "Wing Three Practice" are the same decision from different
// spots). So steps map to CONCEPTS, and the content is written once per concept.
// Concepts that already exist in the template catalog are reused by reference
// rather than restated, so the two catalogs cannot drift apart.
//
// WHAT IS DELIBERATELY LEFT OUT
// Not every step is a decision. Warm-ups, cool-downs, core work, and the whole
// nutrition category have no in-drill read, and inventing one would be worse than
// leaving the fields off — a "read" on Hydration Strategy would be content-shaped
// noise. Unmapped steps pass through untouched and render exactly as before.
// Coverage is asserted in tests/content/workoutLibrary.test.mjs, which also
// asserts the exempt categories stay exempt.
import { DRILL_INTELLIGENCE, TRAINING_STAGES } from './drillIntelligence.js';

const { TEACH, GUIDED_READ, RANDOM_READ, LIVE, COMPETITIVE } = TRAINING_STAGES;

// ─── Concepts reused from the template catalog ───────────────────────────────
// By reference, not by copy: editing a drill's reads in drillIntelligence.js
// updates both catalogs at once.
const REUSED = {
  formShooting: DRILL_INTELLIGENCE.FORM_SHOOTING,
  freeThrow: DRILL_INTELLIGENCE.FREE_THROWS,
  spotThree: DRILL_INTELLIGENCE.THREE_POINTERS,
  catchAndShoot: DRILL_INTELLIGENCE.CATCH_AND_SHOOT,
  movementShooting: DRILL_INTELLIGENCE.MOVEMENT_SHOOTING,
  midRangePullUp: DRILL_INTELLIGENCE.MID_RANGE_SHOOTING,
  offDribbleShooting: DRILL_INTELLIGENCE.OFF_DRIBBLE_SHOOTING,

  stationaryHandle: DRILL_INTELLIGENCE.STATIONARY_DRIBBLING,
  crossover: DRILL_INTELLIGENCE.CROSSOVERS,
  betweenLegs: DRILL_INTELLIGENCE.BETWEEN_LEGS,
  behindBack: DRILL_INTELLIGENCE.BEHIND_THE_BACK,
  speedDribble: DRILL_INTELLIGENCE.SPEED_DRIBBLE,
  twoBall: DRILL_INTELLIGENCE.TWO_BALL_DRIBBLING,
  coneHandle: DRILL_INTELLIGENCE.CONE_DRIBBLING,
  ballScreenRead: DRILL_INTELLIGENCE.BALL_SCREEN_READS,
  oneOnOne: DRILL_INTELLIGENCE.ONE_ON_ONE_LIVE,

  defensiveStance: DRILL_INTELLIGENCE.DEFENSIVE_SLIDES,
  onBallContain: DRILL_INTELLIGENCE.ZIGZAG_DEFENSE,
  closeoutDefense: DRILL_INTELLIGENCE.CLOSEOUT_DRILL,
  helpPositioning: DRILL_INTELLIGENCE.SHELL_DRILL,
  helpAndRecover: DRILL_INTELLIGENCE.HELP_AND_RECOVER,
  mirrorDefense: DRILL_INTELLIGENCE.MIRROR_DRILL,

  chestPass: DRILL_INTELLIGENCE.CHEST_PASS,
  bouncePass: DRILL_INTELLIGENCE.BOUNCE_PASS,
  overheadSkip: DRILL_INTELLIGENCE.OVERHEAD_PASS,
  postEntry: DRILL_INTELLIGENCE.ENTRY_PASS,
  noLookPass: DRILL_INTELLIGENCE.NO_LOOK_PASS,
  behindBackPass: DRILL_INTELLIGENCE.BEHIND_BACK_PASS,
  transitionDecision: DRILL_INTELLIGENCE.TRANSITION_DECISIONS,

  ladder: DRILL_INTELLIGENCE.LADDER_DRILLS,
  boxJumps: DRILL_INTELLIGENCE.BOX_JUMPS,
  sprints: DRILL_INTELLIGENCE.SPRINTS,
  suicides: DRILL_INTELLIGENCE.SUICIDE_DRILLS,
};

// ─── Concepts this catalog covers that the template catalog does not ─────────
// NOTE: this library has no rebounding or box-out drill anywhere in its 55
// workouts, so there is no step for a rebounding concept to attach to. A concept
// with nothing mapped to it is dead content, and the "no dead concepts" test in
// tests/content/workoutLibrary.test.mjs fails on it — so the gap is recorded here
// rather than papered over with an unreachable entry.
const LIBRARY_CONCEPTS = {
  // Shot creation
  stepBack: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Hoop'],
    players: 1,
    reads: [
      'Is the defender pressed into you and moving forward, or sitting back in a stance?',
      'Do you have the space to go forward instead — because that is the better shot if it is there.',
    ],
    decisions: [
      'Defender crowding you and moving downhill: step back into the space he vacated.',
      'Defender sitting back: do not step back into more distance — attack him instead.',
    ],
    coachingPoints: [
      'Push off hard into the step-back; drifting backwards produces a flat shot with no legs in it.',
      'Sell the drive first. A step-back with no forward threat is just a contested long two.',
    ],
    commonMistakes: [
      'Using it as an opener rather than as a counter to pressure.',
      'Fading sideways instead of straight back, which takes the shot off line.',
    ],
    gameTransfer: 'Creating separation late in the clock against a defender who has taken away the drive.',
  },
  fadeaway: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Hoop'],
    players: 1,
    reads: ['Is the defender bodying you up, or has he given you room to turn and face?'],
    decisions: [
      'Defender leaning on you: fade away from the pressure.',
      'Defender giving ground: turn and face — a fadeaway trades an easier shot for a harder one.',
    ],
    coachingPoints: [
      'Create the separation with the legs and land balanced; a fadeaway you cannot land is a fadeaway you cannot repeat.',
      'Higher arc, because you are shooting on the way backwards.',
    ],
    commonMistakes: ['Fading when nobody is actually pressuring you, which is a self-inflicted harder shot.'],
    gameTransfer: 'Scoring over a defender who has taken away your drive and is playing you tight in the mid-post.',
  },
  floater: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Hoop'],
    players: 1,
    reads: [
      'Has the rim protector committed upward, and is he too tall to finish over?',
      'Are you still far enough out to get the ball up before he arrives?',
    ],
    decisions: [
      'Big stepping up early: release the floater before you reach him.',
      'Big staying down: keep going and finish at the rim.',
    ],
    coachingPoints: [
      'Release it off one foot on the way up, well before contact — a floater taken late is a blocked layup.',
      'High and soft. The whole point is the arc clearing a taller defender.',
    ],
    commonMistakes: ['Waiting until you are underneath the rim protector, which removes the only advantage the shot has.'],
    gameTransfer: 'Finishing in the paint against a drop big who will not leave the rim — the shot drop coverage concedes.',
  },
  bankShot: {
    stage: TEACH,
    equipment: ['Ball', 'Hoop'],
    players: 1,
    reads: ['Are you at an angle where the backboard is available, roughly between the baseline and 45 degrees?'],
    decisions: [
      'On an angle inside 45 degrees: use the glass — it is a bigger target than the rim.',
      'Straight on or from the corner: shoot it clean, the angle does not work.',
    ],
    coachingPoints: ['Aim at the top corner of the square nearest you, not at the rim.'],
    commonMistakes: ['Banking from the corner or straight on, where the geometry does not support it.'],
    gameTransfer: 'Angled drives and short jumpers where the glass gives a larger and more forgiving target.',
  },
  deepRange: {
    stage: TEACH,
    equipment: ['Ball', 'Hoop'],
    players: 1,
    coachingPoints: [
      'Range comes from the legs and from a lower, earlier gather — not from a bigger arm swing.',
      'Stop at the distance where your mechanics change. That distance is the honest edge of your range.',
    ],
    commonMistakes: [
      'Chasing distance while your form degrades, which trains the broken version of the shot.',
      'Treating deep range as a skill separate from shot selection — most deep threes are bad shots.',
    ],
    gameTransfer: 'Pulling a defender out beyond his comfort, which stretches the floor for everyone else.',
  },
  lateClockShot: {
    stage: RANDOM_READ,
    equipment: ['Ball', 'Hoop', 'Partner'],
    players: 2,
    reads: [
      'How much clock is actually left, and is there time for a pass or only for a shot?',
      'Has the defense switched, and did that leave you a matchup worth attacking?',
    ],
    decisions: [
      'Six or more seconds with an advantage: attack now, while a foul or an offensive rebound still counts.',
      'Two or three seconds: get to your shot; there is no time for a second action.',
      'No advantage: get to the best shot available rather than the one you wanted.',
    ],
    coachingPoints: [
      'Late clock and late game are different problems. Holding for the last shot belongs to the end of a game, not to a mid-quarter possession.',
      'Practise these with a real clock running, or you are not practising the constraint.',
    ],
    commonMistakes: [
      'Holding the ball until two seconds on a possession where six were available.',
      'Settling for a rushed three when a foul was available.',
    ],
    gameTransfer:
      'End-of-clock possessions. Pairs with the "Six on the Clock, Big on You" SimCoach scenario.',
  },
  quickRelease: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Hoop', 'Partner'],
    players: 2,
    reads: ['Is the closeout close enough that the shot has to leave early, or do you have time to gather?'],
    decisions: [
      'Closeout arriving: shoot on the catch with your feet already set.',
      'No closeout coming: take the extra beat rather than rushing a shot nobody is contesting.',
    ],
    coachingPoints: [
      'Speed comes from preparing before the catch, not from hurrying after it.',
      'The dip should be shorter, not absent — removing it entirely costs you the legs.',
    ],
    commonMistakes: ['Rushing an uncontested shot out of habit, which is speed applied where it buys nothing.'],
    gameTransfer: 'Catch-and-shoot opportunities where the defense is rotating and the window is short.',
  },

  // Handle
  comboMoves: {
    stage: GUIDED_READ,
    equipment: ['Ball'],
    players: 1,
    reads: ['Did the first move actually move the defender, or is he still in front of you?'],
    decisions: [
      'First move beat him: go — do not add a second move to a defender you already beat.',
      'First move did not move him: chain into the counter.',
    ],
    coachingPoints: [
      'A combination is a move plus its counter, not a routine. Each additional move should be a response to a defender who survived the last one.',
      'Change speed between moves. Two moves at one speed is one move.',
    ],
    commonMistakes: [
      'Running a memorised three-move sequence regardless of what the defender does — the most common way handle work fails to transfer.',
    ],
    gameTransfer: 'Beating a defender who recovers from your first move, without giving up the advantage you made.',
  },
  weakHand: {
    stage: TEACH,
    equipment: ['Ball'],
    players: 1,
    coachingPoints: [
      'Go at the speed your weak hand can control, not the speed your strong hand wants.',
      'The goal is not a matching hand — it is a hand a defender cannot ignore.',
    ],
    commonMistakes: ['Practising the weak hand only in drills and never using it in a live rep.'],
    gameTransfer: 'Being able to be forced left (or right) without the possession ending there.',
  },
  hesitation: {
    stage: GUIDED_READ,
    equipment: ['Ball'],
    players: 1,
    reads: ['Did the defender rise out of his stance or shift his weight when you slowed down?'],
    decisions: [
      'He rose up or leaned: go immediately, past the foot he just committed.',
      'He stayed low and square: do not force it — reset and attack a different angle.',
    ],
    coachingPoints: [
      'The pause has to be convincing enough that a defender relaxes. A hesitation nobody believes is just a slow dribble.',
      'The acceleration out is the move; the hesitation only sets it up.',
    ],
    commonMistakes: ['Hesitating on a schedule rather than in response to a defender.'],
    gameTransfer: 'Attacking a defender who is retreating in a stance and will not open his hips.',
  },
  changeOfDirection: {
    stage: GUIDED_READ,
    equipment: ['Ball'],
    players: 1,
    reads: ['Which way are the defender\'s hips turned, and which foot is he standing on?'],
    decisions: [
      'Hips turned one way: change direction into the side he cannot cover.',
      'Hips square: change speed instead of direction — a direction change against a square defender gains nothing.',
    ],
    coachingPoints: ['Get low through the change and push off hard. Standing up through a change is what lets a defender recover.'],
    commonMistakes: ['Changing direction wide and slow, where the ball is exposed for the whole move.'],
    gameTransfer: 'Beating on-ball pressure and getting downhill after the first containment.',
  },
  retreatDribble: {
    stage: GUIDED_READ,
    equipment: ['Ball'],
    players: 1,
    reads: ['Are you being trapped or crowded with no forward angle available?'],
    decisions: [
      'Trapped or cut off: retreat to create the angle, then re-attack.',
      'Still have an advantage: do not retreat — retreating gives back the advantage you have.',
    ],
    coachingPoints: [
      'Retreat to re-attack, not to reset. The dribble should stay alive and the eyes stay up the floor.',
    ],
    commonMistakes: ['Retreating out of pressure and then picking the ball up, which is how a trap wins.'],
    gameTransfer: 'Escaping on-ball pressure and side traps without surrendering the possession.',
  },
  ballProtection: {
    stage: GUIDED_READ,
    equipment: ['Ball'],
    players: 1,
    reads: ['Where are the defender\'s hands, and is there a second defender closing from your blind side?'],
    decisions: [
      'Single defender reaching: keep your body between him and the ball, keep advancing.',
      'Second defender arriving: get rid of it before the trap forms rather than dribbling into it.',
    ],
    coachingPoints: ['Low dribble, wide base, off arm up as a bar rather than as a push.'],
    commonMistakes: ['Turning your back and killing your own vision, which turns pressure into a trap.'],
    gameTransfer: 'Advancing the ball against pressure and full-court denial.',
  },
  euroStep: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Hoop'],
    players: 1,
    reads: ['Has the help defender committed to one side of your body?'],
    decisions: [
      'Help committed to one side: step across to the other.',
      'Nobody committed: go straight — a euro step around nobody just adds distance.',
    ],
    coachingPoints: [
      'The first step has to genuinely threaten, or the second one has nothing to escape.',
      'Gather on two feet so you can still finish either way.',
    ],
    commonMistakes: ['Using it as a signature move rather than as an escape from a specific defender.'],
    gameTransfer: 'Finishing through help when a rotating defender takes away the direct line to the rim.',
  },
  splitTheDefense: {
    stage: RANDOM_READ,
    equipment: ['Ball', '2 partners'],
    players: 3,
    reads: ['Is there a real gap between the two defenders, or are they shoulder to shoulder?'],
    decisions: [
      'Gap available and the trap not yet set: split it and attack downhill.',
      'Trap already set: do not split — pass out of it to the short roll or the open side.',
    ],
    coachingPoints: [
      'Split before the trap closes, not after. Splitting a set trap is a turnover with a highlight attached.',
      'Get the ball through the gap first, then your body.',
    ],
    commonMistakes: ['Attempting the split as a first choice when a safe pass creates the same advantage.'],
    gameTransfer: 'Attacking a blitz or a hard hedge before the second defender arrives.',
  },

  // Defense
  forceDirection: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner'],
    players: 2,
    reads: ['Where is your help, and which of the ball handler\'s hands is weaker?'],
    decisions: [
      'Help set on the baseline: force him baseline into it.',
      'Help in the middle: force him middle.',
      'No help anywhere: contain straight up rather than forcing into nothing.',
    ],
    coachingPoints: [
      'Take away a side with your positioning, not with your hands.',
      'Forcing a direction is a team agreement. Forcing without help is just giving up an angle.',
    ],
    commonMistakes: ['Forcing a direction nobody is covering, which turns individual effort into a team breakdown.'],
    gameTransfer: 'Point-of-attack defense inside a team scheme, where containment has a direction.',
  },
  pressDefense: {
    stage: LIVE,
    equipment: ['Ball', 'Hoop', '5+ partners'],
    players: 'Team',
    reads: [
      'Has the ball handler picked up his dribble — which is the trigger to trap?',
      'Where is the next pass, and who is covering it?',
    ],
    decisions: [
      'Dribble alive and in the middle: contain and steer toward a sideline.',
      'Dribble dead or trapped on a sideline: trap, and let the next defender play the passing lane.',
    ],
    coachingPoints: [
      'The sideline and the half-court line are extra defenders. Use them instead of gambling.',
      'The trap is set by positioning; the steal is made by the man in the next passing lane.',
    ],
    commonMistakes: ['Everyone chasing the ball, which turns a press into a layup line the moment one pass gets out.'],
    gameTransfer: 'Full-court and three-quarter-court pressure when you need possessions back.',
  },
  contestWithoutFouling: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner'],
    players: 2,
    reads: ['Is he shooting or driving, and are you already beaten to the spot?'],
    decisions: [
      'Beaten but with position: stay vertical and take the contact.',
      'In front and balanced: contest with a high hand without leaving your feet.',
      'Late: do not jump — a late contest is a foul and a three-point play.',
    ],
    coachingPoints: [
      'Hands high and straight up. The verticality is what makes the contact legal.',
      'A contest that requires a jump has usually already failed.',
    ],
    commonMistakes: ['Swiping down at the ball on the shot, which is the most reliable way to foul a jump shooter.'],
    gameTransfer: 'Contesting at the rim and on the perimeter without putting the opponent on the line.',
  },

  // Passing / vision
  courtVision: {
    stage: GUIDED_READ,
    equipment: ['Ball', '2+ partners'],
    players: 3,
    reads: [
      'Which defender has turned his head away from his man?',
      'Is the open man open now, or open by the time the pass would arrive?',
    ],
    decisions: [
      'Help defender turned: deliver before he turns back.',
      'Open man about to be covered: skip it one further rather than throwing into a closing window.',
    ],
    coachingPoints: [
      'See the floor before you catch. Vision is a habit of when you look, not a talent for how far.',
      'Pass to where the receiver will be, at the speed that gets it there in time.',
    ],
    commonMistakes: ['Picking up the dribble before finding the pass, which reduces four options to one.'],
    gameTransfer: 'Finding the second-side shooter off a drive, and any pass that beats a rotation.',
  },
  cutterFeed: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner'],
    players: 2,
    reads: ['Has the cutter\'s defender turned his head to the ball, and is the cutter ahead of him or behind him?'],
    decisions: [
      'Cutter ahead of his man: lead him to the rim.',
      'Defender recovering: do not force it — a late feed to a covered cutter is a turnover in the worst place on the floor.',
    ],
    coachingPoints: ['Throw it to the hand away from the defender, and throw it early enough that he catches it in stride.'],
    commonMistakes: ['Passing to where the cutter is instead of where he is going.'],
    gameTransfer: 'Rewarding back cuts and basket cuts, which is what keeps defenders from over-helping.',
  },
  lobPass: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Hoop', 'Partner'],
    players: 2,
    reads: [
      'Is the defender genuinely behind or beneath the receiver?',
      'Is there a weak-side helper in the lane who can play the flight of the ball?',
    ],
    decisions: [
      'Receiver has position and no helper is home: throw it.',
      'Helper waiting: do not throw it — a lob into help is an interception or a jump ball.',
    ],
    coachingPoints: ['Throw it above the rim and toward the front of it, so only the receiver can get to it.'],
    commonMistakes: ['Throwing a lob because it is available rather than because it is open.'],
    gameTransfer: 'Punishing a fronted post and finishing a rolling big over a beaten defender.',
  },

  // Team concepts (the STRATEGY category)
  giveAndGo: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Hoop', 'Partner'],
    players: 2,
    reads: ['Did your defender turn his head to watch the ball after you passed it?'],
    decisions: [
      'Defender watching the ball: cut immediately behind him.',
      'Defender still seeing you: relocate to a passing angle instead of cutting into nothing.',
    ],
    coachingPoints: [
      'The pass is the setup. Standing still after passing is what lets one defender guard you and the ball.',
      'Cut hard and all the way through — a half cut clogs the space it was supposed to use.',
    ],
    commonMistakes: ['Passing and watching, which is the single most common spacing error in the game.'],
    gameTransfer: 'The simplest two-man action there is, and the punishment for any defender who ball-watches.',
  },
  motionSpacing: {
    stage: LIVE,
    equipment: ['Ball', 'Hoop', '4+ partners'],
    players: 'Small group',
    reads: [
      'Can one defender see both you and the ball at the same time?',
      'Is the space you are standing in the space the ball handler needs?',
    ],
    decisions: [
      'One defender covering two: relocate until he cannot.',
      'Your space is needed: fill away, and let the drive have the lane.',
    ],
    coachingPoints: [
      'Motion is a set of principles, not a memorised pattern. Spacing, cutting and screening are decisions.',
      'Every pass should be followed by a cut, a screen, or a relocation — never by standing.',
    ],
    commonMistakes: ['Running the pattern correctly while ignoring what the defense is doing, which is choreography rather than offense.'],
    gameTransfer: 'Any half-court possession that is not a called set — which is most of them.',
  },
  manDefenseConcept: {
    stage: LIVE,
    equipment: ['Ball', 'Hoop', '5+ partners'],
    players: 'Team',
    reads: [
      'Where is the ball, and how many passes away is your man?',
      'Is the rim protected behind you?',
    ],
    decisions: [
      'Guarding the ball: contain and force toward help.',
      'One pass away: sit in the gap, ready to stunt.',
      'Two passes away: sink to the nail and see ball and man together.',
    ],
    coachingPoints: [
      'Man defense is five players guarding the ball, not five individual matchups.',
      'Talk on every pass, every screen, every rotation.',
    ],
    commonMistakes: ['Guarding your man and ignoring the ball, which leaves the paint open all night.'],
    gameTransfer:
      'Every half-court defensive possession. Pairs with the low-man and stunt-versus-commit SimCoach scenarios.',
  },
  zoneDefenseConcept: {
    stage: LIVE,
    equipment: ['Ball', 'Hoop', '5+ partners'],
    players: 'Team',
    reads: [
      'Where is the ball, and which area does that make yours?',
      'Has anyone got into the middle of the zone — because that is the emergency.',
    ],
    decisions: [
      'Ball in your area: close out under control and keep it in front.',
      'Ball entering the high post or short corner: collapse and take the middle away first.',
      'Ball reversed: shift as a unit before the ball arrives, not after.',
    ],
    coachingPoints: [
      'A zone guards space and the ball, not men. Shifting on the flight of the pass is what keeps the shape.',
      'The middle is the one place a zone cannot concede.',
    ],
    commonMistakes: [
      'Standing in a shape rather than moving on the pass, which is why a "zone" gets picked apart by simple ball reversal.',
    ],
    gameTransfer:
      'Defending as a unit against a spread floor. The mirror image of the "Breaking Down a 2-3 Zone" scenario.',
  },
  clockManagement: {
    stage: RANDOM_READ,
    equipment: ['Ball', 'Hoop', 'Partners', 'Clock'],
    players: 'Small group',
    reads: [
      'How many possessions are left, not just how many seconds?',
      'Are you protecting a lead or chasing one, and does the other team have fouls to give?',
    ],
    decisions: [
      'Protecting a lead: use clock, but still take a good shot — a shot-clock violation gives the ball back for free.',
      'Chasing: shorten possessions, and get the shot up with time for a rebound.',
    ],
    coachingPoints: [
      'Count possessions, not seconds. That is the number that decides whether you need to hurry.',
      'Late clock and late game are different problems with different answers.',
    ],
    commonMistakes: ['Holding the ball while protecting a lead until the possession produces no shot at all.'],
    gameTransfer: 'The last three minutes of any close game.',
  },
  foulSituations: {
    stage: RANDOM_READ,
    equipment: ['Ball', 'Hoop', 'Partners', 'Clock'],
    players: 'Small group',
    reads: [
      'Are you in the bonus, and is the deficit within one possession?',
      'Is there still time to get a stop AND run a possession?',
    ],
    decisions: [
      'Enough time for a stop plus a possession: defend without fouling.',
      'Not enough time: foul immediately, and foul the worst free-throw shooter you can reach.',
      'Protecting a three-point lead late: consider fouling before they can shoot a three.',
    ],
    coachingPoints: [
      'Fouling buys clock and costs points. The decision is whether you need the clock more than the points.',
      'Know the number before the situation arrives — deciding at the moment is how teams foul a three-point shooter.',
    ],
    commonMistakes: ['Fouling down three with 20 seconds left, which turns a one-possession game into a two-possession one.'],
    gameTransfer:
      'End-of-game defense. Directly trains the "Down Three, 22 Seconds" SimCoach scenario.',
  },
  endOfGame: {
    stage: COMPETITIVE,
    equipment: ['Ball', 'Hoop', 'Partners', 'Clock'],
    players: 'Small group',
    reads: [
      'What does the score actually require — a two, a three, or a stop?',
      'How many timeouts are left, and who has the foul to give?',
      'Is the defense switching everything, which changes who your best matchup is?',
    ],
    decisions: [
      'Down two with time: take the best available shot, not necessarily the three.',
      'Down three with one possession: get a clean three rather than a driving two.',
      'Tied with the last possession: run the clock to about five seconds so a miss cannot be answered.',
    ],
    coachingPoints: [
      'Rehearse these with a clock and a scoreboard. Without them you are practising a shot, not a situation.',
      'Everyone should know the situation before the inbound, not after the first pass.',
    ],
    commonMistakes: [
      'Taking a quick three when down two, which turns a good position into a worse one.',
      'Running the last possession so late there is no rebound available.',
    ],
    gameTransfer: 'The possessions that decide games, and the ones players remember.',
  },
  peripheralVision: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partners'],
    players: 3,
    reads: ['Can you see the defender AND the passing option without turning your head to either?'],
    decisions: [
      'Both in view: play at full speed.',
      'Only one in view: change your angle rather than guessing about the other.',
    ],
    coachingPoints: [
      'Eyes up and slightly ahead. Vision is bought by where you look before you catch, not by looking harder afterwards.',
    ],
    commonMistakes: ['Staring at the ball handler, which makes you a defender\'s easiest read.'],
    gameTransfer: 'Seeing the weak side while attacking the strong side, which is what makes an extra pass possible.',
  },

  // Physical concepts not in the template catalog. Deliberately no reads — this is
  // closed work, and pretending otherwise would be inventing content.
  dynamicWarmup: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: [
      'Move through ranges rather than holding stretches — static stretching before explosive work reduces power output.',
      'Build intensity gradually so the last minute of the warm-up looks like the first minute of the workout.',
    ],
    commonMistakes: ['Skipping it, or turning it into static stretching before an explosive session.'],
    gameTransfer: 'Arriving at the first possession already able to move at game speed.',
  },
  cooldown: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: ['Bring the heart rate down gradually, then stretch what you actually just worked.'],
    commonMistakes: ['Stopping dead after the last rep and skipping it entirely.'],
    gameTransfer: 'Recovery between sessions, which is what determines how much of the week you can train.',
  },
  coreStrength: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: [
      'Brace rather than crunch. The core\'s job in basketball is resisting rotation, not producing it.',
      'Quality over duration — a shaking plank with a sagging hip is training the sag.',
    ],
    commonMistakes: ['Letting the hips drop as fatigue arrives, which shifts the load into the lower back.'],
    gameTransfer: 'Absorbing contact on drives and holding position on a seal without getting moved.',
  },
  mobility: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: ['Work the hips and ankles specifically — they are what limit a defensive stance.'],
    commonMistakes: ['Treating mobility as optional until something already hurts.'],
    gameTransfer: 'Getting low enough to hold a stance for a whole possession without your back paying for it.',
  },
  lowerBodyStrength: {
    stage: TEACH,
    equipment: ['Weights (optional)'],
    players: 1,
    coachingPoints: [
      'Full range under control. Depth built under load is what shows up in a defensive stance.',
      'Train single-leg as well as double — basketball is played on one leg most of the time.',
    ],
    commonMistakes: ['Chasing load at the cost of range, which builds strength you cannot reach in a game.'],
    gameTransfer: 'First-step power, finishing through contact, and holding a stance late in a game.',
  },
  upperBodyStrength: {
    stage: TEACH,
    equipment: ['Weights (optional)'],
    players: 1,
    coachingPoints: ['Push and pull in balance; over-pressing without pulling is how shoulders get unhappy.'],
    commonMistakes: ['Training for size rather than for the ability to hold position against contact.'],
    gameTransfer: 'Holding a seal, finishing through a body, and boxing out a bigger player.',
  },
  plyometrics: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: [
      'Quality over quantity — plyometrics is a power exercise, and a tired rep is no longer a power rep.',
      'Land softly and absorb; the landing is where the injury risk and half the benefit both live.',
    ],
    commonMistakes: ['Doing them to fatigue, which converts a power session into a conditioning session at high injury cost.'],
    gameTransfer: 'Second jumps on the glass and explosive first steps.',
  },
  lateralPower: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: ['Push off the outside foot and stick the landing before the next rep.'],
    commonMistakes: ['Drifting through the movement rather than accelerating and decelerating it.'],
    gameTransfer: 'Staying in front of a ball handler who changes direction, and closing out under control.',
  },
  firstStep: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: [
      'The first step is a push, not a reach. Getting the hips moving beats getting the foot out further.',
      'Start from a stance you would actually be in during a game.',
    ],
    commonMistakes: ['Practising starts from a standing position you never occupy on the floor.'],
    gameTransfer: 'Beating a defender off the catch, and closing the first two steps of a closeout.',
  },
  reactionSpeed: {
    stage: RANDOM_READ,
    equipment: ['Partner'],
    players: 2,
    reads: ['What did the partner or the ball actually do — not what you expected it to do?'],
    decisions: ['Move on the signal you saw, not on the one you anticipated.'],
    coachingPoints: [
      'The value is entirely in not knowing what is coming. A predictable cue makes this a footwork drill.',
    ],
    commonMistakes: ['Guessing early, which looks fast and gets beaten by any change.'],
    gameTransfer: 'Reacting to a live ball handler and to loose balls, where the first step is a response.',
  },

  // Mental. Real preparation content, but no in-drill defensive read exists, so
  // these carry coaching points and transfer only.
  visualization: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: [
      'Rehearse specific situations you actually face, not vague success. "Late-clock switch onto a big" beats "playing well".',
      'Include the misses and the recoveries. Rehearsing only success prepares you for half the game.',
    ],
    commonMistakes: ['Vague positive imagery with no situation attached, which rehearses a mood rather than a decision.'],
    gameTransfer: 'Arriving at a familiar situation instead of a novel one, which is most of what composure is.',
  },
  preGameRoutine: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: [
      'Keep it repeatable in any gym, on any schedule. A routine that needs perfect conditions fails exactly when you need it.',
    ],
    commonMistakes: ['Building a routine so long or specific that a delayed tip-off destroys it.'],
    gameTransfer: 'Starting games ready rather than spending the first quarter arriving.',
  },
  focusAndComposure: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: [
      'Have one reset you can run in the four seconds between a mistake and the next possession.',
      'Practise it in training when something goes wrong, or it will not be there in a game.',
    ],
    commonMistakes: ['Only practising composure when calm, which is the condition that does not need it.'],
    gameTransfer: 'The possession immediately after a turnover or a missed shot.',
  },
};

export const CONCEPTS = { ...REUSED, ...LIBRARY_CONCEPTS };
export const LIBRARY_CONCEPT_KEYS = Object.keys(LIBRARY_CONCEPTS);

// ─── Step title -> concept ───────────────────────────────────────────────────
// Steps in workouts.js are prose written per workout, so the title is the only
// stable key. Titles NOT listed here get no read/decision fields, which is the
// correct outcome for warm-ups, cool-downs, isolated core work, and the entire
// nutrition category — none of those contain a basketball read, and attaching an
// invented one would be worse than leaving them plain.
export const STEP_CONCEPTS = {
  // Shooting
  'Warm-up Stance': 'formShooting',
  'Form Shooting Close Range': 'formShooting',
  'Mid-Range Form': 'formShooting',
  'One-Hand Form Shooting': 'formShooting',
  'Guide Hand Check': 'formShooting',
  'Balance and Base': 'formShooting',
  'Complete Form Practice': 'formShooting',
  'Routine Development': 'freeThrow',
  'Pressure Practice': 'freeThrow',
  'Clutch Free Throws': 'freeThrow',
  'Corner Three Practice': 'spotThree',
  'Wing Three Practice': 'spotThree',
  'Top of Key Practice': 'spotThree',
  'Elbow Shooting': 'midRangePullUp',
  'Pull-Up Jumpers': 'midRangePullUp',
  'Crossover Pull-Up': 'offDribbleShooting',
  'Hesitation Pull-Up': 'hesitation',
  'Step-Back Shooting': 'stepBack',
  'Fadeaway Practice': 'fadeaway',
  'Stationary Catch and Shoot': 'catchAndShoot',
  'Moving Catch and Shoot': 'movementShooting',
  'End of Shot Clock': 'lateClockShot',
  'Game-Winning Shot': 'endOfGame',
  'Bank Shot Practice': 'bankShot',
  'Close Range Bank Shots': 'bankShot',
  'Mid-Range Bank Shots': 'bankShot',
  'Game Situation Banks': 'bankShot',
  'Difficult Angle Shots': 'bankShot',
  'Runner Practice': 'floater',
  'Stationary Floater Form': 'floater',
  'One-Dribble Floater': 'floater',
  'Running Floater': 'floater',
  'Contested Floaters': 'floater',
  'Form Speed Drill': 'quickRelease',
  'Quick Catch Practice': 'quickRelease',
  'Timed Release Drill': 'quickRelease',
  'Game Speed Practice': 'quickRelease',
  'Progressive Distance': 'deepRange',
  'NBA Range Practice': 'deepRange',
  'Logo Shots': 'deepRange',

  // Ball handling
  'Stationary Dribbling': 'stationaryHandle',
  'Ball Control Warmup': 'stationaryHandle',
  Crossovers: 'crossover',
  'Between the Legs': 'betweenLegs',
  'Behind the Back': 'behindBack',
  'Combo Moves': 'comboMoves',
  'Game Moves': 'comboMoves',
  'Basic Combinations': 'comboMoves',
  'Triple Move Sequences': 'comboMoves',
  'Game Speed Combos': 'comboMoves',
  'Create Your Signature': 'comboMoves',
  'Speed Dribbling': 'speedDribble',
  'Full Court Speed': 'speedDribble',
  'Fast Break Dribbling': 'speedDribble',
  'Stationary Two-Ball': 'twoBall',
  'Alternating Two-Ball': 'twoBall',
  'Walking Two-Ball': 'twoBall',
  'Two-Ball Crossovers': 'twoBall',
  'Cone Dribbling': 'coneHandle',
  'Cone Forest': 'coneHandle',
  'Defensive Pressure': 'ballProtection',
  'Low Dribble Control': 'ballProtection',
  'Power Dribble': 'ballProtection',
  'Protect and Advance': 'ballProtection',
  'Pick and Roll Dribbling': 'ballScreenRead',
  'Pick and Roll Handling': 'ballScreenRead',
  'Isolation Dribbling': 'oneOnOne',
  'Weak Hand Stationary': 'weakHand',
  'Weak Hand Crossovers': 'weakHand',
  'Weak Hand Moves': 'weakHand',
  'Weak Hand Game Situations': 'weakHand',
  'Change of Direction': 'changeOfDirection',
  'Retreat Dribble': 'retreatDribble',
  'Split the Defense': 'splitTheDefense',
  'Footwork Foundation': 'euroStep',
  'With Ball - Walking': 'euroStep',
  'Full Speed Euro Steps': 'euroStep',
  'Euro Step Variations': 'euroStep',
  'Speed Ladder Dribbling': 'ladder',
  'Slow-to-Fast Drill': 'hesitation',
  'Hesitation Moves': 'hesitation',
  'In-and-Out Speed Change': 'hesitation',

  // Defense
  'Stance Check': 'defensiveStance',
  'Slide Drill': 'defensiveStance',
  'Drop Step Practice': 'defensiveStance',
  'Stance Endurance': 'defensiveStance',
  'Slide Warmup': 'defensiveStance',
  'Speed Slides': 'defensiveStance',
  'Defensive Slides': 'defensiveStance',
  'Basic Closeouts': 'closeoutDefense',
  'Hand Up Closeouts': 'closeoutDefense',
  'Closeout and Slide': 'closeoutDefense',
  'Live Closeouts': 'closeoutDefense',
  'Zig-Zag Slides': 'onBallContain',
  'Full Court Pursuit': 'onBallContain',
  'Reaction Slides': 'reactionSpeed',
  'Triangle Positioning': 'helpPositioning',
  'Jump to Ball': 'helpPositioning',
  'Help and Recover': 'helpAndRecover',
  'Rotation Drill': 'helpAndRecover',
  'Help on Drives': 'helpAndRecover',
  'Trace the Ball': 'contestWithoutFouling',
  'Pressure Without Fouling': 'contestWithoutFouling',
  'Force Direction': 'forceDirection',
  'Full Court Press': 'pressDefense',
  'Steal Attempts': 'pressDefense',
  'Mirror Drill': 'mirrorDefense',

  // Passing
  'Partner Passing': 'chestPass',
  'Moving Target': 'chestPass',
  'Quick Release': 'chestPass',
  'Bounce Point Practice': 'bouncePass',
  'Two-Hand Bounce Pass': 'bouncePass',
  'One-Hand Bounce Pass': 'bouncePass',
  'Long Distance Passing': 'overheadSkip',
  'Skip Pass off Dribble': 'overheadSkip',
  'Cross-Court Vision': 'courtVision',
  'Full Court Vision': 'courtVision',
  'Post Entry Passes': 'postEntry',
  'High-Low Entry': 'postEntry',
  'Wing Entry': 'postEntry',
  'Dribble Entry': 'postEntry',
  'Lob Entry': 'lobPass',
  'Alley-Oop Passes': 'lobPass',
  'Cutter Feeds': 'cutterFeed',
  'No-Look Skip Pass': 'noLookPass',
  'Look-Away Passes': 'noLookPass',
  'Off-the-Dribble No-Look': 'noLookPass',
  'Behind-the-Back Pass': 'behindBackPass',
  'Wrap-Around Pass': 'behindBackPass',
  'Full Court Showtime': 'transitionDecision',

  // Physical
  'Warm-up': 'dynamicWarmup',
  'Dynamic Warm-up': 'dynamicWarmup',
  'Dynamic Warmup': 'dynamicWarmup',
  'Power Warmup': 'dynamicWarmup',
  'Light Jog': 'dynamicWarmup',
  Cooldown: 'cooldown',
  'Cool Down Walk': 'cooldown',
  'Power Cool Down': 'cooldown',
  'Lower Body Strength': 'lowerBodyStrength',
  'Walking Lunges': 'lowerBodyStrength',
  'Upper Body Strength': 'upperBodyStrength',
  'Basketball Push-ups': 'upperBodyStrength',
  'Power Push-ups': 'upperBodyStrength',
  'Plank Variations': 'coreStrength',
  'Russian Twists': 'coreStrength',
  'Mountain Climbers': 'coreStrength',
  'Dead Bug': 'coreStrength',
  'Hip Mobility': 'mobility',
  'Static Stretching': 'mobility',
  'Ladder Drills': 'ladder',
  'Speed Ladder Laterals': 'ladder',
  'Cone Drills': 'lateralPower',
  'Cone Weaves': 'lateralPower',
  'Lateral Movement': 'lateralPower',
  'Lateral Bounds': 'lateralPower',
  'Lateral Shuffle to Sprint': 'lateralPower',
  'Multi-Directional Bursts': 'lateralPower',
  'Reaction Drills': 'reactionSpeed',
  'Reaction Starts': 'reactionSpeed',
  'Plyometric Exercises': 'plyometrics',
  'Jump Series': 'plyometrics',
  'Medicine Ball Slams': 'plyometrics',
  'Broad Jumps': 'plyometrics',
  'Single Leg Hops': 'plyometrics',
  'Jump Technique': 'boxJumps',
  'Box Jumps': 'boxJumps',
  'Suicide Runs': 'suicides',
  'Full Court Sprints': 'sprints',
  'Sprint Intervals': 'sprints',
  'Court Sprints': 'sprints',
  'Stance Explosions': 'firstStep',
  'Resistance Band Explosions': 'firstStep',
  'First Step to Finish': 'firstStep',

  // Team concepts
  'Pick and Roll': 'ballScreenRead',
  'Give and Go': 'giveAndGo',
  'Motion Offense': 'motionSpacing',
  'Man-to-Man Defense': 'manDefenseConcept',
  'Defensive Drills': 'manDefenseConcept',
  'Zone Defense': 'zoneDefenseConcept',
  'Peripheral Vision Drills': 'peripheralVision',
  'Passing Drills': 'courtVision',
  'Clock Management': 'clockManagement',
  'Foul Situations': 'foulSituations',
  'End-of-Game Scenarios': 'endOfGame',

  // Mental
  'Relaxation and Focus': 'focusAndComposure',
  'Positive Affirmations': 'focusAndComposure',
  'Confidence Building Exercises': 'focusAndComposure',
  'Visualization Practice': 'visualization',
  'Game Situation Visualization': 'visualization',
  'Success Visualization': 'visualization',
  'Physical Preparation': 'preGameRoutine',
  'Mental Preparation': 'preGameRoutine',
  'Routine Practice': 'preGameRoutine',
};

// Five titles are reused across workouts that mean different things by them —
// "Form Practice" is free-throw form in one workout and chest-pass form in
// another. These win over STEP_CONCEPTS, and the ambiguous titles are deliberately
// absent from the map above so neither reading can be applied by accident.
export const STEP_CONCEPTS_BY_WORKOUT = {
  'shooting-1::Cool Down': 'freeThrow',
  'physical-1::Cool Down': 'cooldown',
  'shooting-2::Form Practice': 'freeThrow',
  'passing-1::Form Practice': 'chestPass',
  'shooting-3::Game Situation Practice': 'catchAndShoot',
  'strategy-3::Game Situation Practice': 'courtVision',
};

/**
 * Resolve the concept for one step, preferring a workout-scoped mapping.
 * Returns undefined for steps that deliberately have no read layer.
 */
export const conceptForStep = (workoutId, stepTitle) =>
  CONCEPTS[STEP_CONCEPTS_BY_WORKOUT[`${workoutId}::${stepTitle}`]] ||
  CONCEPTS[STEP_CONCEPTS[stepTitle]] ||
  undefined;

/**
 * Merge the read layer onto one step. Authored step fields always win, so nothing
 * already written in workouts.js can be overwritten by a concept.
 */
export const withConcept = (workoutId, step) => {
  const c = conceptForStep(workoutId, step.title);
  if (!c) return step;
  return {
    ...(c.stage && { stage: c.stage }),
    ...(c.reads?.length && { reads: c.reads }),
    ...(c.decisions?.length && { decisions: c.decisions }),
    ...(c.coachingPoints?.length && { coachingPoints: c.coachingPoints }),
    ...(c.commonMistakes?.length && { commonMistakes: c.commonMistakes }),
    ...(c.gameTransfer && { gameTransfer: c.gameTransfer }),
    ...(c.equipment?.length && { drillEquipment: c.equipment }),
    ...(c.players != null && { players: c.players }),
    ...step,
  };
};
