// seedWorkoutsAndAchievements.js - Bulk upload all workouts and achievements to Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDoc, serverTimestamp } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDcDAGYFdLFZOOo7snvbfSBdknH89LmQ_8",
  authDomain: "basketball-ai-app-db000.firebaseapp.com",
  projectId: "basketball-ai-app-db000",
  storageBucket: "basketball-ai-app-db000.firebasestorage.app",
  messagingSenderId: "764475749989",
  appId: "1:764475749989:web:9540a3e383dcb30daaf88c",
  measurementId: "G-R48NZXG8YP"
};

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const onlyWorkouts = args.includes('--workouts');
const onlyAchievements = args.includes('--achievements');

console.log('=% Firestore Seeding Script for Workouts & Achievements\n');
console.log(''.repeat(60));

if (isDryRun) {
  console.log('= DRY RUN MODE - No data will be uploaded');
}
if (isForce) {
  console.log('   FORCE MODE - Will overwrite existing data');
}
console.log('');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * ALL WORKOUT TEMPLATES
 * These are the 29 workouts from src/data/workoutTemplates.js
 */
const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  PRO: 'pro'
};

const WORKOUT_TEMPLATES = [
  // SHOOTING WORKOUTS (6 total)
  {
    id: 'shooting_1',
    name: 'Beginner Shooting Basics',
    category: 'Shooting',
    difficulty: 'Beginner',
    description: 'Learn fundamental shooting techniques',
    estimatedDuration: 20,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
  },
  {
    id: 'shooting_2',
    name: 'Free Throw Master',
    category: 'Shooting',
    difficulty: 'Beginner',
    description: 'Perfect your free throw technique',
    estimatedDuration: 15,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
  },
  {
    id: 'shooting_3',
    name: 'Mid-Range Mastery',
    category: 'Shooting',
    difficulty: 'Intermediate',
    description: 'Develop consistency from mid-range',
    estimatedDuration: 30,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
  },
  {
    id: 'shooting_4',
    name: 'Three-Point Specialist',
    category: 'Shooting',
    difficulty: 'Intermediate',
    description: 'Extend your range beyond the arc',
    estimatedDuration: 35,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
  },
  {
    id: 'shooting_5',
    name: 'Catch and Shoot Drills',
    category: 'Shooting',
    difficulty: 'Advanced',
    description: 'Quick release shooting off the catch',
    estimatedDuration: 25,
    requiredTier: SUBSCRIPTION_TIERS.PREMIUM,
  },
  {
    id: 'shooting_6',
    name: 'Contested Shot Creator',
    category: 'Shooting',
    difficulty: 'Expert',
    description: 'Master shooting under defensive pressure',
    estimatedDuration: 40,
    requiredTier: SUBSCRIPTION_TIERS.PRO,
  },

  // DRIBBLING WORKOUTS (6 total)
  {
    id: 'dribbling_1',
    name: 'Ball Handling Basics',
    category: 'Dribbling',
    difficulty: 'Beginner',
    description: 'Master fundamental dribbling techniques',
    estimatedDuration: 20,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
  },
  {
    id: 'dribbling_2',
    name: 'Crossover Fundamentals',
    category: 'Dribbling',
    difficulty: 'Beginner',
    description: 'Learn the essential crossover move',
    estimatedDuration: 25,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
  },
  {
    id: 'dribbling_3',
    name: 'Behind the Back Moves',
    category: 'Dribbling',
    difficulty: 'Intermediate',
    description: 'Add behind-the-back dribbles to your arsenal',
    estimatedDuration: 30,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
  },
  {
    id: 'dribbling_4',
    name: 'Two Ball Dribbling',
    category: 'Dribbling',
    difficulty: 'Intermediate',
    description: 'Improve coordination with two-ball drills',
    estimatedDuration: 25,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
  },
  {
    id: 'dribbling_5',
    name: 'Advanced Combo Moves',
    category: 'Dribbling',
    difficulty: 'Advanced',
    description: 'Chain multiple moves together',
    estimatedDuration: 35,
    requiredTier: SUBSCRIPTION_TIERS.PREMIUM,
  },
  {
    id: 'dribbling_6',
    name: 'Elite Ball Handler',
    category: 'Dribbling',
    difficulty: 'Expert',
    description: 'Master complex dribbling sequences',
    estimatedDuration: 40,
    requiredTier: SUBSCRIPTION_TIERS.PRO,
  },

  // PHYSICAL WORKOUTS (6 total)
  {
    id: 'physical_1',
    name: 'Basketball Conditioning',
    category: 'Physical',
    difficulty: 'Beginner',
    description: 'Build your basketball fitness foundation',
    estimatedDuration: 30,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
  },
  {
    id: 'physical_2',
    name: 'Speed and Agility',
    category: 'Physical',
    difficulty: 'Beginner',
    description: 'Improve your speed and quickness',
    estimatedDuration: 25,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
  },
  {
    id: 'physical_3',
    name: 'Suicide Drills',
    category: 'Physical',
    difficulty: 'Intermediate',
    description: 'High-intensity court sprints',
    estimatedDuration: 20,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
  },
  {
    id: 'physical_4',
    name: 'Box Jumps and Plyometrics',
    category: 'Physical',
    difficulty: 'Intermediate',
    description: 'Explosive power development',
    estimatedDuration: 30,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
  },
  {
    id: 'physical_5',
    name: 'Advanced Conditioning',
    category: 'Physical',
    difficulty: 'Advanced',
    description: 'Elite-level basketball conditioning',
    estimatedDuration: 40,
    requiredTier: SUBSCRIPTION_TIERS.PREMIUM,
  },
  {
    id: 'physical_6',
    name: 'Pro Athlete Training',
    category: 'Physical',
    difficulty: 'Expert',
    description: 'Train like a professional athlete',
    estimatedDuration: 50,
    requiredTier: SUBSCRIPTION_TIERS.PRO,
  },

  // DEFENSE WORKOUTS (6 total)
  {
    id: 'defense_1',
    name: 'Defensive Stance Basics',
    category: 'Defense',
    difficulty: 'Beginner',
    description: 'Learn proper defensive positioning',
    estimatedDuration: 20,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
  },
  {
    id: 'defense_2',
    name: 'Closeout Drills',
    category: 'Defense',
    difficulty: 'Beginner',
    description: 'Master closing out on shooters',
    estimatedDuration: 25,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
  },
  {
    id: 'defense_3',
    name: 'Mirror Defense Drill',
    category: 'Defense',
    difficulty: 'Intermediate',
    description: 'Stay in front of your opponent',
    estimatedDuration: 30,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
  },
  {
    id: 'defense_4',
    name: 'Deny Defense',
    category: 'Defense',
    difficulty: 'Intermediate',
    description: 'Prevent passes and cuts',
    estimatedDuration: 25,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
  },
  {
    id: 'defense_5',
    name: 'Post Defense Techniques',
    category: 'Defense',
    difficulty: 'Advanced',
    description: 'Defend in the post effectively',
    estimatedDuration: 30,
    requiredTier: SUBSCRIPTION_TIERS.PREMIUM,
  },
  {
    id: 'defense_6',
    name: 'Elite Defender Program',
    category: 'Defense',
    difficulty: 'Expert',
    description: 'Become a lockdown defender',
    estimatedDuration: 40,
    requiredTier: SUBSCRIPTION_TIERS.PRO,
  },

  // PASSING WORKOUTS (5 total)
  {
    id: 'passing_1',
    name: 'Passing Fundamentals',
    category: 'Passing',
    difficulty: 'Beginner',
    description: 'Master basic passing techniques',
    estimatedDuration: 20,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
  },
  {
    id: 'passing_2',
    name: 'Chest and Bounce Passes',
    category: 'Passing',
    difficulty: 'Beginner',
    description: 'Perfect your basic passes',
    estimatedDuration: 15,
    requiredTier: SUBSCRIPTION_TIERS.FREE,
  },
  {
    id: 'passing_3',
    name: 'Overhead Passing',
    category: 'Passing',
    difficulty: 'Intermediate',
    description: 'Pass over defenders effectively',
    estimatedDuration: 20,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
  },
  {
    id: 'passing_4',
    name: 'Behind the Back Passes',
    category: 'Passing',
    difficulty: 'Intermediate',
    description: 'Add flair to your passing game',
    estimatedDuration: 25,
    requiredTier: SUBSCRIPTION_TIERS.BASIC,
  },
  {
    id: 'passing_5',
    name: 'Advanced Court Vision',
    category: 'Passing',
    difficulty: 'Advanced',
    description: 'See and execute complex passes',
    estimatedDuration: 30,
    requiredTier: SUBSCRIPTION_TIERS.PREMIUM,
  },
];

/**
 * KEY ACHIEVEMENTS
 */
const ACHIEVEMENTS = [
  {
    id: 'first_workout',
    title: 'First Steps',
    description: 'Complete your first workout',
    category: 'workouts',
    tier: 'Bronze',
    xpReward: 50,
    condition: { type: 'workout_count', target: 1 }
  },
  {
    id: 'five_workouts',
    title: 'Getting Started',
    description: 'Complete 5 workouts',
    category: 'workouts',
    tier: 'Bronze',
    xpReward: 50,
    condition: { type: 'workout_count', target: 5 }
  },
  {
    id: 'ten_workouts',
    title: 'Building Momentum',
    description: 'Complete 10 workouts',
    category: 'workouts',
    tier: 'Silver',
    xpReward: 100,
    condition: { type: 'workout_count', target: 10 }
  },
  {
    id: 'twenty_five_workouts',
    title: 'Quarter Century',
    description: 'Complete 25 workouts',
    category: 'workouts',
    tier: 'Gold',
    xpReward: 200,
    condition: { type: 'workout_count', target: 25 }
  },
  {
    id: 'first_streak',
    title: 'Starting Strong',
    description: 'Achieve a 3-day workout streak',
    category: 'streaks',
    tier: 'Bronze',
    xpReward: 50,
    condition: { type: 'streak', target: 3 }
  },
  {
    id: 'week_warrior',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    category: 'streaks',
    tier: 'Silver',
    xpReward: 100,
    condition: { type: 'streak', target: 7 }
  },
  {
    id: 'month_master',
    title: 'Month Master',
    description: 'Maintain a 30-day streak',
    category: 'streaks',
    tier: 'Gold',
    xpReward: 200,
    condition: { type: 'streak', target: 30 }
  },
  {
    id: 'shooting_specialist',
    title: 'Shooting Specialist',
    description: 'Complete 10 shooting workouts',
    category: 'mastery',
    tier: 'Silver',
    xpReward: 100,
    condition: { type: 'category_workouts', category: 'Shooting', target: 10 }
  },
  {
    id: 'dribbling_master',
    title: 'Dribbling Master',
    description: 'Complete 10 dribbling workouts',
    category: 'mastery',
    tier: 'Silver',
    xpReward: 100,
    condition: { type: 'category_workouts', category: 'Dribbling', target: 10 }
  },
  {
    id: 'level_up',
    title: 'Level Up!',
    description: 'Reach Level 5',
    category: 'milestones',
    tier: 'Gold',
    xpReward: 200,
    condition: { type: 'level', target: 5 }
  },
];

/**
 * Convert workout to Firestore format
 */
function convertWorkoutToFirestore(workout) {
  const categoryLower = workout.category.toLowerCase();
  const difficultyLower = workout.difficulty.toLowerCase();

  return {
    id: workout.id,
    name: workout.name,
    title: workout.name,
    description: workout.description,
    category: categoryLower,
    difficulty: workout.difficulty,
    level: workout.difficulty,
    estimatedDuration: workout.estimatedDuration,
    duration: workout.estimatedDuration + ' min',
    requiredTier: workout.requiredTier,
    isPremium: workout.requiredTier !== 'free',
    featured: workout.requiredTier === 'free',
    steps: [],
    equipment: ['Basketball', 'Court space', 'Water bottle'],
    coachNotes: 'This ' + difficultyLower + ' workout focuses on ' + categoryLower + ' and takes approximately ' + workout.estimatedDuration + ' minutes to complete.',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

/**
 * Seed workouts to Firestore
 */
async function seedWorkouts() {
  console.log('\n=Ë Seeding Workouts...\n');
  console.log('Found ' + WORKOUT_TEMPLATES.length + ' workouts to upload');

  if (isDryRun) {
    console.log('\n= DRY RUN - Would upload:');
    WORKOUT_TEMPLATES.forEach(workout => {
      console.log('  - ' + workout.name + ' (' + workout.category + ', ' + workout.difficulty + ', ' + workout.requiredTier + ')');
    });
    return { success: true, count: WORKOUT_TEMPLATES.length };
  }

  let uploadCount = 0;
  let skipCount = 0;

  for (const workout of WORKOUT_TEMPLATES) {
    const workoutData = convertWorkoutToFirestore(workout);
    const docRef = doc(db, 'workouts', workout.id);

    try {
      // Check if exists
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && !isForce) {
        console.log('í  Skipping ' + workout.name + ' (already exists)');
        skipCount++;
        continue;
      }

      await setDoc(docRef, workoutData, { merge: !isForce });
      uploadCount++;
      console.log(' Uploaded ' + workout.name);
    } catch (error) {
      console.error('L Error uploading ' + workout.name + ':', error.message);
    }
  }

  console.log('\n=Ê Summary: ' + uploadCount + ' uploaded, ' + skipCount + ' skipped');
  return { success: true, count: uploadCount };
}

/**
 * Seed achievements to Firestore
 */
async function seedAchievements() {
  console.log('\n<Æ Seeding Achievements...\n');
  console.log('Found ' + ACHIEVEMENTS.length + ' achievements to upload');

  if (isDryRun) {
    console.log('\n= DRY RUN - Would upload:');
    ACHIEVEMENTS.forEach(achievement => {
      console.log('  - ' + achievement.title + ' (' + achievement.category + ', ' + achievement.tier + ')');
    });
    return { success: true, count: ACHIEVEMENTS.length };
  }

  let uploadCount = 0;
  let skipCount = 0;

  for (const achievement of ACHIEVEMENTS) {
    const docRef = doc(db, 'achievements', achievement.id);

    try {
      // Check if exists
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && !isForce) {
        console.log('í  Skipping ' + achievement.title + ' (already exists)');
        skipCount++;
        continue;
      }

      await setDoc(docRef, {
        ...achievement,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: !isForce });
      uploadCount++;
      console.log(' Uploaded ' + achievement.title);
    } catch (error) {
      console.error('L Error uploading ' + achievement.title + ':', error.message);
    }
  }

  console.log('\n=Ê Summary: ' + uploadCount + ' uploaded, ' + skipCount + ' skipped');
  return { success: true, count: uploadCount };
}

/**
 * Main execution
 */
async function main() {
  try {
    const results = {
      workouts: { success: false, count: 0 },
      achievements: { success: false, count: 0 }
    };

    // Seed workouts
    if (!onlyAchievements) {
      results.workouts = await seedWorkouts();
    }

    // Seed achievements
    if (!onlyWorkouts) {
      results.achievements = await seedAchievements();
    }

    // Final summary
    console.log('\n' + ''.repeat(60));
    console.log('=Ê Final Summary:\n');
    if (!onlyAchievements) {
      console.log('   Workouts: ' + results.workouts.count + ' uploaded');
    }
    if (!onlyWorkouts) {
      console.log('   Achievements: ' + results.achievements.count + ' uploaded');
    }
    console.log('\n Seeding complete!');

    if (isDryRun) {
      console.log('\n=¡ Run without --dry-run to actually upload the data');
    }
    if (!isForce && !isDryRun) {
      console.log('\n=¡ Use --force to overwrite existing data');
    }

    process.exit(0);
  } catch (error) {
    console.error('\nL Error during seeding:', error);
    process.exit(1);
  }
}

// Run the script
main();
