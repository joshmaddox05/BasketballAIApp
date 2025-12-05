// seedChallenges.js
// Run this script once to populate Firestore with initial challenge data
// Usage: Import and call seedChallenges() from a dev screen or Firebase Admin script

import { db } from '../config/firebaseConfig';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const INITIAL_CHALLENGES = [
    {
        id: 'challenge_1',
        title: 'Perfect Your Free Throw',
        description: 'Master the art of free throw shooting with this 30-day challenge. Complete daily exercises to improve your accuracy, form, and consistency.',
        category: 'Shooting',
        type: 'solo',
        difficulty: 'Beginner',
        duration: 30,
        participantCount: 0,
        rewards: { points: 500, badge: 'Free Throw Master' },
        isExclusive: false,
        image: null,
        days: [
            {
                day: 1,
                title: 'Form Basics',
                description: 'Focus on your stance and grip',
                exercises: [
                    { name: 'Free Throw Form Check', reps: '10 shots' },
                    { name: 'Balance Practice', reps: '5 minutes' },
                    { name: 'Grip Adjustment Drill', reps: '20 shots' }
                ]
            },
            {
                day: 2,
                title: 'Release Training',
                description: 'Work on your shooting release',
                exercises: [
                    { name: 'Follow-Through Practice', reps: '15 shots' },
                    { name: 'Release Point Drill', reps: '20 shots' },
                    { name: 'Wrist Snap Exercise', reps: '3 sets of 10' }
                ]
            },
            {
                day: 3,
                title: 'Consistency Drills',
                description: 'Develop a consistent routine',
                exercises: [
                    { name: 'Pre-Shot Routine', reps: '15 shots' },
                    { name: 'Rhythm Shooting', reps: '20 shots' },
                    { name: 'Eye Focus Drill', reps: '10 shots' }
                ]
            },
            {
                day: 4,
                title: 'Arc Control',
                description: 'Perfect your shooting arc',
                exercises: [
                    { name: 'High Arc Shots', reps: '15 shots' },
                    { name: 'Target Practice', reps: '20 shots' },
                    { name: 'Arc Consistency Drill', reps: '15 shots' }
                ]
            },
            {
                day: 5,
                title: 'Mental Focus',
                description: 'Develop concentration and routine',
                exercises: [
                    { name: 'Visualization Exercise', reps: '5 minutes' },
                    { name: 'Focused Free Throws', reps: '25 shots' },
                    { name: 'Breathing Routine', reps: '10 shots' }
                ]
            },
            // Days 6-29 follow similar pattern...
            {
                day: 6,
                title: 'Power Transfer',
                description: 'Focus on leg drive and power',
                exercises: [
                    { name: 'Leg Drive Practice', reps: '15 shots' },
                    { name: 'Power Chain Drill', reps: '20 shots' },
                    { name: 'Full Motion Shots', reps: '15 shots' }
                ]
            },
            {
                day: 7,
                title: 'Week 1 Assessment',
                description: 'Test your progress after week 1',
                exercises: [
                    { name: 'Free Throw Test', reps: '20 shots (record made)' },
                    { name: 'Form Self-Check', reps: 'Video 5 shots' },
                    { name: 'Strength Assessment', reps: '15 shots' }
                ]
            },
            // Continue pattern for remaining days...
            {
                day: 14,
                title: 'Week 2 Assessment',
                description: 'Mid-challenge progress check',
                exercises: [
                    { name: 'Free Throw Test', reps: '30 shots (record made)' },
                    { name: 'Pressure Shots', reps: '10 shots with timer' },
                    { name: 'Form Refinement', reps: '20 shots' }
                ]
            },
            {
                day: 21,
                title: 'Week 3 Assessment',
                description: 'Advanced progress check',
                exercises: [
                    { name: 'Free Throw Test', reps: '40 shots (record made)' },
                    { name: 'Fatigue Shooting', reps: '15 shots after running' },
                    { name: 'Clutch Situation', reps: '10 consecutive makes' }
                ]
            },
            {
                day: 30,
                title: 'Final Assessment',
                description: 'Test your free throw mastery',
                exercises: [
                    { name: 'Free Throw Test', reps: '50 shots (record percentage)' },
                    { name: 'Form Assessment', reps: 'Video analysis' },
                    { name: 'Pressure Test', reps: '10 shots with time limit' }
                ]
            }
        ]
    },
    {
        id: 'challenge_2',
        title: '7-Day Dribbling Challenge',
        description: 'Enhance your ball-handling skills with a week of focused dribbling exercises. Perfect for beginners looking to improve control.',
        category: 'Dribbling',
        type: 'solo',
        difficulty: 'Beginner',
        duration: 7,
        participantCount: 0,
        rewards: { points: 250, badge: 'Ball Handler' },
        isExclusive: false,
        image: null,
        days: [
            {
                day: 1,
                title: 'Basic Dribbling',
                description: 'Fundamentals of ball control',
                exercises: [
                    { name: 'Stationary Dribbling', reps: '5 minutes each hand' },
                    { name: 'Walking Dribble', reps: '10 court lengths' },
                    { name: 'Figure 8s', reps: '3 sets of 10' }
                ]
            },
            {
                day: 2,
                title: 'Control Drills',
                description: 'Improve your handling precision',
                exercises: [
                    { name: 'Low Dribble', reps: '5 minutes' },
                    { name: 'High Dribble', reps: '5 minutes' },
                    { name: 'Speed Change', reps: '20 transitions' }
                ]
            },
            {
                day: 3,
                title: 'Crossover Basics',
                description: 'Learn the fundamental crossover',
                exercises: [
                    { name: 'Stationary Crossover', reps: '3 sets of 20' },
                    { name: 'Moving Crossover', reps: '10 court lengths' },
                    { name: 'Crossover Combo', reps: '15 reps each side' }
                ]
            },
            {
                day: 4,
                title: 'Between the Legs',
                description: 'Master the between-legs dribble',
                exercises: [
                    { name: 'Stationary BTL', reps: '3 sets of 15' },
                    { name: 'Walking BTL', reps: '10 court lengths' },
                    { name: 'BTL to Crossover', reps: '20 combos' }
                ]
            },
            {
                day: 5,
                title: 'Behind the Back',
                description: 'Add behind-back moves to your arsenal',
                exercises: [
                    { name: 'Stationary Behind Back', reps: '3 sets of 15' },
                    { name: 'Moving Behind Back', reps: '10 court lengths' },
                    { name: 'Combo Moves', reps: '20 sequences' }
                ]
            },
            {
                day: 6,
                title: 'Speed Dribbling',
                description: 'Dribble at game speed',
                exercises: [
                    { name: 'Full Court Sprint', reps: '5 times each hand' },
                    { name: 'Speed Ladder', reps: '10 through-and-back' },
                    { name: 'Race Dribble', reps: '3 timed runs' }
                ]
            },
            {
                day: 7,
                title: 'Final Test',
                description: 'Put all your skills together',
                exercises: [
                    { name: 'Combo Sequence', reps: 'All moves in sequence x5' },
                    { name: 'Timed Challenge', reps: 'Full court under 10 seconds' },
                    { name: 'Skills Assessment', reps: 'Complete obstacle course' }
                ]
            }
        ]
    },
    {
        id: 'challenge_3',
        title: 'Elite Shooting Championship',
        description: 'Compete against the best shooters in a 14-day shooting competition. Test your skills across multiple shooting drills.',
        category: 'Shooting',
        type: 'group',
        difficulty: 'Advanced',
        duration: 14,
        participantCount: 0,
        rewards: { points: 1000, badge: 'Elite Shooter' },
        isExclusive: true,
        requiredTier: 'premium',
        image: null,
        days: [
            {
                day: 1,
                title: 'Three-Point Warmup',
                description: 'Get comfortable from beyond the arc',
                exercises: [
                    { name: 'Corner Threes', reps: '20 shots each corner' },
                    { name: 'Wing Threes', reps: '15 shots each wing' },
                    { name: 'Top of Key', reps: '20 shots' }
                ]
            },
            {
                day: 2,
                title: 'Mid-Range Mastery',
                description: 'Perfect your mid-range game',
                exercises: [
                    { name: 'Elbow Shots', reps: '15 each elbow' },
                    { name: 'Baseline Jumpers', reps: '20 each side' },
                    { name: 'Free Throw Line Extended', reps: '15 each' }
                ]
            },
            // Continue with more days...
            {
                day: 7,
                title: 'Week 1 Competition',
                description: 'Mid-competition scoring round',
                exercises: [
                    { name: 'Around the World', reps: 'Best of 3 attempts' },
                    { name: 'Spot Shooting', reps: '5 spots, 10 shots each' },
                    { name: 'Pressure Shots', reps: '10 game-winning scenarios' }
                ]
            },
            {
                day: 14,
                title: 'Final Championship',
                description: 'Ultimate shooting test',
                exercises: [
                    { name: 'Championship Round', reps: '100 shots from all spots' },
                    { name: 'Clutch Shooting', reps: '20 pressure shots' },
                    { name: 'Final Assessment', reps: 'Record best percentage' }
                ]
            }
        ]
    },
    {
        id: 'challenge_4',
        title: '1v1 Conditioning Battle',
        description: 'Challenge a friend to a head-to-head fitness competition. Complete daily conditioning exercises and compete for the best score.',
        category: 'Physical',
        type: 'head_to_head',
        difficulty: 'Intermediate',
        duration: 7,
        participantCount: 0,
        rewards: { points: 300, badge: 'Fitness Warrior' },
        isExclusive: false,
        image: null,
        days: [
            {
                day: 1,
                title: 'Cardio Kick-off',
                description: 'Start with heart-pumping exercises',
                exercises: [
                    { name: 'Suicide Runs', reps: '5 full court' },
                    { name: 'Jump Rope', reps: '5 minutes' },
                    { name: 'High Knees', reps: '3 sets of 1 minute' }
                ]
            },
            {
                day: 2,
                title: 'Core Strength',
                description: 'Build your core foundation',
                exercises: [
                    { name: 'Planks', reps: '3 sets of 1 minute' },
                    { name: 'Russian Twists', reps: '3 sets of 30' },
                    { name: 'Mountain Climbers', reps: '3 sets of 45 seconds' }
                ]
            },
            {
                day: 3,
                title: 'Leg Power',
                description: 'Build explosive leg strength',
                exercises: [
                    { name: 'Box Jumps', reps: '4 sets of 10' },
                    { name: 'Lunges', reps: '3 sets of 20 each leg' },
                    { name: 'Calf Raises', reps: '4 sets of 25' }
                ]
            },
            {
                day: 4,
                title: 'Upper Body',
                description: 'Strengthen arms and shoulders',
                exercises: [
                    { name: 'Push-ups', reps: '4 sets of 15' },
                    { name: 'Tricep Dips', reps: '3 sets of 12' },
                    { name: 'Shoulder Press', reps: '3 sets of 10' }
                ]
            },
            {
                day: 5,
                title: 'Agility Training',
                description: 'Improve quickness and agility',
                exercises: [
                    { name: 'Ladder Drills', reps: '5 patterns, 3 each' },
                    { name: 'Cone Weaves', reps: '10 runs' },
                    { name: 'Defensive Slides', reps: '5 sets of full court' }
                ]
            },
            {
                day: 6,
                title: 'Endurance Day',
                description: 'Push your stamina to the limit',
                exercises: [
                    { name: 'Court Sprints', reps: '10 full court' },
                    { name: 'Burpees', reps: '50 total' },
                    { name: 'Wall Sit', reps: '3 sets of 90 seconds' }
                ]
            },
            {
                day: 7,
                title: 'Final Battle',
                description: 'Ultimate fitness showdown',
                exercises: [
                    { name: 'Fitness Test', reps: 'Max reps in 1 minute each exercise' },
                    { name: 'Timed Mile', reps: 'Record best time' },
                    { name: 'Final Assessment', reps: 'Complete circuit x3' }
                ]
            }
        ]
    },
    {
        id: 'challenge_5',
        title: 'Pro Training Circuit',
        description: 'Complete professional-level training drills over 21 days. This intense program covers all aspects of basketball development.',
        category: 'Physical',
        type: 'solo',
        difficulty: 'Expert',
        duration: 21,
        participantCount: 0,
        rewards: { points: 750, badge: 'Pro Athlete' },
        isExclusive: true,
        requiredTier: 'premium',
        image: null,
        days: [
            {
                day: 1,
                title: 'Assessment Day',
                description: 'Establish baseline measurements',
                exercises: [
                    { name: 'Vertical Jump Test', reps: '3 attempts' },
                    { name: 'Agility Test', reps: 'Record time' },
                    { name: 'Endurance Test', reps: 'Max in 2 minutes' }
                ]
            },
            // More days would follow...
            {
                day: 7,
                title: 'Week 1 Check-in',
                description: 'First progress assessment',
                exercises: [
                    { name: 'Re-test Vertical', reps: '3 attempts' },
                    { name: 'Skills Circuit', reps: 'Complete full circuit' },
                    { name: 'Recovery Session', reps: '20 minutes stretching' }
                ]
            },
            {
                day: 14,
                title: 'Week 2 Check-in',
                description: 'Mid-program assessment',
                exercises: [
                    { name: 'Full Assessment', reps: 'All baseline tests' },
                    { name: 'Game Simulation', reps: '20 minute scrimmage intensity' },
                    { name: 'Active Recovery', reps: '30 minutes' }
                ]
            },
            {
                day: 21,
                title: 'Final Graduation',
                description: 'Complete program assessment',
                exercises: [
                    { name: 'Final Assessment', reps: 'All tests, compare to day 1' },
                    { name: 'Skills Showcase', reps: 'Demonstrate all learned skills' },
                    { name: 'Celebration Workout', reps: 'Fun finisher circuit' }
                ]
            }
        ]
    },
    {
        id: 'challenge_6',
        title: 'Shooting Showdown',
        description: 'Go head-to-head with another player in a 5-day shooting competition. Daily shooting challenges determine the winner.',
        category: 'Shooting',
        type: 'head_to_head',
        difficulty: 'Intermediate',
        duration: 5,
        participantCount: 0,
        rewards: { points: 200, badge: 'Sharpshooter' },
        isExclusive: false,
        image: null,
        days: [
            {
                day: 1,
                title: 'Free Throw Face-off',
                description: 'Classic free throw competition',
                exercises: [
                    { name: 'Free Throw Contest', reps: '25 shots (count makes)' },
                    { name: 'Streak Bonus', reps: '5 consecutive makes' },
                    { name: 'Pressure Shots', reps: '5 must-make situations' }
                ]
            },
            {
                day: 2,
                title: 'Mid-Range Battle',
                description: 'Mid-range shooting challenge',
                exercises: [
                    { name: 'Elbow Shooting', reps: '10 shots each elbow' },
                    { name: 'Wing Shots', reps: '10 shots each wing' },
                    { name: 'Baseline Challenge', reps: '10 shots each side' }
                ]
            },
            {
                day: 3,
                title: 'Three-Point Contest',
                description: 'Beyond the arc competition',
                exercises: [
                    { name: 'Around the Arc', reps: '5 spots, 5 shots each' },
                    { name: 'Corner Specialist', reps: '10 shots each corner' },
                    { name: 'Money Ball Bonus', reps: '5 rack shots' }
                ]
            },
            {
                day: 4,
                title: 'Movement Shooting',
                description: 'Shooting off the dribble',
                exercises: [
                    { name: 'Pull-up Jumpers', reps: '15 shots' },
                    { name: 'Catch and Shoot', reps: '20 shots' },
                    { name: 'Step-back Shots', reps: '15 shots' }
                ]
            },
            {
                day: 5,
                title: 'Championship Round',
                description: 'Final showdown',
                exercises: [
                    { name: 'All-Around Shooting', reps: '10 shots from 10 spots' },
                    { name: 'Clutch Time', reps: '5 game-winner scenarios' },
                    { name: 'Final Score', reps: 'Calculate total percentage' }
                ]
            }
        ]
    }
];

/**
 * Seed initial challenges to Firestore
 * Call this function once to populate the challenges collection
 */
export const seedChallenges = async () => {
    console.log('Starting to seed challenges...');

    try {
        for (const challenge of INITIAL_CHALLENGES) {
            const { id, ...challengeData } = challenge;

            await setDoc(doc(db, 'challenges', id), {
                ...challengeData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            console.log(`Seeded challenge: ${challenge.title}`);
        }

        console.log('All challenges seeded successfully!');
        return { success: true, count: INITIAL_CHALLENGES.length };
    } catch (error) {
        console.error('Error seeding challenges:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check if challenges collection exists and has data
 */
export const checkChallengesExist = async () => {
    try {
        const { getChallenges } = require('../services/firestoreService');
        const challenges = await getChallenges();
        return challenges && challenges.length > 0;
    } catch (error) {
        console.error('Error checking challenges:', error);
        return false;
    }
};

export default seedChallenges;
