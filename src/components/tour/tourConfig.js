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
    // Step 6: Show Add Friends section
    {
        id: 'add-friends-section',
        target: 'add-friends-section',
        tab: 'Challenges',
        title: 'Add Friends',
        description: 'Find and add friends to challenge them in head-to-head battles!',
        tooltipPosition: 'bottom',
    },
    // Step 7: Show Available Challenges
    {
        id: 'available-challenges-section',
        target: 'available-challenges-section',
        tab: 'Challenges',
        title: 'Available Challenges',
        description: 'Browse and join solo, head-to-head, or group challenges to test your skills.',
        tooltipPosition: 'top',
    },
    // Step 8: Prompt user to tap Progress tab
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
