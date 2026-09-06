// Workout templates for custom workout creation
import { SUBSCRIPTION_TIERS } from '../utils/subscription';
import { DRILL_INTELLIGENCE, TRAINING_STAGES, STAGE_ORDER } from './drillIntelligence';

export const WORKOUT_CATEGORIES = {
  SHOOTING: 'Shooting',
  DRIBBLING: 'Dribbling',
  PHYSICAL: 'Physical',
  DEFENSE: 'Defense',
  PASSING: 'Passing',
  CUSTOM: 'Custom',
};

export const WORKOUT_DIFFICULTIES = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
};

// Predefined step templates that users can add to their workouts
// `tracker` is the structured replacement for the drill-name string-sniffing that
// three separate places used to do independently (the pose movement registry, the
// shooting-UI check in ActiveWorkoutScreen, and the SPS mapper). Values:
//   'shooting'                       -> makes/misses UI; SPS shooting input
//   'crossover'|'pound'|'two_ball'|'slide' -> the live pose rep detector to use
//   (absent)                         -> manual rep entry
// Keyword matching remains as a fallback so user-authored custom workouts, which
// have no tracker field, still behave exactly as before.
const BASE_STEP_TEMPLATES = {
  // Shooting steps
  FORM_SHOOTING: {
    name: 'Form Shooting',
    category: WORKOUT_CATEGORIES.SHOOTING,
    tracker: 'shooting',
    description: 'Focus on shooting form close to the basket',
    duration: 300, // 5 minutes
    reps: 20,
    instructions: [
      'Stand 5 feet from the basket',
      'Focus on proper shooting form',
      'Follow through on each shot',
      'Aim for consistent arc',
    ],
  },
  FREE_THROWS: {
    name: 'Free Throws',
    category: WORKOUT_CATEGORIES.SHOOTING,
    tracker: 'shooting',
    description: 'Practice free throw shooting',
    duration: 300,
    reps: 25,
    instructions: [
      'Take your position at the free throw line',
      'Use consistent routine before each shot',
      'Focus on arc and follow-through',
      'Maintain rhythm between shots',
    ],
  },
  THREE_POINTERS: {
    name: 'Three-Point Shooting',
    category: WORKOUT_CATEGORIES.SHOOTING,
    tracker: 'shooting',
    description: 'Practice shooting from beyond the arc',
    duration: 600,
    reps: 30,
    instructions: [
      'Move around the three-point line',
      'Shoot from 5 different spots',
      'Focus on leg power and balance',
      'Quick release on each shot',
    ],
  },
  SPOT_SHOOTING: {
    name: 'Spot Shooting',
    category: WORKOUT_CATEGORIES.SHOOTING,
    tracker: 'shooting',
    description: 'Shoot from designated spots around the court',
    duration: 480,
    reps: 50,
    instructions: [
      'Mark 5 spots around the perimeter',
      'Make 10 shots from each spot',
      'Move quickly between spots',
      'Maintain shooting form throughout',
    ],
  },
  MID_RANGE_SHOOTING: {
    name: 'Mid-Range Mastery',
    category: WORKOUT_CATEGORIES.SHOOTING,
    tracker: 'shooting',
    description: 'Develop consistent mid-range jump shots',
    duration: 420,
    reps: 40,
    instructions: [
      'Start at the elbow',
      'Practice pull-up jumpers from 10-15 feet',
      'Work both sides of the court',
      'Focus on footwork and balance',
    ],
  },
  CATCH_AND_SHOOT: {
    name: 'Catch and Shoot',
    category: WORKOUT_CATEGORIES.SHOOTING,
    tracker: 'shooting',
    description: 'Practice quick release off the catch',
    duration: 360,
    reps: 35,
    instructions: [
      'Simulate receiving a pass',
      'Quick catch with feet ready',
      'Immediate shot preparation',
      'Follow through on every shot',
    ],
  },
  // Feeds `movementShootingPct`, which carries 25% of the SPS pillar. Until this
  // drill existed no workout produced that input, so shooting coverage was capped
  // at 75% for every player — a content gap, not a measurement failure. The `name`
  // is load-bearing: inputMappers.STEP_TITLE_TO_SHOT keys on the exact string.
  MOVEMENT_SHOOTING: {
    name: 'Movement Shooting',
    category: WORKOUT_CATEGORIES.SHOOTING,
    tracker: 'shooting',
    description: 'Shoot coming off movement — curls, flares and relocations',
    duration: 360, // 6 minutes
    reps: 20,
    instructions: [
      'Start from the corner and sprint off an imaginary screen',
      'Square your feet and shoulders to the rim as you catch',
      'Alternate curling to the middle and flaring to the wing',
      'Reset to the corner after every shot — no stationary reps',
    ],
  },
  OFF_DRIBBLE_SHOOTING: {
    name: 'Off the Dribble',
    category: WORKOUT_CATEGORIES.SHOOTING,
    tracker: 'shooting',
    description: 'Shooting after dribble moves',
    duration: 480,
    reps: 30,
    instructions: [
      'Take 1-2 dribbles before shooting',
      'Practice step-back and pull-up shots',
      'Create your own shot',
      'Maintain balance throughout',
    ],
  },

  // Dribbling steps
  STATIONARY_DRIBBLING: {
    name: 'Stationary Dribbling',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    tracker: 'pound',
    description: 'Practice ball handling in place',
    duration: 300,
    reps: 50,
    instructions: [
      'Dribble low and hard',
      'Alternate between hands',
      'Keep eyes up',
      'Vary dribble speed and height',
    ],
  },
  CROSSOVERS: {
    name: 'Crossover Dribbles',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    tracker: 'crossover',
    description: 'Practice crossover moves',
    duration: 300,
    reps: 40,
    instructions: [
      'Start with ball in right hand',
      'Quick crossover to left hand',
      'Stay low in athletic stance',
      'Explode after each crossover',
    ],
  },
  CONE_DRIBBLING: {
    name: 'Cone Dribbling',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    description: 'Dribble through cone course',
    duration: 420,
    reps: 10,
    instructions: [
      'Set up 5-7 cones in a line',
      'Weave through cones using both hands',
      'Keep head up throughout',
      'Time yourself for improvement',
    ],
  },
  BETWEEN_LEGS: {
    name: 'Between the Legs',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    description: 'Practice between-the-legs dribble moves',
    duration: 240,
    reps: 30,
    instructions: [
      'Dribble ball between legs',
      'Alternate directions',
      'Maintain low stance',
      'Combine with forward movement',
    ],
  },
  BEHIND_THE_BACK: {
    name: 'Behind the Back',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    description: 'Master behind-the-back dribble moves',
    duration: 300,
    reps: 35,
    instructions: [
      'Wrap ball behind your back',
      'Maintain control throughout',
      'Practice both stationary and on the move',
      'Keep head up, eyes forward',
    ],
  },
  SPEED_DRIBBLE: {
    name: 'Speed Dribbling',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    description: 'Develop fast break ball handling',
    duration: 300,
    reps: 15,
    instructions: [
      'Sprint full court with ball',
      'Push ball out in front',
      'Take long strides',
      'Maintain control at high speed',
    ],
  },
  TWO_BALL_DRIBBLING: {
    name: 'Two Ball Dribbling',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    tracker: 'two_ball',
    description: 'Advanced ball handling with two basketballs',
    duration: 360,
    reps: 40,
    instructions: [
      'Dribble two balls simultaneously',
      'Try alternating and synchronized patterns',
      'Practice crossovers with both balls',
      'Challenges coordination and control',
    ],
  },

  // Physical/Conditioning steps
  DEFENSIVE_SLIDES: {
    name: 'Defensive Slides',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    tracker: 'slide',
    description: 'Lateral defensive movement drills',
    duration: 180,
    reps: 20,
    instructions: [
      'Start in defensive stance',
      'Slide side to side across the lane',
      'Keep low, don\'t cross feet',
      'Touch the line on each side',
    ],
  },
  SPRINTS: {
    name: 'Court Sprints',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    description: 'Full court sprint conditioning',
    duration: 300,
    reps: 10,
    instructions: [
      'Sprint baseline to baseline',
      'Touch each line',
      'Sprint at maximum effort',
      'Rest 30 seconds between sprints',
    ],
  },
  JUMP_ROPE: {
    name: 'Jump Rope',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    description: 'Footwork and conditioning with jump rope',
    duration: 300,
    reps: 1,
    instructions: [
      'Maintain steady rhythm',
      'Stay on balls of feet',
      'Keep jumps low and quick',
      'Breathe consistently',
    ],
  },
  WALL_SITS: {
    name: 'Wall Sits',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    description: 'Build leg strength and endurance',
    duration: 180,
    reps: 3,
    instructions: [
      'Back against wall, slide down to 90 degrees',
      'Hold position for 60 seconds',
      'Keep core engaged',
      'Rest 30 seconds between sets',
    ],
  },
  SUICIDE_DRILLS: {
    name: 'Suicide Drills',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    description: 'Intense conditioning and agility training',
    duration: 420,
    reps: 8,
    instructions: [
      'Sprint to free throw line and back',
      'Continue to half court and back',
      'Then to opposite free throw line and back',
      'Finally baseline to baseline',
    ],
  },
  BOX_JUMPS: {
    name: 'Box Jumps',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    description: 'Explosive power and vertical jump training',
    duration: 300,
    reps: 20,
    instructions: [
      'Find a stable box or platform',
      'Jump explosively onto the box',
      'Land softly, step down',
      'Focus on explosive power from legs',
    ],
  },
  BURPEES: {
    name: 'Basketball Burpees',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    description: 'Full body conditioning with basketball twist',
    duration: 240,
    reps: 15,
    instructions: [
      'Start in standing position',
      'Drop to push-up position',
      'Jump back up and perform a vertical jump',
      'Simulate grabbing a rebound at the top',
    ],
  },
  LADDER_DRILLS: {
    name: 'Agility Ladder',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    description: 'Footwork and agility training',
    duration: 360,
    reps: 10,
    instructions: [
      'Use agility ladder or mark spaces on ground',
      'Practice various footwork patterns',
      'Quick feet, light touches',
      'Maintain athletic posture',
    ],
  },

  // Defense steps
  CLOSEOUT_DRILL: {
    name: 'Closeout Drill',
    category: WORKOUT_CATEGORIES.DEFENSE,
    description: 'Practice closing out on shooters',
    duration: 300,
    reps: 15,
    instructions: [
      'Start under the basket',
      'Sprint to three-point line',
      'Break down into defensive stance',
      'Contest imaginary shot with hands up',
    ],
  },
  ZIGZAG_DEFENSE: {
    name: 'Zigzag Defense',
    category: WORKOUT_CATEGORIES.DEFENSE,
    tracker: 'slide',
    description: 'Defensive movement drill',
    duration: 240,
    reps: 10,
    instructions: [
      'Start at baseline in defensive stance',
      'Slide at 45-degree angles up court',
      'Change direction at each line',
      'Maintain low defensive position',
    ],
  },
  SHELL_DRILL: {
    name: 'Shell Drill',
    category: WORKOUT_CATEGORIES.DEFENSE,
    description: 'Practice help defense positioning',
    duration: 360,
    reps: 1,
    instructions: [
      'Set up in help defense positions',
      'Rotate on ball movement',
      'Communicate on switches',
      'Close out hard on shooters',
    ],
  },
  MIRROR_DRILL: {
    name: 'Mirror Drill',
    category: WORKOUT_CATEGORIES.DEFENSE,
    tracker: 'slide',
    description: 'Defensive reaction and movement training',
    duration: 300,
    reps: 12,
    instructions: [
      'Partner faces you as the offensive player',
      'Mirror their movements in defensive stance',
      'Stay low and move your feet',
      'Anticipate direction changes',
    ],
  },
  CHARGE_DRILL: {
    name: 'Charge Taking',
    category: WORKOUT_CATEGORIES.DEFENSE,
    description: 'Learn to take charges safely',
    duration: 240,
    reps: 10,
    instructions: [
      'Establish legal guarding position',
      'Absorb contact with core engaged',
      'Fall safely to protect yourself',
      'Quick recovery after fall',
    ],
  },
  DENY_DEFENSE: {
    name: 'Deny Defense',
    category: WORKOUT_CATEGORIES.DEFENSE,
    description: 'Prevent passes to your opponent',
    duration: 300,
    reps: 15,
    instructions: [
      'Position in passing lane',
      'Hand up to deflect passes',
      'Stay between ball and your player',
      'Active hands, active feet',
    ],
  },
  POST_DEFENSE: {
    name: 'Post Defense',
    category: WORKOUT_CATEGORIES.DEFENSE,
    description: 'Defending the post position',
    duration: 360,
    reps: 12,
    instructions: [
      'Front or three-quarter front the post',
      'Use your body to create positioning',
      'Push opponent away from the basket',
      'Contest all entry passes',
    ],
  },

  // Passing steps
  CHEST_PASS: {
    name: 'Chest Pass',
    category: WORKOUT_CATEGORIES.PASSING,
    description: 'Two-handed chest pass practice',
    duration: 180,
    reps: 30,
    instructions: [
      'Stand 10 feet from wall or partner',
      'Step into each pass',
      'Snap wrists on release',
      'Aim for chest level target',
    ],
  },
  BOUNCE_PASS: {
    name: 'Bounce Pass',
    category: WORKOUT_CATEGORIES.PASSING,
    description: 'Practice bounce pass technique',
    duration: 180,
    reps: 30,
    instructions: [
      'Aim 2/3 of the way to target',
      'Add backspin for better control',
      'Step into pass',
      'Follow through low',
    ],
  },
  OUTLET_PASS: {
    name: 'Outlet Pass',
    category: WORKOUT_CATEGORIES.PASSING,
    description: 'Practice fast break outlet passes',
    duration: 240,
    reps: 20,
    instructions: [
      'Grab rebound, pivot to sideline',
      'Make strong overhead pass',
      'Lead teammate up court',
      'Quick release',
    ],
  },
  OVERHEAD_PASS: {
    name: 'Overhead Pass',
    category: WORKOUT_CATEGORIES.PASSING,
    description: 'Two-handed overhead passing',
    duration: 180,
    reps: 25,
    instructions: [
      'Hold ball above head with both hands',
      'Step forward for power',
      'Snap wrists forward on release',
      'Follow through toward target',
    ],
  },
  BEHIND_BACK_PASS: {
    name: 'Behind the Back Pass',
    category: WORKOUT_CATEGORIES.PASSING,
    description: 'Advanced passing technique',
    duration: 240,
    reps: 20,
    instructions: [
      'Wrap ball behind your back',
      'Use one hand to guide the pass',
      'Practice both left and right sides',
      'Only use in appropriate game situations',
    ],
  },
  NO_LOOK_PASS: {
    name: 'No Look Pass',
    category: WORKOUT_CATEGORIES.PASSING,
    description: 'Deceptive passing drills',
    duration: 300,
    reps: 15,
    instructions: [
      'Use peripheral vision to locate target',
      'Look away from intended receiver',
      'Quick wrist action to deliver ball',
      'Practice timing with a partner',
    ],
  },
  ENTRY_PASS: {
    name: 'Post Entry Pass',
    category: WORKOUT_CATEGORIES.PASSING,
    description: 'Passing to the post position',
    duration: 240,
    reps: 20,
    instructions: [
      'Target the post player\'s outside hand',
      'Use bounce or lob depending on defense',
      'Pass away from defender',
      'Accurate timing is crucial',
    ],
  },

  // ─── Decision-training drills ────────────────────────────────────────────
  // Everything above this line is closed work: a rep count, a movement, and no
  // defender. That is the whole catalog a player had access to, which meant the
  // app could train execution but never the read that tells you when to execute.
  // These require a partner and sit at the Guided Read / Random Read / Live /
  // Competitive end of the progression. See drillIntelligence.js for the reads
  // and decisions attached to each.
  //
  // None of these names appear in inputMappers.STEP_TITLE_TO_SHOT or
  // STEP_TITLE_TO_SKILL, so they add no new evidence to the EvalRank pillars —
  // they are training content, not measurement, and adding them there would be
  // claiming a partner-graded decision as an observed one.
  CLOSEOUT_ATTACK_READS: {
    name: 'Closeout Attack Reads',
    category: WORKOUT_CATEGORIES.SHOOTING,
    tracker: 'shooting',
    description: 'Read the closeout, then choose shoot, drive or attack the angle',
    duration: 480,
    reps: 24,
    instructions: [
      'Partner starts in a help position and passes you the ball',
      'He closes out randomly: short, long, or to one shoulder',
      'Short and controlled means shoot it',
      'Long and fast means shot fake and drive the momentum',
      'To one shoulder means drive the other way',
    ],
  },
  SHOOT_OR_DRIVE: {
    name: 'Shoot or Drive',
    category: WORKOUT_CATEGORIES.SHOOTING,
    tracker: 'shooting',
    description: 'A live defender decides which shot you get',
    duration: 420,
    reps: 20,
    instructions: [
      'Catch on the wing with a defender playing live',
      'If he plays up on the catch, drive past him',
      'If he sags into the gap, shoot it',
      'Score the DECISION, not just the make',
    ],
  },
  ADVANTAGE_FINISHING: {
    name: 'Advantage Finishing',
    category: WORKOUT_CATEGORIES.SHOOTING,
    tracker: 'shooting',
    description: 'Finish 2-on-1 by making the rim protector wrong',
    duration: 480,
    reps: 16,
    instructions: [
      'Start at half court with one teammate against one defender',
      'Attack the defender until he commits to you or to your teammate',
      'If he steps up, deliver the pass late',
      'If he stays with your teammate, finish through the rim',
      'Do not pick up your dribble before he commits',
    ],
  },
  BALL_SCREEN_READS: {
    name: 'Ball Screen Reads',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    description: 'One action, four coverages, four different answers',
    duration: 600,
    reps: 20,
    instructions: [
      'Partner sets a ball screen; a second partner plays the coverage',
      'Coverage is called out at first, then hidden so you have to read it',
      'Drop: take the pull-up or attack the space',
      'Under: shoot behind the screen',
      'Blitz: hit the short roll',
      'Switch: attack the mismatch immediately',
    ],
  },
  ONE_ON_ONE_LIVE: {
    name: 'Live One-on-One',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    description: 'Two dribbles from a closeout, scored by possession',
    duration: 600,
    reps: 10,
    instructions: [
      'Start from a closeout, not a standstill',
      'Maximum two dribbles, so the first move has to be the right one',
      'Play to 5 possessions, then switch',
      'Offense keeps the ball on a score, defense gets it on a stop',
    ],
  },
  TWO_ON_TWO_ADVANTAGE: {
    name: 'Two-on-Two Advantage',
    category: WORKOUT_CATEGORIES.CUSTOM,
    description: 'Small-sided game constrained to reward paint touches',
    duration: 720,
    reps: 8,
    instructions: [
      'Play 2-on-2 in the half court from a live start',
      'A basket that follows a paint touch is worth 2 points',
      'Any other basket is worth 1 point',
      'First to 11 wins, then rotate',
    ],
  },
  TRANSITION_DECISIONS: {
    name: 'Transition Decisions',
    category: WORKOUT_CATEGORIES.PASSING,
    description: '2-on-1 and 3-on-2 breaks decided by when the defender commits',
    duration: 540,
    reps: 14,
    instructions: [
      'Start from a rebound and outlet, wings filled wide',
      'Attack the front defender until he has to choose',
      'Deliver the pass only once he commits',
      'A turnover or a settled jump shot ends the possession',
    ],
  },
  PASSING_UNDER_PRESSURE: {
    name: 'Passing Under Pressure',
    category: WORKOUT_CATEGORIES.PASSING,
    description: 'Pick the pass the defender\'s hands leave open',
    duration: 360,
    reps: 30,
    instructions: [
      'A live defender plays the passing lane between you and your partner',
      'Hands high means bounce it underneath',
      'Hands low means throw over the top',
      'Body in the lane means move the angle with a dribble first',
    ],
  },
  HELP_AND_RECOVER: {
    name: 'Help and Recover',
    category: WORKOUT_CATEGORIES.DEFENSE,
    description: 'Live 3-on-3 stunting, tagging and x-out rotations',
    duration: 720,
    reps: 12,
    instructions: [
      'Play 3-on-3 live in the half court',
      'On any drive, decide in the moment: stunt or fully commit',
      'If you commit, the next defender has to x-out behind you',
      'Talk on every pass and every rotation',
    ],
  },
  CUTTING_READS: {
    name: 'Cutting Reads',
    category: WORKOUT_CATEGORIES.CUSTOM,
    description: 'Let the defender choose your cut for you',
    duration: 420,
    reps: 20,
    instructions: [
      'Start on the wing with a live defender guarding you off the ball',
      'If he denies over the top, back-cut behind him',
      'If he trails you, come off the screen and catch',
      'If he shoots the gap, curl or flare away from where he went',
    ],
  },
};

// Each step carries its own read/decision layer, merged on at load. Keeping the
// basketball content in drillIntelligence.js means the templates above stay a
// plain, reviewable list of names/durations/reps — and, critically, that every
// `name` string stays byte-identical, because inputMappers.STEP_TITLE_TO_SHOT,
// STEP_TITLE_TO_SKILL and the pose movement registry all key on them.
//
// The merge is additive and one-directional: nothing here can remove or overwrite
// a field the template already declares. A template with no entry in the
// intelligence map passes through untouched, which is also what happens to every
// user-authored custom workout — those have never had these fields and still
// render exactly as before.
const withIntelligence = (template, key) => {
  const intel = DRILL_INTELLIGENCE[key];
  if (!intel) return template;
  return { ...intel, ...template, templateKey: key };
};

export const STEP_TEMPLATES = Object.fromEntries(
  Object.entries(BASE_STEP_TEMPLATES).map(([key, template]) => [key, withIntelligence(template, key)])
);

export { TRAINING_STAGES, STAGE_ORDER };

/** Steps that develop a read rather than only a movement. */
export const getDecisionTrainingSteps = () =>
  Object.values(STEP_TEMPLATES).filter((s) => Array.isArray(s.reads) && s.reads.length > 0);

/** Steps at a given point in the Teach -> Competitive progression. */
export const getStepTemplatesByStage = (stage) =>
  Object.values(STEP_TEMPLATES).filter((s) => s.stage === stage);

// Complete workout templates users can use as starting points
export const WORKOUT_TEMPLATES = {
  // SHOOTING WORKOUTS (6 total - 2 FREE, 2 BASIC, 1 PREMIUM, 1 PRO)
  BEGINNER_SHOOTING: {
    id: 'shooting_1',
    name: 'Beginner Shooting Basics',
    category: WORKOUT_CATEGORIES.SHOOTING,
    difficulty: WORKOUT_DIFFICULTIES.BEGINNER,
    description: 'Learn fundamental shooting techniques',
    estimatedDuration: 20,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
    steps: [
      STEP_TEMPLATES.FORM_SHOOTING,
      STEP_TEMPLATES.FREE_THROWS,
      STEP_TEMPLATES.SPOT_SHOOTING,
      // Included at the FREE tier deliberately: blueprint360Service.buildCatalogFor
      // filters the plan catalog by subscription, so a drill that only appears in
      // paid workouts would leave every free player's SPS capped at 75% coverage —
      // the precise gap this drill exists to close.
      STEP_TEMPLATES.MOVEMENT_SHOOTING,
    ],
  },
  FREE_THROW_MASTER: {
    id: 'shooting_2',
    name: 'Free Throw Master',
    category: WORKOUT_CATEGORIES.SHOOTING,
    difficulty: WORKOUT_DIFFICULTIES.BEGINNER,
    description: 'Perfect your free throw technique',
    estimatedDuration: 15,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
    steps: [
      STEP_TEMPLATES.FORM_SHOOTING,
      STEP_TEMPLATES.FREE_THROWS,
    ],
  },
  MID_RANGE_SPECIALIST: {
    id: 'shooting_3',
    name: 'Mid-Range Specialist',
    category: WORKOUT_CATEGORIES.SHOOTING,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Develop a deadly mid-range game',
    estimatedDuration: 30,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
    steps: [
      STEP_TEMPLATES.FORM_SHOOTING,
      STEP_TEMPLATES.MID_RANGE_SHOOTING,
      STEP_TEMPLATES.CATCH_AND_SHOOT,
      STEP_TEMPLATES.MOVEMENT_SHOOTING,
      STEP_TEMPLATES.FREE_THROWS,
    ],
  },
  THREE_POINT_SHOOTER: {
    id: 'shooting_4',
    name: 'Three-Point Shooter',
    category: WORKOUT_CATEGORIES.SHOOTING,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Become a consistent three-point threat',
    estimatedDuration: 35,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
    steps: [
      STEP_TEMPLATES.FORM_SHOOTING,
      STEP_TEMPLATES.CATCH_AND_SHOOT,
      STEP_TEMPLATES.THREE_POINTERS,
      STEP_TEMPLATES.FREE_THROWS,
    ],
  },
  ADVANCED_SHOOTING: {
    id: 'shooting_5',
    name: 'Advanced Shooting Workout',
    category: WORKOUT_CATEGORIES.SHOOTING,
    difficulty: WORKOUT_DIFFICULTIES.ADVANCED,
    description: 'High-volume shooting from various spots',
    estimatedDuration: 45,
    requiredTier: SUBSCRIPTION_TIERS.PREMIUM,
    steps: [
      STEP_TEMPLATES.FORM_SHOOTING,
      STEP_TEMPLATES.SPOT_SHOOTING,
      STEP_TEMPLATES.THREE_POINTERS,
      STEP_TEMPLATES.MID_RANGE_SHOOTING,
      STEP_TEMPLATES.MOVEMENT_SHOOTING,
      STEP_TEMPLATES.FREE_THROWS,
    ],
  },
  ELITE_SCORER: {
    id: 'shooting_6',
    name: 'Elite Scorer Training',
    category: WORKOUT_CATEGORIES.SHOOTING,
    difficulty: WORKOUT_DIFFICULTIES.EXPERT,
    description: 'Professional-level shooting workout',
    estimatedDuration: 60,
    requiredTier: SUBSCRIPTION_TIERS.PRO,
    steps: [
      STEP_TEMPLATES.FORM_SHOOTING,
      STEP_TEMPLATES.OFF_DRIBBLE_SHOOTING,
      STEP_TEMPLATES.CATCH_AND_SHOOT,
      STEP_TEMPLATES.THREE_POINTERS,
      STEP_TEMPLATES.MID_RANGE_SHOOTING,
      STEP_TEMPLATES.MOVEMENT_SHOOTING,
      STEP_TEMPLATES.FREE_THROWS,
    ],
  },

  // DRIBBLING WORKOUTS (6 total - 2 FREE, 2 BASIC, 1 PREMIUM, 1 PRO)
  BALL_HANDLING_BASICS: {
    id: 'dribbling_1',
    name: 'Ball Handling Fundamentals',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    difficulty: WORKOUT_DIFFICULTIES.BEGINNER,
    description: 'Master basic dribbling skills',
    estimatedDuration: 25,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
    steps: [
      STEP_TEMPLATES.STATIONARY_DRIBBLING,
      STEP_TEMPLATES.CROSSOVERS,
      STEP_TEMPLATES.BETWEEN_LEGS,
    ],
  },
  QUICK_HANDS: {
    id: 'dribbling_2',
    name: 'Quick Hands',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    difficulty: WORKOUT_DIFFICULTIES.BEGINNER,
    description: 'Develop hand speed and control',
    estimatedDuration: 20,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
    steps: [
      STEP_TEMPLATES.STATIONARY_DRIBBLING,
      STEP_TEMPLATES.CROSSOVERS,
    ],
  },
  COMBO_MOVES: {
    id: 'dribbling_3',
    name: 'Combo Moves',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Chain dribble moves together',
    estimatedDuration: 30,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
    steps: [
      STEP_TEMPLATES.CROSSOVERS,
      STEP_TEMPLATES.BETWEEN_LEGS,
      STEP_TEMPLATES.BEHIND_THE_BACK,
      STEP_TEMPLATES.CONE_DRIBBLING,
    ],
  },
  SPEED_HANDLER: {
    id: 'dribbling_4',
    name: 'Speed Handler',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Fast break ball control',
    estimatedDuration: 25,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
    steps: [
      STEP_TEMPLATES.STATIONARY_DRIBBLING,
      STEP_TEMPLATES.SPEED_DRIBBLE,
      STEP_TEMPLATES.CONE_DRIBBLING,
    ],
  },
  ELITE_HANDLES: {
    id: 'dribbling_5',
    name: 'Elite Ball Handling',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    difficulty: WORKOUT_DIFFICULTIES.ADVANCED,
    description: 'Advanced ball handling combinations',
    estimatedDuration: 35,
    requiredTier: SUBSCRIPTION_TIERS.PREMIUM,
    steps: [
      STEP_TEMPLATES.STATIONARY_DRIBBLING,
      STEP_TEMPLATES.CROSSOVERS,
      STEP_TEMPLATES.BETWEEN_LEGS,
      STEP_TEMPLATES.BEHIND_THE_BACK,
      STEP_TEMPLATES.CONE_DRIBBLING,
    ],
  },
  PRO_BALL_HANDLER: {
    id: 'dribbling_6',
    name: 'Pro Ball Handler',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    difficulty: WORKOUT_DIFFICULTIES.EXPERT,
    description: 'Master every dribbling technique',
    estimatedDuration: 45,
    requiredTier: SUBSCRIPTION_TIERS.PRO,
    steps: [
      STEP_TEMPLATES.TWO_BALL_DRIBBLING,
      STEP_TEMPLATES.CROSSOVERS,
      STEP_TEMPLATES.BETWEEN_LEGS,
      STEP_TEMPLATES.BEHIND_THE_BACK,
      STEP_TEMPLATES.SPEED_DRIBBLE,
      STEP_TEMPLATES.CONE_DRIBBLING,
    ],
  },

  // PHYSICAL WORKOUTS (6 total - 2 FREE, 2 BASIC, 1 PREMIUM, 1 PRO)
  BASIC_CONDITIONING: {
    id: 'physical_1',
    name: 'Basic Conditioning',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    difficulty: WORKOUT_DIFFICULTIES.BEGINNER,
    description: 'Build fundamental fitness',
    estimatedDuration: 20,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
    steps: [
      STEP_TEMPLATES.JUMP_ROPE,
      STEP_TEMPLATES.DEFENSIVE_SLIDES,
      STEP_TEMPLATES.WALL_SITS,
    ],
  },
  CARDIO_BLAST: {
    id: 'physical_2',
    name: 'Cardio Blast',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    difficulty: WORKOUT_DIFFICULTIES.BEGINNER,
    description: 'Heart-pumping cardio workout',
    estimatedDuration: 25,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
    steps: [
      STEP_TEMPLATES.JUMP_ROPE,
      STEP_TEMPLATES.SPRINTS,
      STEP_TEMPLATES.DEFENSIVE_SLIDES,
    ],
  },
  CONDITIONING_WORKOUT: {
    id: 'physical_3',
    name: 'Basketball Conditioning',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Build endurance and explosiveness',
    estimatedDuration: 30,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
    steps: [
      STEP_TEMPLATES.JUMP_ROPE,
      STEP_TEMPLATES.SPRINTS,
      STEP_TEMPLATES.DEFENSIVE_SLIDES,
      STEP_TEMPLATES.WALL_SITS,
    ],
  },
  VERTICAL_JUMP_TRAINER: {
    id: 'physical_4',
    name: 'Vertical Jump Trainer',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Increase your vertical leap',
    estimatedDuration: 35,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
    steps: [
      STEP_TEMPLATES.JUMP_ROPE,
      STEP_TEMPLATES.BOX_JUMPS,
      STEP_TEMPLATES.WALL_SITS,
      STEP_TEMPLATES.BURPEES,
    ],
  },
  ATHLETIC_DEVELOPMENT: {
    id: 'physical_5',
    name: 'Athletic Development',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    difficulty: WORKOUT_DIFFICULTIES.ADVANCED,
    description: 'Complete athleticism training',
    estimatedDuration: 45,
    requiredTier: SUBSCRIPTION_TIERS.PREMIUM,
    steps: [
      STEP_TEMPLATES.LADDER_DRILLS,
      STEP_TEMPLATES.BOX_JUMPS,
      STEP_TEMPLATES.SUICIDE_DRILLS,
      STEP_TEMPLATES.BURPEES,
      STEP_TEMPLATES.WALL_SITS,
    ],
  },
  PRO_ATHLETE_CONDITIONING: {
    id: 'physical_6',
    name: 'Pro Athlete Conditioning',
    category: WORKOUT_CATEGORIES.PHYSICAL,
    difficulty: WORKOUT_DIFFICULTIES.EXPERT,
    description: 'Elite-level physical training',
    estimatedDuration: 60,
    requiredTier: SUBSCRIPTION_TIERS.PRO,
    steps: [
      STEP_TEMPLATES.LADDER_DRILLS,
      STEP_TEMPLATES.BOX_JUMPS,
      STEP_TEMPLATES.SUICIDE_DRILLS,
      STEP_TEMPLATES.BURPEES,
      STEP_TEMPLATES.SPRINTS,
      STEP_TEMPLATES.DEFENSIVE_SLIDES,
    ],
  },

  // DEFENSE WORKOUTS (6 total - 2 FREE, 2 BASIC, 1 PREMIUM, 1 PRO)
  DEFENSIVE_FUNDAMENTALS: {
    id: 'defense_1',
    name: 'Defensive Fundamentals',
    category: WORKOUT_CATEGORIES.DEFENSE,
    difficulty: WORKOUT_DIFFICULTIES.BEGINNER,
    description: 'Learn defensive positioning and movement',
    estimatedDuration: 25,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
    steps: [
      STEP_TEMPLATES.DEFENSIVE_SLIDES,
      STEP_TEMPLATES.CLOSEOUT_DRILL,
      STEP_TEMPLATES.ZIGZAG_DEFENSE,
    ],
  },
  DEFENSE_101: {
    id: 'defense_2',
    name: 'Defense 101',
    category: WORKOUT_CATEGORIES.DEFENSE,
    difficulty: WORKOUT_DIFFICULTIES.BEGINNER,
    description: 'Basic defensive skills',
    estimatedDuration: 20,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
    steps: [
      STEP_TEMPLATES.DEFENSIVE_SLIDES,
      STEP_TEMPLATES.CLOSEOUT_DRILL,
    ],
  },
  PERIMETER_DEFENSE: {
    id: 'defense_3',
    name: 'Perimeter Defense',
    category: WORKOUT_CATEGORIES.DEFENSE,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Guard the perimeter effectively',
    estimatedDuration: 30,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
    steps: [
      STEP_TEMPLATES.CLOSEOUT_DRILL,
      STEP_TEMPLATES.DENY_DEFENSE,
      STEP_TEMPLATES.MIRROR_DRILL,
      STEP_TEMPLATES.DEFENSIVE_SLIDES,
    ],
  },
  POST_DEFENDER: {
    id: 'defense_4',
    name: 'Post Defender',
    category: WORKOUT_CATEGORIES.DEFENSE,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Master post defense techniques',
    estimatedDuration: 30,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
    steps: [
      STEP_TEMPLATES.POST_DEFENSE,
      STEP_TEMPLATES.DEFENSIVE_SLIDES,
      STEP_TEMPLATES.CHARGE_DRILL,
    ],
  },
  LOCKDOWN_DEFENDER: {
    id: 'defense_5',
    name: 'Lockdown Defender',
    category: WORKOUT_CATEGORIES.DEFENSE,
    difficulty: WORKOUT_DIFFICULTIES.ADVANCED,
    description: 'Become an elite defender',
    estimatedDuration: 40,
    requiredTier: SUBSCRIPTION_TIERS.PREMIUM,
    steps: [
      STEP_TEMPLATES.MIRROR_DRILL,
      STEP_TEMPLATES.CLOSEOUT_DRILL,
      STEP_TEMPLATES.DENY_DEFENSE,
      STEP_TEMPLATES.ZIGZAG_DEFENSE,
      STEP_TEMPLATES.SHELL_DRILL,
    ],
  },
  ELITE_DEFENSE: {
    id: 'defense_6',
    name: 'Elite Defense System',
    category: WORKOUT_CATEGORIES.DEFENSE,
    difficulty: WORKOUT_DIFFICULTIES.EXPERT,
    description: 'Complete defensive mastery',
    estimatedDuration: 50,
    requiredTier: SUBSCRIPTION_TIERS.PRO,
    steps: [
      STEP_TEMPLATES.MIRROR_DRILL,
      STEP_TEMPLATES.CLOSEOUT_DRILL,
      STEP_TEMPLATES.DENY_DEFENSE,
      STEP_TEMPLATES.POST_DEFENSE,
      STEP_TEMPLATES.CHARGE_DRILL,
      STEP_TEMPLATES.SHELL_DRILL,
    ],
  },

  // PASSING WORKOUTS (5 total - 2 FREE, 2 BASIC, 1 PREMIUM)
  PASSING_CLINIC: {
    id: 'passing_1',
    name: 'Passing Fundamentals',
    category: WORKOUT_CATEGORIES.PASSING,
    difficulty: WORKOUT_DIFFICULTIES.BEGINNER,
    description: 'Master the basic passes',
    estimatedDuration: 20,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
    steps: [
      STEP_TEMPLATES.CHEST_PASS,
      STEP_TEMPLATES.BOUNCE_PASS,
      STEP_TEMPLATES.OUTLET_PASS,
    ],
  },
  BASIC_PASSING: {
    id: 'passing_2',
    name: 'Basic Passing Skills',
    category: WORKOUT_CATEGORIES.PASSING,
    difficulty: WORKOUT_DIFFICULTIES.BEGINNER,
    description: 'Essential passing techniques',
    estimatedDuration: 15,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
    steps: [
      STEP_TEMPLATES.CHEST_PASS,
      STEP_TEMPLATES.BOUNCE_PASS,
    ],
  },
  COMPLETE_PASSER: {
    id: 'passing_3',
    name: 'Complete Passer',
    category: WORKOUT_CATEGORIES.PASSING,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Develop all passing skills',
    estimatedDuration: 30,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
    steps: [
      STEP_TEMPLATES.CHEST_PASS,
      STEP_TEMPLATES.BOUNCE_PASS,
      STEP_TEMPLATES.OVERHEAD_PASS,
      STEP_TEMPLATES.OUTLET_PASS,
      STEP_TEMPLATES.ENTRY_PASS,
    ],
  },
  PLAYMAKER: {
    id: 'passing_4',
    name: 'Playmaker Training',
    category: WORKOUT_CATEGORIES.PASSING,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Create for your teammates',
    estimatedDuration: 25,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
    steps: [
      STEP_TEMPLATES.CHEST_PASS,
      STEP_TEMPLATES.BOUNCE_PASS,
      STEP_TEMPLATES.ENTRY_PASS,
      STEP_TEMPLATES.OUTLET_PASS,
    ],
  },
  ELITE_PLAYMAKER: {
    id: 'passing_5',
    name: 'Elite Playmaker',
    category: WORKOUT_CATEGORIES.PASSING,
    difficulty: WORKOUT_DIFFICULTIES.ADVANCED,
    description: 'Advanced passing and vision',
    estimatedDuration: 35,
    requiredTier: SUBSCRIPTION_TIERS.PREMIUM,
    steps: [
      STEP_TEMPLATES.NO_LOOK_PASS,
      STEP_TEMPLATES.BEHIND_BACK_PASS,
      STEP_TEMPLATES.ENTRY_PASS,
      STEP_TEMPLATES.OUTLET_PASS,
      STEP_TEMPLATES.OVERHEAD_PASS,
    ],
  },

  // CUSTOM/MIXED WORKOUTS
  COMPLETE_SKILLS: {
    id: 'custom_1',
    name: 'Complete Skills Workout',
    category: WORKOUT_CATEGORIES.CUSTOM,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Well-rounded workout covering all skills',
    estimatedDuration: 50,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
    steps: [
      STEP_TEMPLATES.STATIONARY_DRIBBLING,
      STEP_TEMPLATES.CROSSOVERS,
      STEP_TEMPLATES.SPOT_SHOOTING,
      STEP_TEMPLATES.FREE_THROWS,
      STEP_TEMPLATES.DEFENSIVE_SLIDES,
      STEP_TEMPLATES.CHEST_PASS,
    ],
  },

  // ─── Decision-training workouts ─────────────────────────────────────────
  // Built on the Teach -> Guided Read -> Random Read -> Live -> Competitive
  // progression rather than on a category. Each one opens with closed work to
  // warm the movement up, then puts that same movement in front of a defender who
  // supplies information — which is the step every workout above this line skips.
  //
  // All of them require at least one partner, which is stated in each step's
  // `equipment`. They are deliberately filed under existing WORKOUT_CATEGORIES
  // values so nothing downstream has to learn a new category.
  READ_THE_CLOSEOUT: {
    id: 'decision_1',
    name: 'Read the Closeout',
    category: WORKOUT_CATEGORIES.SHOOTING,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Shoot, drive or attack the angle — the defender decides',
    estimatedDuration: 35,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
    steps: [
      STEP_TEMPLATES.FORM_SHOOTING,
      STEP_TEMPLATES.CATCH_AND_SHOOT,
      STEP_TEMPLATES.CLOSEOUT_ATTACK_READS,
      STEP_TEMPLATES.SHOOT_OR_DRIVE,
    ],
  },
  BALL_SCREEN_LAB: {
    id: 'decision_2',
    name: 'Ball Screen Lab',
    category: WORKOUT_CATEGORIES.DRIBBLING,
    difficulty: WORKOUT_DIFFICULTIES.ADVANCED,
    description: 'One action, four coverages, four answers',
    estimatedDuration: 45,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
    steps: [
      STEP_TEMPLATES.STATIONARY_DRIBBLING,
      STEP_TEMPLATES.OFF_DRIBBLE_SHOOTING,
      STEP_TEMPLATES.BALL_SCREEN_READS,
      STEP_TEMPLATES.MID_RANGE_SHOOTING,
      STEP_TEMPLATES.ONE_ON_ONE_LIVE,
    ],
  },
  ADVANTAGE_BASKETBALL: {
    id: 'decision_3',
    name: 'Advantage Basketball',
    category: WORKOUT_CATEGORIES.PASSING,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Create a numbers advantage, then convert it',
    estimatedDuration: 40,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
    steps: [
      STEP_TEMPLATES.OUTLET_PASS,
      STEP_TEMPLATES.TRANSITION_DECISIONS,
      STEP_TEMPLATES.ADVANTAGE_FINISHING,
      STEP_TEMPLATES.PASSING_UNDER_PRESSURE,
    ],
  },
  TEAM_DEFENSE_LIVE: {
    id: 'decision_4',
    name: 'Live Team Defense',
    category: WORKOUT_CATEGORIES.DEFENSE,
    difficulty: WORKOUT_DIFFICULTIES.ADVANCED,
    description: 'Stunt, tag, rotate and recover against live offense',
    estimatedDuration: 45,
    requiredTier: SUBSCRIPTION_TIERS.PREMIUM,
    steps: [
      STEP_TEMPLATES.DEFENSIVE_SLIDES,
      STEP_TEMPLATES.CLOSEOUT_DRILL,
      STEP_TEMPLATES.SHELL_DRILL,
      STEP_TEMPLATES.HELP_AND_RECOVER,
    ],
  },
  GETTING_OPEN: {
    id: 'decision_5',
    name: 'Getting Open',
    category: WORKOUT_CATEGORIES.CUSTOM,
    difficulty: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    description: 'Off-ball reads — let the defender pick your cut',
    estimatedDuration: 35,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
    steps: [
      STEP_TEMPLATES.MOVEMENT_SHOOTING,
      STEP_TEMPLATES.CUTTING_READS,
      STEP_TEMPLATES.CATCH_AND_SHOOT,
      STEP_TEMPLATES.DENY_DEFENSE,
    ],
  },
  SMALL_SIDED_COMPETITIVE: {
    id: 'decision_6',
    name: 'Small-Sided Competitive',
    category: WORKOUT_CATEGORIES.CUSTOM,
    difficulty: WORKOUT_DIFFICULTIES.EXPERT,
    description: 'Everything live, with a score and a constraint',
    estimatedDuration: 50,
    requiredTier: SUBSCRIPTION_TIERS.PREMIUM,
    steps: [
      STEP_TEMPLATES.SHOOT_OR_DRIVE,
      STEP_TEMPLATES.ONE_ON_ONE_LIVE,
      STEP_TEMPLATES.TWO_ON_TWO_ADVANTAGE,
      STEP_TEMPLATES.HELP_AND_RECOVER,
    ],
  },
};

// Helper function to get all step templates as array
export const getAllStepTemplates = () => {
  return Object.values(STEP_TEMPLATES);
};

// Helper function to get step templates by category
export const getStepTemplatesByCategory = (category) => {
  return getAllStepTemplates().filter(step => step.category === category);
};

// Helper function to get all workout templates as array
export const getAllWorkoutTemplates = () => {
  return Object.values(WORKOUT_TEMPLATES);
};

// Helper function to get workout templates by category
export const getWorkoutTemplatesByCategory = (category) => {
  return getAllWorkoutTemplates().filter(workout => workout.category === category);
};

// Helper function to create a custom workout from template
export const createCustomWorkoutFromTemplate = (template, customizations = {}) => {
  return {
    ...template,
    ...customizations,
    isCustom: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};
