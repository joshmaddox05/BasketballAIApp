// seedDailyChallenges.js
// Run this script to populate Firestore with daily challenge templates
// Usage: Import and call seedDailyChallenges() from a dev screen

import { db } from '../config/firebaseConfig';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// 30 Daily Challenge Templates - these rotate throughout the month
export const DAILY_CHALLENGE_TEMPLATES = [
  // SHOOTING CHALLENGES (10)
  {
    id: 'daily-shooting-1',
    title: 'Free Throw Focus',
    description: 'Hit 25 free throws to complete this challenge. Focus on form and consistency.',
    category: 'shooting',
    difficulty: 'Beginner',
    targetType: 'shooting',
    targetValue: 25,
    targetMetric: 'makes',
    estimatedTime: 15,
    rewards: { xp: 75, badge: null, streakBonus: 10 },
    tips: ['Keep your elbow in', 'Follow through every time', 'Find your rhythm']
  },
  {
    id: 'daily-shooting-2',
    title: 'Three-Point Thursday',
    description: 'Knock down 15 three-pointers from around the arc. Move to different spots!',
    category: 'shooting',
    difficulty: 'Intermediate',
    targetType: 'shooting',
    targetValue: 15,
    targetMetric: 'makes',
    estimatedTime: 20,
    rewards: { xp: 100, badge: null, streakBonus: 15 },
    tips: ['Set your feet before shooting', 'Use your legs', 'Pick 5 different spots']
  },
  {
    id: 'daily-shooting-3',
    title: 'Mid-Range Master',
    description: 'Complete 20 mid-range jumpers from the elbow and baseline areas.',
    category: 'shooting',
    difficulty: 'Intermediate',
    targetType: 'shooting',
    targetValue: 20,
    targetMetric: 'makes',
    estimatedTime: 15,
    rewards: { xp: 85, badge: null, streakBonus: 12 },
    tips: ['Work on your pull-up form', 'Practice off the dribble', 'Use shot fakes']
  },
  {
    id: 'daily-shooting-4',
    title: 'Shooting Streak',
    description: 'Make 10 shots in a row from any spot. Reset if you miss!',
    category: 'shooting',
    difficulty: 'Advanced',
    targetType: 'shooting',
    targetValue: 10,
    targetMetric: 'consecutive',
    estimatedTime: 25,
    rewards: { xp: 150, badge: 'Streak Master', streakBonus: 25 },
    tips: ['Stay in rhythm', 'Don\'t overthink', 'Trust your form']
  },
  {
    id: 'daily-shooting-5',
    title: 'Around the World',
    description: 'Complete the around-the-world drill, making shots from 7 spots.',
    category: 'shooting',
    difficulty: 'Intermediate',
    targetType: 'shooting',
    targetValue: 7,
    targetMetric: 'spots',
    estimatedTime: 20,
    rewards: { xp: 90, badge: null, streakBonus: 12 },
    tips: ['Start from the corner', 'Work both directions', 'No moving your feet']
  },
  {
    id: 'daily-shooting-6',
    title: 'Floater Challenge',
    description: 'Master the floater with 15 makes from the lane area.',
    category: 'shooting',
    difficulty: 'Intermediate',
    targetType: 'shooting',
    targetValue: 15,
    targetMetric: 'makes',
    estimatedTime: 15,
    rewards: { xp: 80, badge: null, streakBonus: 10 },
    tips: ['High arc is key', 'Use one hand', 'Practice off either foot']
  },
  {
    id: 'daily-shooting-7',
    title: 'Bank Shot Bonanza',
    description: 'Score 12 bank shots from both sides of the court.',
    category: 'shooting',
    difficulty: 'Beginner',
    targetType: 'shooting',
    targetValue: 12,
    targetMetric: 'makes',
    estimatedTime: 15,
    rewards: { xp: 70, badge: null, streakBonus: 10 },
    tips: ['Aim for the top corner of the square', 'Work at 45-degree angles', 'Soft touch']
  },
  {
    id: 'daily-shooting-8',
    title: 'Catch and Shoot',
    description: 'Complete 25 catch-and-shoot jumpers. Simulate game situations!',
    category: 'shooting',
    difficulty: 'Intermediate',
    targetType: 'shooting',
    targetValue: 25,
    targetMetric: 'makes',
    estimatedTime: 20,
    rewards: { xp: 95, badge: null, streakBonus: 15 },
    tips: ['Square up quickly', 'Hands ready', 'Catch in shooting pocket']
  },
  {
    id: 'daily-shooting-9',
    title: 'Deep Range',
    description: 'Push your range! Make 10 shots from beyond NBA three-point distance.',
    category: 'shooting',
    difficulty: 'Advanced',
    targetType: 'shooting',
    targetValue: 10,
    targetMetric: 'makes',
    estimatedTime: 25,
    rewards: { xp: 120, badge: 'Deep Threat', streakBonus: 20 },
    tips: ['More legs, less arm', 'Maintain form', 'Don\'t force it']
  },
  {
    id: 'daily-shooting-10',
    title: 'Pressure Free Throws',
    description: 'Make 20 free throws with consequences - run a lap for each miss!',
    category: 'shooting',
    difficulty: 'Intermediate',
    targetType: 'shooting',
    targetValue: 20,
    targetMetric: 'makes',
    estimatedTime: 25,
    rewards: { xp: 100, badge: null, streakBonus: 15 },
    tips: ['Embrace the pressure', 'Slow your breathing', 'Stick to your routine']
  },

  // DRIBBLING CHALLENGES (6)
  {
    id: 'daily-dribbling-1',
    title: 'Dribble Marathon',
    description: 'Complete 500 dribbles alternating hands. Focus on ball control!',
    category: 'dribbling',
    difficulty: 'Beginner',
    targetType: 'reps',
    targetValue: 500,
    targetMetric: 'dribbles',
    estimatedTime: 15,
    rewards: { xp: 50, badge: null, streakBonus: 8 },
    tips: ['Keep your head up', 'Pound the ball low', 'Switch every 25 dribbles']
  },
  {
    id: 'daily-dribbling-2',
    title: 'Crossover Challenge',
    description: 'Execute 100 crossover moves. Mix in quick and slow crossovers.',
    category: 'dribbling',
    difficulty: 'Intermediate',
    targetType: 'reps',
    targetValue: 100,
    targetMetric: 'crossovers',
    estimatedTime: 15,
    rewards: { xp: 75, badge: null, streakBonus: 10 },
    tips: ['Sell the move with your shoulder', 'Low and quick', 'Change speeds']
  },
  {
    id: 'daily-dribbling-3',
    title: 'Handle Master',
    description: 'Complete the killer crossover combo drill: crossover, between legs, behind back.',
    category: 'dribbling',
    difficulty: 'Advanced',
    targetType: 'reps',
    targetValue: 50,
    targetMetric: 'combos',
    estimatedTime: 20,
    rewards: { xp: 100, badge: 'Handle Master', streakBonus: 15 },
    tips: ['Stay low throughout', 'Protect the ball', 'Speed up gradually']
  },
  {
    id: 'daily-dribbling-4',
    title: 'Weak Hand Work',
    description: 'Complete 200 dribbles with your non-dominant hand only.',
    category: 'dribbling',
    difficulty: 'Intermediate',
    targetType: 'reps',
    targetValue: 200,
    targetMetric: 'dribbles',
    estimatedTime: 12,
    rewards: { xp: 80, badge: null, streakBonus: 12 },
    tips: ['Start stationary', 'Focus on control', 'Add movement gradually']
  },
  {
    id: 'daily-dribbling-5',
    title: 'Speed Dribble Sprint',
    description: 'Complete 10 full-court speed dribbles under control.',
    category: 'dribbling',
    difficulty: 'Intermediate',
    targetType: 'reps',
    targetValue: 10,
    targetMetric: 'sprints',
    estimatedTime: 15,
    rewards: { xp: 85, badge: null, streakBonus: 12 },
    tips: ['Push the ball out in front', 'Long strides', 'Head up']
  },
  {
    id: 'daily-dribbling-6',
    title: 'Figure 8 Challenge',
    description: 'Complete 75 figure-8 dribbles around your legs without losing the ball.',
    category: 'dribbling',
    difficulty: 'Beginner',
    targetType: 'reps',
    targetValue: 75,
    targetMetric: 'figure8s',
    estimatedTime: 10,
    rewards: { xp: 60, badge: null, streakBonus: 8 },
    tips: ['Stay low in your stance', 'Keep the ball close', 'Reverse direction']
  },

  // PHYSICAL CHALLENGES (6)
  {
    id: 'daily-physical-1',
    title: 'Suicide Sprints',
    description: 'Complete 10 full suicide drills (baseline to free throw to half to far free throw to far baseline).',
    category: 'physical',
    difficulty: 'Advanced',
    targetType: 'reps',
    targetValue: 10,
    targetMetric: 'suicides',
    estimatedTime: 20,
    rewards: { xp: 100, badge: 'Speed Demon', streakBonus: 15 },
    tips: ['Touch every line', 'Explode out of turns', 'Pace yourself early']
  },
  {
    id: 'daily-physical-2',
    title: 'Core Power Day',
    description: 'Complete 100 core exercises: 25 crunches, 25 leg raises, 25 russian twists (each side), 25 planks (seconds).',
    category: 'physical',
    difficulty: 'Intermediate',
    targetType: 'reps',
    targetValue: 100,
    targetMetric: 'reps',
    estimatedTime: 15,
    rewards: { xp: 75, badge: null, streakBonus: 10 },
    tips: ['Engage your core throughout', 'Breathe steadily', 'Quality over speed']
  },
  {
    id: 'daily-physical-3',
    title: 'Vertical Jump Training',
    description: 'Complete 50 box jumps or rim touches to improve your vertical.',
    category: 'physical',
    difficulty: 'Intermediate',
    targetType: 'reps',
    targetValue: 50,
    targetMetric: 'jumps',
    estimatedTime: 20,
    rewards: { xp: 85, badge: null, streakBonus: 12 },
    tips: ['Land softly', 'Explode up', 'Use your arms']
  },
  {
    id: 'daily-physical-4',
    title: 'Defensive Slides',
    description: 'Complete 5 minutes of continuous defensive slides. Stay in your stance!',
    category: 'physical',
    difficulty: 'Beginner',
    targetType: 'time',
    targetValue: 300,
    targetMetric: 'seconds',
    estimatedTime: 8,
    rewards: { xp: 60, badge: null, streakBonus: 8 },
    tips: ['Stay low', 'Don\'t cross your feet', 'Keep your hands active']
  },
  {
    id: 'daily-physical-5',
    title: 'Ladder Footwork',
    description: 'Complete 20 agility ladder drills (various patterns).',
    category: 'physical',
    difficulty: 'Intermediate',
    targetType: 'reps',
    targetValue: 20,
    targetMetric: 'drills',
    estimatedTime: 15,
    rewards: { xp: 80, badge: null, streakBonus: 10 },
    tips: ['Light on your feet', 'Quick turnover', 'Don\'t look down']
  },
  {
    id: 'daily-physical-6',
    title: 'Endurance Run',
    description: 'Run 20 laps around the court without stopping. Build that game stamina!',
    category: 'physical',
    difficulty: 'Intermediate',
    targetType: 'reps',
    targetValue: 20,
    targetMetric: 'laps',
    estimatedTime: 25,
    rewards: { xp: 90, badge: 'Iron Lungs', streakBonus: 15 },
    tips: ['Find your pace', 'Breathe rhythmically', 'Push through the wall']
  },

  // DEFENSE CHALLENGES (4)
  {
    id: 'daily-defense-1',
    title: 'Closeout Drill',
    description: 'Complete 30 closeout drills. Sprint, chop your feet, contest the shot!',
    category: 'defense',
    difficulty: 'Beginner',
    targetType: 'reps',
    targetValue: 30,
    targetMetric: 'closeouts',
    estimatedTime: 15,
    rewards: { xp: 65, badge: null, streakBonus: 10 },
    tips: ['High hands on the close', 'Short choppy steps', 'Stay balanced']
  },
  {
    id: 'daily-defense-2',
    title: 'Mirror Drill',
    description: 'Complete 10 full-court mirror drills, staying in front of your partner/cone.',
    category: 'defense',
    difficulty: 'Intermediate',
    targetType: 'reps',
    targetValue: 10,
    targetMetric: 'drills',
    estimatedTime: 20,
    rewards: { xp: 85, badge: null, streakBonus: 12 },
    tips: ['React quickly', 'Stay in your stance', 'Don\'t reach']
  },
  {
    id: 'daily-defense-3',
    title: 'Help Defense Rotations',
    description: 'Practice 25 help and recover movements. Be in position to help!',
    category: 'defense',
    difficulty: 'Intermediate',
    targetType: 'reps',
    targetValue: 25,
    targetMetric: 'rotations',
    estimatedTime: 15,
    rewards: { xp: 75, badge: null, streakBonus: 10 },
    tips: ['See ball and man', 'Be ready to rotate', 'Communicate']
  },
  {
    id: 'daily-defense-4',
    title: 'Steal Machine',
    description: 'Practice 40 steal attempts - work on quick hands and anticipation.',
    category: 'defense',
    difficulty: 'Advanced',
    targetType: 'reps',
    targetValue: 40,
    targetMetric: 'attempts',
    estimatedTime: 20,
    rewards: { xp: 95, badge: 'Pick Pocket', streakBonus: 15 },
    tips: ['Time the dribble', 'Go for deflections', 'Stay in your stance']
  },

  // PASSING CHALLENGES (4)
  {
    id: 'daily-passing-1',
    title: 'Wall Pass Drill',
    description: 'Complete 100 chest passes against a wall. Work on accuracy and snap!',
    category: 'passing',
    difficulty: 'Beginner',
    targetType: 'reps',
    targetValue: 100,
    targetMetric: 'passes',
    estimatedTime: 12,
    rewards: { xp: 55, badge: null, streakBonus: 8 },
    tips: ['Step into your pass', 'Snap your wrists', 'Hit the same spot']
  },
  {
    id: 'daily-passing-2',
    title: 'Bounce Pass Precision',
    description: 'Complete 50 bounce passes through targets (chairs or cones as defenders).',
    category: 'passing',
    difficulty: 'Intermediate',
    targetType: 'reps',
    targetValue: 50,
    targetMetric: 'passes',
    estimatedTime: 15,
    rewards: { xp: 75, badge: null, streakBonus: 10 },
    tips: ['Bounce 2/3 of the way', 'Put backspin on it', 'Lead your target']
  },
  {
    id: 'daily-passing-3',
    title: 'Skip Pass Challenge',
    description: 'Complete 30 accurate skip passes across the court.',
    category: 'passing',
    difficulty: 'Intermediate',
    targetType: 'reps',
    targetValue: 30,
    targetMetric: 'passes',
    estimatedTime: 15,
    rewards: { xp: 80, badge: null, streakBonus: 12 },
    tips: ['Keep it flat', 'Use two hands', 'Step toward your target']
  },
  {
    id: 'daily-passing-4',
    title: 'One-Hand Wizardry',
    description: 'Master the one-hand pass with 25 accurate passes each hand.',
    category: 'passing',
    difficulty: 'Advanced',
    targetType: 'reps',
    targetValue: 50,
    targetMetric: 'passes',
    estimatedTime: 20,
    rewards: { xp: 100, badge: 'Court Vision', streakBonus: 15 },
    tips: ['Deceptive is key', 'Practice wrap-arounds', 'Eyes elsewhere']
  }
];

/**
 * Seed daily challenge templates to Firestore
 * Templates are stored in /dailyChallengeTemplates collection
 */
export const seedDailyChallengeTemplates = async () => {
  console.log('Starting to seed daily challenge templates...');

  try {
    const templatesRef = collection(db, 'dailyChallengeTemplates');

    for (const template of DAILY_CHALLENGE_TEMPLATES) {
      const docRef = doc(templatesRef, template.id);
      await setDoc(docRef, {
        ...template,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`Seeded template: ${template.title}`);
    }

    console.log(`Successfully seeded ${DAILY_CHALLENGE_TEMPLATES.length} daily challenge templates!`);
    return { success: true, count: DAILY_CHALLENGE_TEMPLATES.length };
  } catch (error) {
    console.error('Error seeding daily challenge templates:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate daily challenge for a specific date
 * Uses the template based on day of month to provide variety
 * @param {Date} date - The date to generate challenge for
 */
export const generateDailyChallengeForDate = async (date = new Date()) => {
  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const dayOfMonth = date.getDate();

  // Select template based on day of month (rotating through 30 templates)
  const templateIndex = (dayOfMonth - 1) % DAILY_CHALLENGE_TEMPLATES.length;
  const template = DAILY_CHALLENGE_TEMPLATES[templateIndex];

  try {
    const challengeRef = doc(db, 'dailyChallenges', dateString);

    const dailyChallenge = {
      id: dateString,
      date: date,
      templateId: template.id,
      title: template.title,
      description: template.description,
      category: template.category,
      difficulty: template.difficulty,
      targetType: template.targetType,
      targetValue: template.targetValue,
      targetMetric: template.targetMetric,
      estimatedTime: template.estimatedTime,
      rewards: template.rewards,
      tips: template.tips,
      createdAt: serverTimestamp(),
      participantCount: 0
    };

    await setDoc(challengeRef, dailyChallenge);
    console.log(`Generated daily challenge for ${dateString}: ${template.title}`);

    return { success: true, challenge: dailyChallenge };
  } catch (error) {
    console.error('Error generating daily challenge:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Seed daily challenges for the next 30 days
 * Useful for testing and ensuring challenges are available
 */
export const seedNext30DaysChallenges = async () => {
  console.log('Seeding daily challenges for the next 30 days...');

  const results = [];
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const result = await generateDailyChallengeForDate(date);
    results.push(result);
  }

  const successful = results.filter(r => r.success).length;
  console.log(`Successfully seeded ${successful}/30 daily challenges!`);

  return { success: successful === 30, seededCount: successful };
};

/**
 * Full seed function - seeds both templates and next 30 days of challenges
 */
export const seedDailyChallenges = async () => {
  console.log('=== Starting Daily Challenges Seed ===');

  // First seed templates
  const templateResult = await seedDailyChallengeTemplates();
  if (!templateResult.success) {
    return templateResult;
  }

  // Then seed next 30 days
  const challengesResult = await seedNext30DaysChallenges();

  console.log('=== Daily Challenges Seed Complete ===');

  return {
    success: templateResult.success && challengesResult.success,
    templatesSeeded: templateResult.count,
    challengesSeeded: challengesResult.seededCount
  };
};

export default {
  DAILY_CHALLENGE_TEMPLATES,
  seedDailyChallengeTemplates,
  generateDailyChallengeForDate,
  seedNext30DaysChallenges,
  seedDailyChallenges
};
