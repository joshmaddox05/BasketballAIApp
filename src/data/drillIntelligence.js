// drillIntelligence.js — the read/decision layer for the drill catalog.
//
// WHY THIS EXISTS
// Every step template in workoutTemplates.js was a volume prescription: a name, a
// duration, a rep count and four instructions describing HOW to do the movement.
// None of them said WHEN the skill applies or WHAT the player is supposed to be
// reading, so the catalog trained execution divorced from decision — "practice
// pull-up jumpers from 10-15 feet" rather than "pull up when the big sits in a
// drop and your defender is trailing".
//
// Rather than rewrite 37 template objects (whose `name` strings are load-bearing
// for inputMappers.STEP_TITLE_TO_SHOT, STEP_TITLE_TO_SKILL and the pose movement
// registry), the basketball content lives here keyed by template KEY and is merged
// onto each step at module load. Every field is optional: user-authored custom
// workouts have none of them and render exactly as they always did.
//
// FIELDS
//   stage           where the drill sits in the Teach -> Competitive progression
//   equipment       what you actually need
//   players         1 / 2 / 3 / 'Small group' / 'Team'
//   reads           what the player should be perceiving while doing it
//   decisions       the choices that perception should produce
//   coachingPoints  what "good" looks like
//   commonMistakes  the failures that make the rep worthless
//   gameTransfer    the specific game moment this shows up in
//
// A drill without `reads` is not a failure — closed-skill work (form shooting,
// conditioning, jump rope) genuinely has no in-drill read, and pretending
// otherwise would be worse than leaving it out. Those carry `stage: TEACH` and a
// gameTransfer line instead.

export const TRAINING_STAGES = {
  TEACH: 'Teach',
  GUIDED_READ: 'Guided Read',
  RANDOM_READ: 'Random Read',
  LIVE: 'Live',
  COMPETITIVE: 'Competitive',
};

export const STAGE_ORDER = [
  TRAINING_STAGES.TEACH,
  TRAINING_STAGES.GUIDED_READ,
  TRAINING_STAGES.RANDOM_READ,
  TRAINING_STAGES.LIVE,
  TRAINING_STAGES.COMPETITIVE,
];

export const STAGE_DESCRIPTIONS = {
  [TRAINING_STAGES.TEACH]: 'Learn the movement without pressure or choices.',
  [TRAINING_STAGES.GUIDED_READ]: 'A partner gives a read you know is coming. Match the move to it.',
  [TRAINING_STAGES.RANDOM_READ]: 'You do not know which reaction is coming. Perceive first, then act.',
  [TRAINING_STAGES.LIVE]: 'Against a real defender playing to win.',
  [TRAINING_STAGES.COMPETITIVE]: 'Live, with a score, a clock, or a consequence.',
};

const { TEACH, GUIDED_READ, RANDOM_READ, LIVE, COMPETITIVE } = TRAINING_STAGES;

export const DRILL_INTELLIGENCE = {
  // ─── Shooting ──────────────────────────────────────────────────────────────
  FORM_SHOOTING: {
    stage: TEACH,
    equipment: ['Ball', 'Hoop'],
    players: 1,
    coachingPoints: [
      'Same hand path every rep — the ball should finish above your eyeline, not out in front of your chest.',
      'Land where you started. Drifting means your base, not your arms, is doing the aiming.',
      'Hold the follow-through until the ball hits the rim. It makes a bad rep obvious to you rather than invisible.',
    ],
    commonMistakes: [
      'Shooting fast to hit the rep count. Form shooting is the one drill where speed makes it worthless.',
      'Backing up as soon as shots start falling. The point is the pattern, not the distance.',
    ],
    gameTransfer:
      'This is the only genuinely closed drill in a shooting workout — it builds the motion everything else has to survive under pressure.',
  },
  FREE_THROWS: {
    stage: TEACH,
    equipment: ['Ball', 'Hoop'],
    players: 1,
    coachingPoints: [
      'Identical routine every attempt, including on the misses. The routine is what survives a hostile gym.',
      'Shoot at least some of them tired — free throws in games arrive after a sprint, not after a rest.',
    ],
    commonMistakes: [
      'Changing the routine after two misses, which trades a small slump for no routine at all.',
      'Shooting in comfortable rhythm from a rack. Games give you one shot, then a pause, then one more.',
    ],
    gameTransfer:
      'Late-game possessions are decided here more often than by any other single skill in this catalog.',
  },
  THREE_POINTERS: {
    stage: TEACH,
    equipment: ['Ball', 'Hoop'],
    players: 1,
    coachingPoints: [
      'Shot preparation starts before the catch — hands ready, inside foot loaded, feet turned to the rim before the ball arrives.',
      'Range comes from the legs. If the last two feet of it come from your shoulders, you have found your limit for today.',
    ],
    commonMistakes: [
      'Shooting from spots you never actually shoot from in a game.',
      'Counting makes without counting how many were in rhythm.',
    ],
    gameTransfer: 'Spot-up threes off a drive-and-kick — the most common three in the modern game.',
  },
  SPOT_SHOOTING: {
    stage: TEACH,
    equipment: ['Ball', 'Hoop'],
    players: 1,
    coachingPoints: [
      'Use the five spots you actually occupy in your team\'s spacing, not five evenly spaced ones.',
      'Sprint between spots so the shot is taken with a slightly elevated heart rate.',
    ],
    commonMistakes: [
      'Walking between spots, which turns a shooting workout into a shooting rest.',
      'Staying at a spot until it falls, which hides the miss instead of recording it.',
    ],
    gameTransfer: 'Catch-and-shoot opportunities from your assigned spacing positions.',
  },
  MID_RANGE_SHOOTING: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Hoop', 'Partner (optional)'],
    players: 1,
    reads: [
      'Where is the imagined big — at the level of the screen, or dropped to the free-throw line?',
      'Is your defender trailing you, or has he cut underneath into the driving lane?',
    ],
    decisions: [
      'Big dropped deep and defender trailing: rise into the pull-up.',
      'Big up at the level: refuse the pull-up and get downhill instead.',
    ],
    coachingPoints: [
      'Get into the shot off two feet where possible — it is the balance point that lets you shoot or pass from the same gather.',
      'Take the shot at the spot the coverage gives it, not the spot you like.',
    ],
    commonMistakes: [
      'Practising the pull-up as a move rather than as an answer to a specific coverage.',
      'Shooting every rep from the elbow when the drop actually gives you the space one step higher.',
    ],
    gameTransfer:
      'The shot a deep drop coverage concedes on every ball screen — see the "Attacking a Deep Drop" scenario.',
  },
  CATCH_AND_SHOOT: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Hoop', 'Partner'],
    players: 2,
    reads: [
      'Is the closeout arriving long and fast, short and under control, or to one shoulder?',
      'Are your feet and hands ready before the pass leaves the passer, or after?',
    ],
    decisions: [
      'Short, controlled closeout: shoot it.',
      'Long, hard closeout: shot fake and attack the momentum.',
      'Closeout to one shoulder: drive the other way.',
    ],
    coachingPoints: [
      'Hands up as a target before the ball is thrown. A late target produces a late shot.',
      'Feet arrive with the ball, not after it.',
    ],
    commonMistakes: [
      'Catching flat-footed and then getting into the shot, which adds half a second you do not have.',
      'Deciding to shoot before seeing the closeout — that is a habit, not a read.',
    ],
    gameTransfer: 'Every kick-out off a drive. The closeout you are given determines the correct answer.',
  },
  MOVEMENT_SHOOTING: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Hoop', 'Partner'],
    players: 2,
    reads: [
      'Is your defender trailing you over the screen, or top-locking to deny the catch?',
      'Are you square to the rim at the moment of the catch, or still turning?',
    ],
    decisions: [
      'Defender trailing: catch and rise immediately.',
      'Defender top-locking: back-cut instead of continuing to the catch.',
      'Defender switching onto you late: attack the closeout rather than shooting over it.',
    ],
    coachingPoints: [
      'Set up the cut before you use the screen. Coming off at full speed from a standstill is not a cut.',
      'Turn your shoulders to the rim on the way to the catch, not after it.',
    ],
    commonMistakes: [
      'Running the same route every rep regardless of what the defender does.',
      'Catching before getting your feet down, which forces a fade you did not choose.',
    ],
    gameTransfer:
      'Coming off pindowns, flares and wide pins — see the "Beating a Top-Lock" scenario for the denial read.',
  },
  OFF_DRIBBLE_SHOOTING: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Hoop'],
    players: 1,
    reads: [
      'Did the defender retreat to protect the drive, or close the space to take the shot?',
      'Is your gather balanced enough that you could still pass out of it?',
    ],
    decisions: [
      'Defender retreats: take the pull-up.',
      'Defender closes space: keep driving past him.',
    ],
    coachingPoints: [
      'The last dribble should be low and hard so the gather is fast rather than tall.',
      'Get to the shot on balance — a pull-up you can only shoot is a pull-up the defense can predict.',
    ],
    commonMistakes: [
      'Rising on the way sideways rather than up, which is where the flat, short miss comes from.',
      'Using a pull-up as the plan instead of as one of two available answers.',
    ],
    gameTransfer: 'One- and two-dribble pull-ups out of ball screens and closeout attacks.',
  },

  // ─── Ball handling ─────────────────────────────────────────────────────────
  STATIONARY_DRIBBLING: {
    stage: TEACH,
    equipment: ['Ball'],
    players: 1,
    coachingPoints: [
      'Eyes up the whole time. A stationary drill done with your eyes down builds a habit you cannot use.',
      'Fingertips and forearm, not the palm. The palm is why the ball is slow off the floor.',
    ],
    commonMistakes: [
      'Dribbling at a comfortable height. If it never feels hard, the drill is maintenance rather than development.',
    ],
    gameTransfer:
      'Ball security in traffic — the base under every live-dribble skill, which is why it stays a Teach-stage drill.',
  },
  CROSSOVERS: {
    stage: GUIDED_READ,
    equipment: ['Ball'],
    players: 1,
    reads: [
      'Has the defender opened his hips to one side, or is he square and sitting on your strong hand?',
      'Did he cut off the initial driving lane, or is it still there?',
    ],
    decisions: [
      'Hips open / lane cut off: cross to the other side.',
      'Still square with the lane open: do not cross — drive the lane you already have.',
    ],
    coachingPoints: [
      'Sell the first direction with your shoulders and eyes. A crossover with no threat in front of it is a sideways dribble.',
      'Change speed, not just direction. The move is the pace change; the handle is how you carry it out.',
    ],
    commonMistakes: [
      'Crossing over as a matter of routine rather than in response to a defender committing.',
      'A wide, slow crossover in front of the body, which is the easiest ball in basketball to steal.',
    ],
    gameTransfer:
      'The counter when a defender jumps your driving lane — the move only makes sense once he has committed.',
  },
  CONE_DRIBBLING: {
    stage: TEACH,
    equipment: ['Ball', 'Cones'],
    players: 1,
    coachingPoints: [
      'Attack each cone as if it were a hip, and change speed as you clear it.',
      'Cones do not move, so supply the urgency yourself — go game speed or the reps do not count.',
    ],
    commonMistakes: [
      'Treating cones as a substitute for a defender. Cones develop the handle; they cannot develop the read.',
      'Weaving at an even pace, which is the one tempo you will never use in a game.',
    ],
    gameTransfer:
      'Preparation only. Pair it with a live or read-based drill in the same session, or the handle never meets a decision.',
  },
  BETWEEN_LEGS: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner (optional, to give the read)'],
    players: 1,
    reads: ['Is the defender close enough that the ball needs your body between it and his hands?'],
    decisions: [
      'Defender pressuring tight: use the legs to protect the change of direction.',
      'Defender in a gap giving you space: a simple front change is faster.',
    ],
    coachingPoints: [
      'The move is protection first and flair second — your leg is a wall between his hands and the ball.',
      'Stay low through the change. Standing up to get the ball through is how the ball gets picked.',
    ],
    commonMistakes: ['Going between the legs when nobody is close enough to justify the extra time it costs.'],
    gameTransfer: 'Changing direction against on-ball pressure without exposing the ball.',
  },
  BEHIND_THE_BACK: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner (optional, to give the read)'],
    players: 1,
    reads: ['Has the defender reached or lunged across your body to cut off the front change?'],
    decisions: [
      'Defender reaching across: go behind the back, where his hands are not.',
      'Defender sitting back: keep it in front — behind-the-back costs time you do not need to spend.',
    ],
    coachingPoints: [
      'Wrap it tight to your back and keep moving forward through the move.',
      'Push the ball out to where you are going, not to where you are.',
    ],
    commonMistakes: ['Using it in traffic where a simpler change is safer and quicker.'],
    gameTransfer: 'Escaping a defender who has reached across your body, and changing direction in the open floor.',
  },
  SPEED_DRIBBLE: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner (optional, to give the read)'],
    players: 1,
    reads: ['Is there a defender ahead of the ball, or is the lane genuinely open?'],
    decisions: [
      'Open floor: push the ball out in front and run.',
      'Defender ahead: get the ball back under control before you arrive, not after.',
    ],
    coachingPoints: [
      'Push the ball ahead of your body — dribbling beside yourself is what caps your top speed.',
      'Fewest dribbles from rim to half court is a better measure than time alone.',
    ],
    commonMistakes: ['Sprinting with the ball at hip height, which forces you to slow down to change direction.'],
    gameTransfer: 'Pushing the ball in transition after a rebound, where speed decides whether numbers survive.',
  },
  TWO_BALL_DRIBBLING: {
    stage: TEACH,
    equipment: ['2 balls'],
    players: 1,
    coachingPoints: [
      'The weak hand sets the standard — go at the pace your worse hand can actually hold.',
      'Eyes up. The whole purpose is dribbling without looking.',
    ],
    commonMistakes: ['Letting the strong hand carry the drill so the weak hand never leaves its comfort zone.'],
    gameTransfer:
      'Ambidexterity and eyes-up handling. An overload drill — pair it with live work so the handle meets a defender.',
  },

  // ─── Physical ──────────────────────────────────────────────────────────────
  // Conditioning is genuinely closed work. Attaching invented "reads" to a wall
  // sit would be worse than leaving them off, so these carry coaching points and
  // an honest game-transfer line instead.
  DEFENSIVE_SLIDES: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: [
      'Push off the trail foot; do not pull yourself sideways with the lead foot.',
      'Feet never touch. The moment they click together you have lost the ability to change direction.',
      'Chest up and hands active — sliding with your head down means you cannot see the ball.',
    ],
    commonMistakes: [
      'Rising out of the stance as fatigue arrives, which is exactly when games test it.',
      'Crossing the feet on the change of direction.',
    ],
    gameTransfer: 'Containing the ball on the perimeter, and the recovery slide after any help rotation.',
  },
  SPRINTS: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: [
      'Accelerate through the line rather than to it.',
      'Basketball speed is repeat speed — the recovery interval matters as much as the sprint.',
    ],
    commonMistakes: ['Even-paced running, which trains a tempo basketball never uses.'],
    gameTransfer: 'Sprinting the floor in transition on both ends, repeatedly, late in a game.',
  },
  JUMP_ROPE: {
    stage: TEACH,
    equipment: ['Jump rope'],
    players: 1,
    coachingPoints: ['Stay on the balls of the feet with short ground contacts.', 'Quiet landings — noise is wasted force.'],
    commonMistakes: ['Jumping high instead of fast, which trains the wrong quality entirely.'],
    gameTransfer: 'Foot speed and elastic strength underneath closeouts, slides and second jumps.',
  },
  WALL_SITS: {
    stage: TEACH,
    equipment: ['Wall'],
    players: 1,
    coachingPoints: ['Thighs parallel to the floor.', 'Breathe normally — holding your breath shortens the hold, not the effort.'],
    commonMistakes: ['Sliding up as it gets hard, which is the moment the exercise starts working.'],
    gameTransfer: 'Isometric endurance for holding a defensive stance through a long possession.',
  },
  SUICIDE_DRILLS: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: ['Touch the line with a hand and drop your hips — the turn is the conditioning, not the run.', 'Both directions, so you decelerate off each foot.'],
    commonMistakes: ['Rounding the turns to save time, which removes the deceleration the drill exists for.'],
    gameTransfer: 'Repeated change of direction, which is what basketball conditioning actually consists of.',
  },
  BOX_JUMPS: {
    stage: TEACH,
    equipment: ['Plyo box'],
    players: 1,
    coachingPoints: ['Land softly with knees tracking over the toes.', 'Step down, never jump down — landing volume is where the injuries live.'],
    commonMistakes: ['Chasing box height by tucking the knees, which measures flexibility rather than power.'],
    gameTransfer: 'First-jump explosiveness for rebounding and finishing at the rim.',
  },
  BURPEES: {
    stage: TEACH,
    equipment: [],
    players: 1,
    coachingPoints: ['Keep a consistent rhythm rather than sprinting the first ten and stalling.'],
    commonMistakes: ['Letting the hips sag in the plank position once tired.'],
    gameTransfer: 'Getting off the floor quickly after a charge, a loose ball or a rebound in traffic.',
  },
  LADDER_DRILLS: {
    stage: TEACH,
    equipment: ['Agility ladder'],
    players: 1,
    coachingPoints: ['Short, fast ground contacts with the eyes up.', 'Accuracy before speed — hitting every box slowly beats missing boxes quickly.'],
    commonMistakes: [
      'Treating the ladder as an end in itself. It develops foot cadence; it does not develop defense.',
    ],
    gameTransfer:
      'Foot cadence that supports closeouts and slides. Pair it with a live defensive drill in the same session.',
  },

  // ─── Defense ───────────────────────────────────────────────────────────────
  CLOSEOUT_DRILL: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner'],
    players: 2,
    reads: [
      'Can the man you are closing out to shoot it, or does he need the dribble to hurt you?',
      'Where is your help — is the baseline side protected, or the middle?',
    ],
    decisions: [
      'Shooter with a slow first step: close out high and long, concede the drive toward help.',
      'Driver who cannot shoot: close out short and stay in a stance.',
      'Either way: close out to the shoulder that sends him toward your help, not away from it.',
    ],
    coachingPoints: [
      'Sprint the first two thirds, chop the last third. Speed then control.',
      'High hand on a shooter is a deterrent; two hands down on a driver is a stance.',
    ],
    commonMistakes: [
      'One closeout technique used against every opponent, which is how defenders fly at non-shooters and drift at shooters.',
      'Leaving your feet, which turns a shot fake into three free throws.',
    ],
    gameTransfer:
      'Every kick-out you have to defend — see the "Closing Out to a Shooter" scenario for the personnel read.',
  },
  ZIGZAG_DEFENSE: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner'],
    players: 2,
    reads: [
      'Is the ball handler pushing at speed, or setting you up for a change of direction?',
      'Which hand is the ball in, and is the sideline available to you as a second defender?',
    ],
    decisions: [
      'Handler at speed: give ground and stay in front rather than reaching.',
      'Handler slowing to set up a move: close the gap and take away the space he is trying to create.',
    ],
    coachingPoints: [
      'Beat him to the spot rather than reacting to the ball.',
      'Use the sideline — force him toward it instead of letting him work back to the middle.',
    ],
    commonMistakes: [
      'Reaching at the ball, which stands you up and gives up the angle.',
      'Sliding without any intention of forcing a direction, which is footwork without a plan.',
    ],
    gameTransfer: 'Point-of-attack containment in the half court and defending the ball in transition.',
  },
  SHELL_DRILL: {
    stage: LIVE,
    equipment: ['Ball', '3-4 partners'],
    players: 'Small group',
    reads: [
      'Where is the ball, and are you one pass away or two?',
      'Is the rim protected behind you — which decides whether you stunt or fully commit?',
      'On penetration: are you the low man, or are you the man who has to cover the low man?',
    ],
    decisions: [
      'One pass away with the ball live: sit in the gap and be ready to stunt.',
      'Two passes away: sink to the nail and see both the ball and your man.',
      'Baseline drive: if you are the low man, take the rim and let the perimeter x-out behind you.',
    ],
    coachingPoints: [
      'Talk on every pass. A shell drill without communication is five people doing individual footwork.',
      'Jump to the ball on the pass — position is established while the ball is in the air.',
    ],
    commonMistakes: [
      'Watching the ball instead of seeing the ball and your man in one field of vision.',
      'Helping from the wrong place — the nearest defender is not automatically the correct helper.',
    ],
    gameTransfer:
      'The whole of half-court team defense. This is the drill that maps directly onto the low-man and stunt scenarios.',
  },
  MIRROR_DRILL: {
    stage: RANDOM_READ,
    equipment: ['Partner'],
    players: 2,
    reads: ['Which foot did he push off, and where are his hips pointed?'],
    decisions: ['React to the hips, not the ball or the shoulders — shoulders and eyes lie, hips do not.'],
    coachingPoints: [
      'Move on his first movement, not after his second.',
      'Stay in a stance the whole rep. The value is in the accumulated time in the stance.',
    ],
    commonMistakes: ['Guessing and pre-moving, which looks fast and gets beaten by any change of direction.'],
    gameTransfer: 'Staying attached to a live ball handler who is changing direction to lose you.',
  },
  CHARGE_DRILL: {
    stage: GUIDED_READ,
    equipment: ['Partner', 'Mat (recommended)'],
    players: 2,
    reads: [
      'Are you legally set with both feet down before he begins his upward motion?',
      'Is the rim already protected, or are you the only thing between the ball and the basket?',
    ],
    decisions: [
      'Set and outside the restricted area: take the charge.',
      'Late, or inside the restricted area: contest with verticality instead.',
    ],
    coachingPoints: [
      'Get there early and stop moving. A charge is won before contact, not during it.',
      'Absorb and fall backwards, not sideways.',
    ],
    commonMistakes: [
      'Sliding into position at the last moment, which is a blocking foul and a three-point play.',
      'Taking charges inside the restricted area where they cannot be called.',
    ],
    gameTransfer: 'Help-side rim protection when you cannot contest the shot vertically in time.',
  },
  DENY_DEFENSE: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner'],
    players: 2,
    reads: [
      'Is your man trying to come toward the ball, or setting you up to go backdoor?',
      'Can you see both your man and the ball, or have you turned your head to one of them?',
    ],
    decisions: [
      'Man coming toward the ball: stay in the passing lane and deny the catch.',
      'Man setting up a back cut: open up and beat him to the rim rather than reaching for the deny.',
    ],
    coachingPoints: [
      'Hand in the passing lane, thumb down, with your body angled to see ball and man at once.',
      'A deny that cannot see the ball is a back cut waiting to happen.',
    ],
    commonMistakes: [
      'Face-guarding, which takes away the pass and gives away the basket.',
      'Denying so hard that a simple back cut beats you every time.',
    ],
    gameTransfer:
      'Ball-denial defense one pass away — and it is the drill that teaches the mistake exploited in the "Beating a Top-Lock" scenario.',
  },
  POST_DEFENSE: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner'],
    players: 2,
    reads: [
      'Where is the ball — above the free-throw line, on the wing, or on the baseline?',
      'Which shoulder does he prefer, and where is his help coming from?',
    ],
    decisions: [
      'Ball above the free-throw line: play behind and deny the high-side entry.',
      'Ball on the wing: three-quarter the top side to make the entry a lob.',
      'Ball on the baseline: front him, because the help behind is the weak-side rotation.',
    ],
    coachingPoints: [
      'Beat him to the spot on the way down the floor rather than fighting him once he arrives.',
      'Hands high and vertical on the shot; hands down on the catch to avoid cheap fouls.',
    ],
    commonMistakes: [
      'Fronting with no weak-side help behind you, which turns a post-up into a lob dunk.',
      'Fouling on the catch, which gives up position and a free throw at once.',
    ],
    gameTransfer: 'Defending post-ups and seals, and knowing which coverage the ball position dictates.',
  },

  // ─── Passing ───────────────────────────────────────────────────────────────
  CHEST_PASS: {
    stage: TEACH,
    equipment: ['Ball', 'Partner'],
    players: 2,
    coachingPoints: [
      'Step into the pass and finish with thumbs down.',
      'Pass to the target hand, not to the body — the receiver should not have to reach.',
    ],
    commonMistakes: ['Passing to where a teammate is rather than where he is going.'],
    gameTransfer: 'The default perimeter pass in ball reversal and drive-and-kick.',
  },
  BOUNCE_PASS: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner'],
    players: 2,
    reads: ['Where are the defender\'s hands — high in the passing lane, or low?'],
    decisions: [
      'Hands high: bounce it underneath them.',
      'Hands low or a long distance to cover: use a chest or overhead pass instead.',
    ],
    coachingPoints: ['Bounce it about two thirds of the way to the receiver so it arrives at waist height.'],
    commonMistakes: ['Bouncing long passes, which gives every help defender time to arrive.'],
    gameTransfer: 'Feeding the roller and the post through a defender with active hands.',
  },
  OUTLET_PASS: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner'],
    players: 2,
    reads: ['Is a teammate already ahead of the ball, or is the outlet the fastest way to start the break?'],
    decisions: [
      'Teammate running ahead: throw it ahead rather than to the sideline.',
      'Nobody ahead: outlet to the sideline and let the break build.',
    ],
    coachingPoints: ['Turn to the outside on the rebound and look up the floor before you land your pivot.'],
    commonMistakes: ['Dribbling out of the rebound, which surrenders the numbers advantage before it exists.'],
    gameTransfer: 'The first pass of every transition opportunity — the one that creates the 3-on-2.',
  },
  OVERHEAD_PASS: {
    stage: TEACH,
    equipment: ['Ball', 'Partner'],
    players: 2,
    coachingPoints: ['Keep the ball above the forehead so it cannot be raked down by a defender.'],
    commonMistakes: ['Winding up behind the head, which telegraphs the pass and invites the steal.'],
    gameTransfer: 'Skip passes and outlets over the top of a zone or a rotating defense.',
  },
  BEHIND_BACK_PASS: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner'],
    players: 2,
    reads: ['Is a defender in the direct line of the pass, so the angle genuinely requires going around him?'],
    decisions: [
      'Defender in the lane and no simpler angle: use it.',
      'Simple angle available: use it instead — the flashy pass has a lower completion rate for no extra return.',
    ],
    coachingPoints: ['It is a tool for solving an angle, not a decoration on a pass you could already make.'],
    commonMistakes: ['Using it when a chest pass was open, which is a turnover with extra steps.'],
    gameTransfer: 'Delivering a drive-and-kick pass when a help defender sits directly in the passing line.',
  },
  NO_LOOK_PASS: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner'],
    players: 2,
    reads: ['Is the defender reading your eyes, and is your teammate already in the spot you are throwing to?'],
    decisions: [
      'Defender keying on your eyes: look him off and deliver away from your gaze.',
      'Receiver still moving or not yet in position: look at the target instead.',
    ],
    coachingPoints: ['You still have to have SEEN it — a no-look pass is a delayed look, not a blind throw.'],
    commonMistakes: ['Throwing to a spot you never actually confirmed a teammate had reached.'],
    gameTransfer: 'Moving a help defender with your eyes before delivering to the open man.',
  },
  ENTRY_PASS: {
    stage: GUIDED_READ,
    equipment: ['Ball', 'Partner'],
    players: 2,
    reads: [
      'Is the post defender playing behind, three-quartering the top side, or fronting?',
      'Which hand is the post player calling for, and does the defender\'s position agree with it?',
    ],
    decisions: [
      'Defender behind: bounce pass to the target hand away from him.',
      'Defender three-quartering the top: change your angle with a dribble before passing.',
      'Defender fronting: lob it over the top, but only if weak-side help is not sitting in the lane.',
    ],
    coachingPoints: [
      'Improve the passing angle with a dribble before you throw. Most bad entries are bad angles, not bad passes.',
    ],
    commonMistakes: [
      'Throwing a lob into a fronted post with a help defender waiting behind it.',
      'Passing from the top of the key, the hardest possible entry angle.',
    ],
    gameTransfer: 'Post entries and feeding a sealing big — the pass that punishes a defense for fronting.',
  },

  // ─── Decision-training drills ──────────────────────────────────────────────
  // These are the drills the catalog was missing entirely: work where a defender
  // supplies information and the player's job is to perceive it before acting.
  CLOSEOUT_ATTACK_READS: {
    stage: RANDOM_READ,
    equipment: ['Ball', 'Hoop', 'Partner'],
    players: 2,
    reads: [
      'How fast is the closeout arriving, and is the defender still moving when he gets there?',
      'Which shoulder is he closing out to?',
      'Is he high with a hand up, or low in a stance?',
    ],
    decisions: [
      'Short and under control: shoot it.',
      'Long and fast: shot fake and drive past his momentum.',
      'To one shoulder: drive the side he left open.',
    ],
    coachingPoints: [
      'Your partner must vary the closeout randomly. If you know what is coming, this is a shooting drill wearing a decision drill\'s name.',
      'Score the read separately from the result — a correct read that missed is a good rep.',
    ],
    commonMistakes: [
      'Deciding what to do before the ball arrives.',
      'A partner who closes out the same way every time, which quietly turns Random Read back into Teach.',
    ],
    gameTransfer:
      'Every catch off a drive-and-kick. Pairs directly with the "Reading the Closeout" SimCoach scenario.',
  },
  SHOOT_OR_DRIVE: {
    stage: LIVE,
    equipment: ['Ball', 'Hoop', 'Partner'],
    players: 2,
    reads: [
      'Is the defender up on the catch or sagging into the gap?',
      'Has he taken away the shot or the drive — he cannot have both.',
    ],
    decisions: ['Up on you: drive.', 'Sagging off: shoot.', 'Neither committed: attack and make him choose.'],
    coachingPoints: [
      'The defender is playing live and trying to win, so the read changes every rep.',
      'Keep a decision log, not just a shooting percentage.',
    ],
    commonMistakes: ['Having a preferred answer and using it regardless of what the defender gives.'],
    gameTransfer: 'The first decision on nearly every catch you make above the break.',
  },
  ADVANTAGE_FINISHING: {
    stage: RANDOM_READ,
    equipment: ['Ball', 'Hoop', '2 partners'],
    players: 3,
    reads: [
      'Has the rim protector committed to you, or is he still splitting you and your teammate?',
      'Is your dribble still alive?',
    ],
    decisions: [
      'He steps up to you: deliver the pass late, after he has committed.',
      'He stays with your teammate: finish it yourself.',
      'He has not committed: keep attacking — do not pass yet.',
    ],
    coachingPoints: [
      'The rule is one sentence: do not pick up your dribble before the defender picks a man.',
      'Late passes beat early ones. An early pass lets one defender guard both of you.',
    ],
    commonMistakes: [
      'Passing on arrival at the paint out of habit, which converts a 2-on-1 into a contested layup.',
      'Driving into the defender with the dribble already dead.',
    ],
    gameTransfer:
      'Every transition advantage. This is the drill behind the "Making the Tandem Commit" scenario.',
  },
  BALL_SCREEN_READS: {
    stage: RANDOM_READ,
    equipment: ['Ball', 'Hoop', '2 partners'],
    players: 3,
    reads: [
      'Did the on-ball defender go over, go under, or jump to the top side?',
      'Where is the screener\'s defender — at the level, dropped, or blitzing?',
      'Has the low man left his man to tag the roller?',
    ],
    decisions: [
      'Drop: attack the space or take the pull-up.',
      'Under: shoot behind the screen.',
      'Blitz: hit the short roll and let him play 4-on-3.',
      'Switch: attack the mismatch before the help loads.',
      'ICE: attack the big\'s baseline shoulder and hit the screener in the middle.',
    ],
    coachingPoints: [
      'Call the coverage aloud for the first block of reps, then hide it. Naming it is what proves you saw it.',
      'Every coverage concedes something. Say what it gave you before you take it.',
    ],
    commonMistakes: [
      'Running the same answer against every coverage.',
      'Treating the ball screen as a two-man action and never reading the low man.',
    ],
    gameTransfer:
      'The most common half-court action in basketball. Maps onto all five ball-screen SimCoach scenarios.',
  },
  ONE_ON_ONE_LIVE: {
    stage: COMPETITIVE,
    equipment: ['Ball', 'Hoop', 'Partner'],
    players: 2,
    reads: [
      'How is he closing out, and which direction has he given you?',
      'With only two dribbles available, is the first move going to get you all the way there?',
    ],
    decisions: [
      'Closeout arriving fast: attack immediately off the catch.',
      'Closeout under control: use the first dribble to move him, the second to finish.',
    ],
    coachingPoints: [
      'The two-dribble limit is the point. It forces the first move to be the correct one rather than the first of five.',
      'Starting from a closeout rather than a standstill is what makes it a game rep.',
    ],
    commonMistakes: ['Removing the constraint when it gets frustrating, which turns it back into an iso drill.'],
    gameTransfer: 'Attacking a closeout in a real possession, where you rarely get more than two dribbles.',
  },
  TWO_ON_TWO_ADVANTAGE: {
    stage: COMPETITIVE,
    equipment: ['Ball', 'Hoop', '3 partners'],
    players: 'Small group',
    reads: [
      'Is the help defender committing to the ball or staying with his man?',
      'Once you touch the paint, which defender moved?',
    ],
    decisions: [
      'Help commits: kick to the open man.',
      'Help stays home: finish it.',
      'Neither: keep the ball moving until one of them has to choose.',
    ],
    coachingPoints: [
      'The scoring constraint does the coaching. Two points for a basket after a paint touch makes the behaviour worth more than the instruction would.',
      'Play from a live start so nobody gets a free set-up.',
    ],
    commonMistakes: ['Forcing a paint touch that is not there just to earn the bonus, which is gaming the constraint rather than learning from it.'],
    gameTransfer: 'Two-man game decisions and the help-side reads that decide whether a drive becomes a kick.',
  },
  TRANSITION_DECISIONS: {
    stage: RANDOM_READ,
    equipment: ['Ball', 'Hoop', '3-4 partners'],
    players: 'Small group',
    reads: [
      'Are you actually in an advantage, and how long will it last?',
      'Has the front defender committed to the ball or is he still splitting?',
      'Is anyone ahead of the ball?',
    ],
    decisions: [
      'Numbers advantage: attack a defender until he commits, then pass.',
      'No advantage: pull it out rather than forcing a bad shot into a set defense.',
    ],
    coachingPoints: [
      'The turnover and the early jump shot are both losses. Score them the same way.',
      'Throw the pass ahead when someone is ahead of the ball — that is how the advantage grows.',
    ],
    commonMistakes: [
      'Passing before any defender has committed.',
      'Attacking a 3-on-3 as though it were a 3-on-2.',
    ],
    gameTransfer: 'Every fast break decision, and knowing when the break is over.',
  },
  PASSING_UNDER_PRESSURE: {
    stage: LIVE,
    equipment: ['Ball', 'Partner', 'Defender'],
    players: 3,
    reads: ['Where are the defender\'s hands, and is his body actually in the passing line?'],
    decisions: [
      'Hands high: bounce it underneath.',
      'Hands low: throw it over the top.',
      'Body in the line: change the angle with a dribble before passing.',
    ],
    coachingPoints: [
      'Move the angle before you change the pass. Most turnovers are bad angles rather than bad technique.',
      'Pass to the hand furthest from the defender.',
    ],
    commonMistakes: ['Throwing the pass you planned instead of the one the defender left open.'],
    gameTransfer: 'Feeding the roller, entering the post, and any kick-out with a help defender in the lane.',
  },
  HELP_AND_RECOVER: {
    stage: LIVE,
    equipment: ['Ball', 'Hoop', '5 partners'],
    players: 'Small group',
    reads: [
      'Is the rim protected behind you — which is what decides stunt versus commit?',
      'Are you the low man on this drive, or the man covering the low man?',
      'Has your man lifted or relocated while you were helping?',
    ],
    decisions: [
      'Rim protected and a shooter to guard: stunt and recover.',
      'Rim unprotected: fully commit and let the next defender x-out.',
      'Baseline drive and you are the low man: take the rim.',
    ],
    coachingPoints: [
      'Call the rotation out loud. Silent help is how two defenders guard the same man.',
      'Recover to the man who is now open, not the man you started on.',
    ],
    commonMistakes: [
      'Helping from one pass away when the correct helper was the low man.',
      'Over-helping so far that the recovery closeout can never be made.',
    ],
    gameTransfer:
      'Live half-court team defense. Directly trains the "Stunt or Commit?" and "Baseline Drive" scenarios.',
  },
  CUTTING_READS: {
    stage: RANDOM_READ,
    equipment: ['Ball', 'Hoop', '2 partners'],
    players: 3,
    reads: [
      'Is the defender denying over the top, trailing you, or shooting the gap?',
      'Where is his head turned — can he see you and the ball at once?',
    ],
    decisions: [
      'Denying over the top: back-cut behind him.',
      'Trailing: come off the screen and catch for the shot.',
      'Shooting the gap: curl or flare away from where he went.',
    ],
    coachingPoints: [
      'Set the cut up. A cut at one speed from a standstill gives the defender nothing to react to.',
      'Read him before the screen arrives, not after.',
    ],
    commonMistakes: [
      'Running the route you planned regardless of how you are being guarded.',
      'Cutting into space a teammate is already occupying.',
    ],
    gameTransfer:
      'Getting open off the ball, which is how most players actually receive the ball. Pairs with "Beating a Top-Lock".',
  },
};
