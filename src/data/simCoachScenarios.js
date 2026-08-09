// simCoachScenarios.js - Static SimCoach scenario catalog.
// Single source of truth for the tactical scenarios a coach can assign to an
// athlete and that the athlete studies in SimCoachScenarioScreen. Keyed by id so
// an assignment's `refId` resolves directly to a playable scenario.

export const SIM_COACH_SCENARIOS = {
  'pnr-defense': {
    id: 'pnr-defense',
    title: 'Pick & Roll Defense',
    category: 'Defense',
    playSteps: [
      'Ball handler initiates pick-and-roll at the top of the key.',
      'Screen is set by the big man. Help defender drops into the paint.',
      'Ball handler reads the coverage: ice (force baseline) or drop (mid-range available).',
    ],
    question: 'The big man is playing drop coverage. The ball handler can take a mid-range jumper. What is the correct defensive read?',
    options: [
      { label: 'A', text: 'Contest the mid-range aggressively — prevent the comfortable pull-up.' },
      { label: 'B', text: 'Stay in drop and allow the mid-range — protect the paint first.' },
      { label: 'C', text: 'Switch assignments to confuse the offense.' },
      { label: 'D', text: 'Double-team the ball handler, leaving the corner open.' },
    ],
    correctIndex: 0,
    explanation: 'Against drop coverage, the ball handler can take an easy mid-range. The correct defensive adjustment is to contest that shot aggressively rather than concede it.',
  },
  'zone-offense': {
    id: 'zone-offense',
    title: 'Zone Offense',
    category: 'Offense',
    playSteps: [
      'Bring the ball up the floor in transition.',
      'Set up motion offense at the 3-point arc.',
      'Ball handler reads whether the defense is in zone or man.',
    ],
    question: 'The defense rotates into a 2-3 zone as your team sets up. What is the best offensive action?',
    options: [
      { label: 'A', text: 'Attack the gaps aggressively off the dribble.' },
      { label: 'B', text: 'Move the ball quickly around the perimeter to collapse the zone.' },
      { label: 'C', text: 'Set a back-screen and post up in the lane.' },
      { label: 'D', text: 'Call timeout and draw up a specific set play.' },
    ],
    correctIndex: 1,
    explanation: 'Against a 2-3 zone, quick ball movement around the perimeter collapses the defense and creates gaps in the short corners and at the high post.',
  },
  'transition-defense': {
    id: 'transition-defense',
    title: 'Transition Defense',
    category: 'Defense',
    playSteps: [
      'Opponent secures a defensive rebound and pushes the ball in transition.',
      'You are the first defender back against a 3-on-2 fast break.',
      'Two attackers fill the wings; the ball handler drives the middle.',
    ],
    question: 'You are the top defender in a 3-on-2. How should you play it?',
    options: [
      { label: 'A', text: 'Sprint at the ball handler and force an early pass.' },
      { label: 'B', text: 'Protect the rim and stop the ball at the free-throw line, forcing a kick-out.' },
      { label: 'C', text: 'Deny the nearest wing and concede the drive.' },
      { label: 'D', text: 'Foul immediately to stop the break.' },
    ],
    correctIndex: 1,
    explanation: 'In a 3-on-2, the top defender stops the ball around the free-throw line to buy time for help to recover, forcing a perimeter pass rather than conceding a layup.',
  },
};

// Ordered list for pickers (id + display fields only).
export const SIM_COACH_SCENARIO_LIST = Object.values(SIM_COACH_SCENARIOS).map((s) => ({
  id: s.id,
  title: s.title,
  category: s.category,
  steps: s.playSteps.length,
}));

export const getScenarioById = (id) => SIM_COACH_SCENARIOS[id] || SIM_COACH_SCENARIOS['zone-offense'];
