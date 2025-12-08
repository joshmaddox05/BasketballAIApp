// tourConfig.js - Tour step definitions
// Steps alternate between tab navigation prompts and screen content highlights
export const TOUR_STEPS = [
    // Step 1: Prompt user to tap Training tab
    {
        id: 'training-tab',
        target: 'training-tab',
        tab: null,
        waitForTab: 'Training',
        title: 'Start Your Training',
        description: 'Tap the Training tab to explore workouts and training programs.',
        tooltipPosition: 'top',
        isTabStep: true,
    },
    // Step 2: Show Build Workout card on Training screen
    {
        id: 'build-workout-card',
        target: 'build-workout-card',
        tab: 'Training',
        title: 'Build Custom Plans',
        description: 'Create personalized training plans for today, this week, or the entire month.',
        tooltipPosition: 'bottom',
    },
    // Step 3: Show AI Analysis card
    {
        id: 'ai-analysis-card',
        target: 'ai-analysis-card',
        tab: 'Training',
        title: 'AI Shooting Analysis',
        description: 'Record your shooting form and get instant AI-powered feedback to improve your technique.',
        tooltipPosition: 'bottom',
    },
    // Step 4: Prompt user to tap Challenges tab
    {
        id: 'challenges-tab',
        target: 'challenges-tab',
        tab: null,
        waitForTab: 'Challenges',
        title: 'Explore Challenges',
        description: 'Tap the Challenges tab to compete with friends and earn rewards!',
        tooltipPosition: 'top',
        isTabStep: true,
    },
    // Step 5: Show Daily Challenge card
    {
        id: 'daily-challenge-card',
        target: 'daily-challenge-card',
        tab: 'Challenges',
        title: 'Daily Challenges',
        description: 'Complete daily challenges to earn XP and keep your streak going!',
        tooltipPosition: 'bottom',
    },
    // Step 6: Show Challenge type tabs
    {
        id: 'challenge-type-tabs',
        target: 'challenge-type-tabs',
        tab: 'Challenges',
        title: 'Challenge Types',
        description: 'Filter between Solo challenges, Head-to-Head battles, and Group competitions.',
        tooltipPosition: 'bottom',
    },
    // Step 7: Prompt user to tap Progress tab
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
    // Step 8: Show Training Summary card
    {
        id: 'training-summary-card',
        target: 'training-summary-card',
        tab: 'Progress',
        title: 'Training Summary',
        description: 'Track your total workouts, current streak, and average session duration.',
        tooltipPosition: 'bottom',
    },
    // Step 9: Show Progress tabs
    {
        id: 'progress-tabs',
        target: 'progress-tabs',
        tab: 'Progress',
        title: 'Explore Your Stats',
        description: 'View detailed stats, achievements, goals, and your complete workout history!',
        tooltipPosition: 'bottom',
    },
];
