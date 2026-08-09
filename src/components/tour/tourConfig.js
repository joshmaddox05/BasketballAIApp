// tourConfig.js - Tour step definitions
// Steps alternate between tab navigation prompts and screen content highlights.
// NOTE: Training & Challenges are no longer tabs — they were folded into the Blueprint360 /
// HoopCommunity modules on the Module Hub. The old tab-based steps for them were removed; the
// tour now focuses on the surviving Progress tab. (A Module Hub intro step is a Phase 2 follow-up.)
export const TOUR_STEPS = [
    // Step 1: Prompt user to tap Progress tab
    {
        id: 'progress-tab',
        target: 'progress-tab',
        tab: null,
        waitForTab: 'Progress',
        title: 'Track Your Progress',
        description: 'Tap the Progress tab to view your stats and achievements!',
        tooltipPosition: 'top',
        isTabStep: true,
    },
    // Step 9: Show Training Summary card
    {
        id: 'training-summary-card',
        target: 'training-summary-card',
        tab: 'Progress',
        title: 'Training Summary',
        description: 'Track your total workouts, current streak, and average session duration.',
        tooltipPosition: 'bottom',
    },
    // Step 10: Show Shooting Accuracy card
    {
        id: 'shooting-accuracy-card',
        target: 'shooting-accuracy-card',
        tab: 'Progress',
        title: 'Shooting Accuracy',
        description: 'Monitor your shooting percentage and see trends in your accuracy over time.',
        tooltipPosition: 'bottom',
    },
    // Step 11: Show Skill Progress chart
    {
        id: 'skill-progress-chart',
        target: 'skill-progress-chart',
        tab: 'Progress',
        title: 'Skill Progress',
        description: 'Track your improvement in shooting, dribbling, and physical training over the past 6 months.',
        tooltipPosition: 'top',
    },
];
