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

// Coach onboarding tour — a concise, coachType-aware walkthrough of the Coach
// Dashboard. Content steps (1-3) target elements on the CoachHome scroll view;
// the last two steps spotlight tab-bar icons and advance on tap (no forced
// navigation), so no screenListeners/waitForTab wiring is needed.
export const getCoachTourSteps = (coachType) => {
    const isTrainer = coachType === 'trainer';
    return [
        {
            id: 'coach-stats',
            target: 'coach-stats',
            tab: 'CoachHome',
            title: 'Your Coaching Dashboard',
            description: isTrainer
                ? 'A quick pulse on your studio — earnings, sales, and live listings at a glance.'
                : 'A quick pulse on your program — active athletes, weekly sessions, and earnings at a glance.',
            tooltipPosition: 'bottom',
        },
        {
            id: 'coach-quick-actions',
            target: 'coach-quick-actions',
            tab: 'CoachHome',
            title: 'Quick Actions',
            description: isTrainer
                ? 'Jump straight into creating drills, opening your storefront, or withdrawing earnings.'
                : 'Jump straight into adding athletes, assigning work, booking sessions, or your playbook.',
            tooltipPosition: 'bottom',
        },
        {
            id: 'coach-tools',
            target: 'coach-tools',
            tab: 'CoachHome',
            title: 'Coach Tools',
            description: 'Your full toolkit lives here — SimCoach, CoachMarket, HoopCommunity and more. Tap any tile to open it.',
            tooltipPosition: 'top',
        },
        {
            id: 'coach-middle-tab',
            target: 'coach-middle-tab',
            tab: null,
            title: isTrainer ? 'Your Market & Create Studio' : 'Your Roster & Playbook',
            description: isTrainer
                ? 'These tabs are your storefront and content studio — list drills and grow your marketplace.'
                : 'These tabs are your team hub — manage your roster and build game plans in your playbook.',
            tooltipPosition: 'top',
        },
        {
            id: 'coach-profile-tab',
            target: 'coach-profile-tab',
            tab: null,
            title: 'Profile & Settings',
            description: 'Tap Profile anytime to replay this tour, mute the voice guide, or adjust your settings.',
            tooltipPosition: 'top',
        },
    ];
};
