// skillQuiz.js — the onboarding skill quiz: its questions, its levels, and how
// an answer set becomes a level.
//
// Pure and separate from the screen because the scoring is the part that can be
// wrong without anything looking wrong. It shipped with two defects that a test
// would have caught immediately and a person never would:
//
//   1. The screen scored `answers` straight out of React state right after
//      calling setAnswers, so the final question — the one just tapped — was
//      never counted. Four answers decided a five-question quiz.
//   2. Ties were broken by whichever level happened to be counted first, which
//      depends on the order the answers came in. Five questions over three levels
//      tie constantly (2-2-1), so the same player could score differently
//      depending on the order they answered.
//
// Both are silent. The quiz still produces a plausible-looking level, and the
// level it produces feeds the workout engine's heaviest input.

const SKILL_LEVELS = [
    {
        id: 'beginner',
        title: 'Beginner',
        description: 'I\'m new to basketball or haven\'t played much. I want to learn the basics.',
        icon: 'basketball-outline',
        traits: ['Little to no experience', 'Looking to learn fundamentals', 'Working on basic coordination'],
        encouragement: 'Perfect! Every pro started as a beginner. Let\'s build your foundation!'
    },
    {
        id: 'intermediate',
        title: 'Intermediate',
        description: 'I have some experience and can play decent. I want to refine my skills.',
        icon: 'basketball',
        traits: ['Have played before', 'Understand basic rules', 'Can make some shots consistently', 'Want to improve technique'],
        encouragement: 'Great! You have a solid foundation. Let\'s take your skills to the next level!'
    },
    {
        id: 'advanced',
        title: 'Advanced',
        description: 'I play regularly and have good skills. I want to take my game to the next level.',
        icon: 'ribbon',
        traits: ['Play frequently', 'Good shooting form', 'Consistent performance', 'Looking for advanced training'],
        encouragement: 'Excellent! You\'re ready for elite-level training and complex drills!'
    }
];

const QUESTIONS = [
    {
        id: 'q1',
        question: 'How often do you play basketball?',
        options: [
            { id: 'q1a1', text: 'Rarely or never', skillLevel: 'beginner' },
            { id: 'q1a2', text: 'Occasionally (once a month)', skillLevel: 'beginner' },
            { id: 'q1a3', text: 'Regularly (1-2 times a week)', skillLevel: 'intermediate' },
            { id: 'q1a4', text: 'Frequently (3+ times a week)', skillLevel: 'advanced' },
        ]
    },
    {
        id: 'q2',
        question: 'How would you rate your shooting accuracy?',
        options: [
            { id: 'q2a1', text: 'I miss most shots', skillLevel: 'beginner' },
            { id: 'q2a2', text: 'I make some shots, but inconsistently', skillLevel: 'beginner' },
            { id: 'q2a3', text: 'I make shots consistently from some spots', skillLevel: 'intermediate' },
            { id: 'q2a4', text: 'I make shots consistently from most spots', skillLevel: 'advanced' },
        ]
    },
    {
        id: 'q3',
        question: 'How comfortable are you with dribbling?',
        options: [
            { id: 'q3a1', text: 'I often lose control of the ball', skillLevel: 'beginner' },
            { id: 'q3a2', text: 'I can dribble with my dominant hand', skillLevel: 'beginner' },
            { id: 'q3a3', text: 'I can dribble with both hands', skillLevel: 'intermediate' },
            { id: 'q3a4', text: 'I can perform advanced dribbling moves', skillLevel: 'advanced' },
        ]
    },
    {
        id: 'q4',
        question: 'How would you describe your knowledge of basketball strategies?',
        options: [
            { id: 'q4a1', text: 'Limited understanding of the game', skillLevel: 'beginner' },
            { id: 'q4a2', text: 'Basic understanding of positions and rules', skillLevel: 'beginner' },
            { id: 'q4a3', text: 'Good understanding of offensive and defensive strategies', skillLevel: 'intermediate' },
            { id: 'q4a4', text: 'Comprehensive understanding of complex strategies', skillLevel: 'advanced' },
        ]
    },
    {
        id: 'q5',
        question: 'Have you received any formal basketball training?',
        options: [
            { id: 'q5a1', text: 'No formal training', skillLevel: 'beginner' },
            { id: 'q5a2', text: 'Some school or recreational training', skillLevel: 'beginner' },
            { id: 'q5a3', text: 'Regular training or coaching', skillLevel: 'intermediate' },
            { id: 'q5a4', text: 'Advanced or professional coaching', skillLevel: 'advanced' },
        ]
    }
];

/**
 * Score an answer set into a skill level.
 *
 * Ties resolve DOWNWARD, deliberately. An athlete placed one level below
 * themselves notices within a week and moves up; one placed above grinds through
 * drills they cannot execute yet and learns them wrong. The asymmetry in the cost
 * of being wrong is the whole reason for the rule.
 *
 * @param {Object<string, {skillLevel: string}>} answers keyed by question id
 * @returns {'beginner'|'intermediate'|'advanced'}
 */
export const scoreSkillQuiz = (answers) => {
  const counts = Object.values(answers || {}).reduce((acc, answer) => {
    const level = answer?.skillLevel;
    if (level) acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  let determined = SKILL_ORDER[0];
  let best = 0;
  for (const level of SKILL_ORDER) {
    if ((counts[level] || 0) > best) {
      best = counts[level];
      determined = level;
    }
  }
  return determined;
};

/** Lowest to highest. The order the tie-break walks. */
export const SKILL_ORDER = ['beginner', 'intermediate', 'advanced'];

export { SKILL_LEVELS, QUESTIONS };
