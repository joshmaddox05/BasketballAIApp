// tourConfig.js - Tour step definitions
//
// NARRATION: each step carries `narrationId` + `script`. The script is the spoken
// line and is AUTHORED separately from the on-screen copy — reading
// `title + '. ' + description` aloud (what the tour used to do) is stilted, and
// good UI copy is rarely good voice copy. `scripts/generateNarration.mjs` reads
// these fields, synthesizes each line with ElevenLabs, and writes
// assets/narration/<narrationId>.mp3. A step with no generated asset falls back
// to the OS voice, so authoring copy never has to wait on a generation run.
// Steps alternate between tab navigation prompts and screen content highlights.
// NOTE: Training is a tab again (Home / Training / Progress / Profile), so its steps are
// restored — TrainingScreen never lost its TourStep wrappers or its scroll-ref registration.
// Challenges remains folded into the HoopCommunity module and has no tab step.
// (A Module Hub intro step is a Phase 2 follow-up.)
export const TOUR_STEPS = [
    // Step 1: Prompt user to tap the Training tab
    {
        id: 'training-tab',
        narrationId: 'tour.training-tab',
        script: 'This is your Training home. Tap it to find your workouts and drills.',
        target: 'training-tab',
        tab: null,
        waitForTab: 'Training',
        title: 'Your Training Home',
        description: 'Tap the Training tab — this is where your workouts and drills live.',
        tooltipPosition: 'top',
        isTabStep: true,
    },
    {
        id: 'build-workout-card',
        narrationId: 'tour.build-workout',
        script: 'You can build your own session here, picking any drill from the library, or start from a ready-made template.',
        target: 'build-workout-card',
        tab: 'Training',
        title: 'Build a Workout',
        description: 'Create a custom session from any drill in the library, or start from a template.',
        tooltipPosition: 'bottom',
    },
    {
        id: 'ai-analysis-card',
        narrationId: 'tour.ai-analysis',
        script: 'Record your shot here and get a breakdown of your form and mechanics.',
        target: 'ai-analysis-card',
        tab: 'Training',
        title: 'AI Shot Analysis',
        description: 'Record your shot and get a breakdown of your form and mechanics.',
        tooltipPosition: 'top',
    },
    // Step 4: Prompt user to tap Progress tab
    {
        id: 'progress-tab',
        narrationId: 'tour.progress-tab',
        script: 'Tap Progress to see your stats and everything you\'ve earned.',
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
        narrationId: 'tour.training-summary',
        script: 'Your training summary. Total workouts, your current streak, and how long your sessions run.',
        target: 'training-summary-card',
        tab: 'Progress',
        title: 'Training Summary',
        description: 'Track your total workouts, current streak, and average session duration.',
        tooltipPosition: 'bottom',
    },
    // Step 10: Show Shooting Accuracy card
    {
        id: 'shooting-accuracy-card',
        narrationId: 'tour.shooting-accuracy',
        script: 'This tracks your shooting percentage, and how your accuracy is trending over time.',
        target: 'shooting-accuracy-card',
        tab: 'Progress',
        title: 'Shooting Accuracy',
        description: 'Monitor your shooting percentage and see trends in your accuracy over time.',
        tooltipPosition: 'bottom',
    },
    // Step 11: Show Skill Progress chart
    {
        id: 'skill-progress-chart',
        narrationId: 'tour.skill-progress',
        script: 'And this chart shows how your shooting, dribbling and physical work have improved over the last six months.',
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
// Narration here is deliberately worded to fit BOTH coach sub-types, so one
// generated asset serves org coaches and trainers. The on-screen description
// still branches on `isTrainer` — only the spoken line is shared.
export const getCoachTourSteps = (coachType) => {
    const isTrainer = coachType === 'trainer';
    return [
        {
            id: 'coach-stats',
            narrationId: 'tour.coach-stats',
            script: 'This is your coaching dashboard — a quick pulse on how things are going, right at the top.',
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
            narrationId: 'tour.coach-quick-actions',
            script: 'Quick actions get you straight into the jobs you do most often.',
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
            narrationId: 'tour.coach-tools',
            script: 'Your full toolkit lives here. Tap any tile to open it.',
            target: 'coach-tools',
            tab: 'CoachHome',
            title: 'Coach Tools',
            description: 'Your full toolkit lives here — SimCoach, CoachMarket, HoopCommunity and more. Tap any tile to open it.',
            tooltipPosition: 'top',
        },
        {
            id: 'coach-middle-tab',
            narrationId: 'tour.coach-middle-tab',
            script: 'This middle tab is your main workspace. It changes to match the kind of coaching you do.',
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
            narrationId: 'tour.coach-profile-tab',
            script: 'And Profile is where you can replay this tour, mute the voice guide, or change your settings.',
            target: 'coach-profile-tab',
            tab: null,
            title: 'Profile & Settings',
            description: 'Tap Profile anytime to replay this tour, mute the voice guide, or adjust your settings.',
            tooltipPosition: 'top',
        },
    ];
};

// Parent onboarding tour. The parent navigator previously mounted TourProvider
// with the PLAYER's steps and the player's storage key, so it targeted element
// ids that exist only on player screens — a tour that could never run. These
// steps target real ParentHomeScreen elements, and the last two spotlight tab
// icons and advance on tap.
export const PARENT_TOUR_STEPS = [
    {
        id: 'parent-child-switcher',
        target: 'parent-child-switcher',
        tab: 'ParentHome',
        title: 'Your Athletes',
        description: 'Switch between your children here, or link another athlete with their invite code.',
        narrationId: 'tour.parent-child-switcher',
        script: 'Switch between your children up here, or link another athlete using their invite code.',
        tooltipPosition: 'bottom',
    },
    {
        id: 'parent-tools',
        target: 'parent-tools',
        tab: 'ParentHome',
        title: 'Family Tools',
        description: 'Recruiting consent, community and the knowledge library — your side of the app lives here.',
        narrationId: 'tour.parent-tools',
        script: 'These are your family tools — recruiting consent, community, and the knowledge library.',
        tooltipPosition: 'top',
    },
    {
        id: 'parent-progress-cta',
        target: 'parent-progress-cta',
        tab: 'ParentHome',
        title: 'The Full Picture',
        description: "Open the full progress report — evaluation, training load, plan adherence and milestones.",
        narrationId: 'tour.parent-progress',
        script: 'And this opens the full progress report — their evaluation, training load, and how they are tracking against their plan.',
        tooltipPosition: 'top',
    },
    {
        id: 'parent-progress-tab',
        target: 'parent-progress-tab',
        tab: null,
        title: 'Progress Tab',
        description: 'The Progress tab is always one tap away, with the same family dashboard.',
        narrationId: 'tour.parent-progress-tab',
        script: 'The Progress tab keeps that dashboard one tap away.',
        tooltipPosition: 'top',
    },
    {
        id: 'parent-profile-tab',
        target: 'parent-profile-tab',
        tab: null,
        title: 'Profile & Settings',
        description: 'Tap Profile any time to replay this tour, mute the voice guide, or change your settings.',
        narrationId: 'tour.parent-profile-tab',
        script: 'And Profile is where you can replay this tour, mute the voice guide, or change your settings.',
        tooltipPosition: 'top',
    },
];
