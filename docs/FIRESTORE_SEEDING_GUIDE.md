# Firestore Seeding Guide

## Overview

You can bulk upload all 29 workouts and achievements to Firestore using the seeding script. This is much faster than manually creating each record in Firebase Console.

## Quick Start

### 1. Install Dependencies

```bash
npm install firebase
```

### 2. Run the Seeding Script

```bash
# Dry run (shows what would be uploaded without uploading)
node scripts/seedWorkoutsAndAchievements.js --dry-run

# Actually upload the data
node scripts/seedWorkoutsAndAchievements.js

# Force overwrite existing data
node scripts/seedWorkoutsAndAchievements.js --force

# Upload only workouts
node scripts/seedWorkoutsAndAchievements.js --workouts

# Upload only achievements
node scripts/seedWorkoutsAndAchievements.js --achievements
```

## What Gets Uploaded

### Workouts (29 total)
The script uploads all workout templates from `src/data/workoutTemplates.js`:

**Shooting** (6 workouts)
- Beginner Shooting Basics (FREE)
- Free Throw Master (FREE)
- Mid-Range Mastery (BASIC)
- Three-Point Specialist (BASIC)
- Catch and Shoot Drills (PREMIUM)
- Contested Shot Creator (PRO)

**Dribbling** (6 workouts)
- Ball Handling Basics (FREE)
- Crossover Fundamentals (FREE)
- Behind the Back Moves (BASIC)
- Two Ball Dribbling (BASIC)
- Advanced Combo Moves (PREMIUM)
- Elite Ball Handler (PRO)

**Physical** (6 workouts)
- Basketball Conditioning (FREE)
- Speed and Agility (FREE)
- Suicide Drills (BASIC)
- Box Jumps and Plyometrics (BASIC)
- Advanced Conditioning (PREMIUM)
- Pro Athlete Training (PRO)

**Defense** (6 workouts)
- Defensive Stance Basics (FREE)
- Closeout Drills (FREE)
- Mirror Defense Drill (BASIC)
- Deny Defense (BASIC)
- Post Defense Techniques (PREMIUM)
- Elite Defender Program (PRO)

**Passing** (5 workouts)
- Passing Fundamentals (FREE)
- Chest and Bounce Passes (FREE)
- Overhead Passing (BASIC)
- Behind the Back Passes (BASIC)
- Advanced Court Vision (PREMIUM)

### Achievements (10 total)
Key achievements from `src/data/achievements.js`:

**Workouts**
- First Steps (1 workout)
- Getting Started (5 workouts)
- Building Momentum (10 workouts)
- Quarter Century (25 workouts)

**Streaks**
- Starting Strong (3-day streak)
- Week Warrior (7-day streak)
- Month Master (30-day streak)

**Mastery**
- Shooting Specialist (10 shooting workouts)
- Dribbling Master (10 dribbling workouts)

**Milestones**
- Level Up! (Reach Level 5)

## Firestore Structure

### Workouts Collection (`/workouts/{workoutId}`)
```javascript
{
  id: "shooting_1",
  name: "Beginner Shooting Basics",
  title: "Beginner Shooting Basics",
  description: "Learn fundamental shooting techniques",
  category: "shooting",
  difficulty: "Beginner",
  level: "Beginner",
  estimatedDuration: 20,
  duration: "20 min",
  requiredTier: "free",
  isPremium: false,
  featured: true,
  steps: [],
  equipment: ["Basketball", "Court space", "Water bottle"],
  coachNotes: "This beginner workout focuses on shooting...",
  createdAt: <timestamp>,
  updatedAt: <timestamp>
}
```

### Achievements Collection (`/achievements/{achievementId}`)
```javascript
{
  id: "first_workout",
  title: "First Steps",
  description: "Complete your first workout",
  category: "workouts",
  tier: "Bronze",
  xpReward: 50,
  condition: {
    type: "workout_count",
    target: 1
  },
  createdAt: <timestamp>,
  updatedAt: <timestamp>
}
```

## Using Firestore Data in Your App

### Option 1: Keep Using Code (Current Approach) ✅ **RECOMMENDED**

**Pros:**
- Faster (no network requests)
- Works offline
- Version controlled
- No database costs
- Simpler debugging

**Cons:**
- Requires app update to change content
- Can't do A/B testing

### Option 2: Switch to Firestore

To switch to using Firestore data, update `AppContext.js`:

```javascript
// CURRENT (line 201-206)
const loadGlobalData = async () => {
    try {
        const globalVideos = await getVideos();
        // Always use local workout templates
        setWorkouts(initialWorkouts);
        setTrainingVideos(globalVideos);
        console.log('Loaded workouts from templates:', initialWorkouts.length);
    } catch (error) {
        console.error('Error loading global data:', error);
        setWorkouts(initialWorkouts);
    }
};

// CHANGE TO (to use Firestore)
const loadGlobalData = async () => {
    try {
        const globalVideos = await getVideos();
        const globalWorkouts = await getWorkouts(); // Fetch from Firestore

        // Use Firestore data, fallback to templates
        setWorkouts(globalWorkouts.length > 0 ? globalWorkouts : initialWorkouts);
        setTrainingVideos(globalVideos);

        console.log('Loaded workouts from Firestore:', globalWorkouts.length);
    } catch (error) {
        console.error('Error loading global data:', error);
        setWorkouts(initialWorkouts); // Fallback to code
    }
};
```

**Pros:**
- Update content without app deployment
- A/B testing possible
- Can add region-specific content
- Easy content management

**Cons:**
- Database read costs (minimal)
- Slower initial load
- Requires network connection
- More complex

## Hybrid Approach (BEST OF BOTH) 🌟

**Use CODE for:**
- Template workouts (the 29 workouts)
- Default content

**Use FIRESTORE for:**
- User-created custom workouts
- User progress/stats
- Dynamic content (seasonal workouts, events)
- Featured/promoted workouts

This gives you the best of both worlds!

## Adding More Workouts Later

### To Code (Current Approach)
1. Edit `src/data/workoutTemplates.js`
2. Add new workout template
3. App update required

### To Firestore (If Using DB)
1. Add workout directly in Firebase Console
2. OR run the seeding script again with `--force`
3. Changes appear immediately in app (no update needed)

## Firestore Security Rules

Make sure your Firestore rules allow reading workouts and achievements:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Workouts - Anyone can read
    match /workouts/{workoutId} {
      allow read: if true;
      allow write: if false; // Only admins via console
    }

    // Achievements - Anyone can read
    match /achievements/{achievementId} {
      allow read: if true;
      allow write: if false; // Only admins via console
    }

    // User data - Only user can read/write
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

## Verification

After seeding, verify in Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database
4. Check collections:
   - `workouts` → Should have 29 documents
   - `achievements` → Should have 10+ documents

## Troubleshooting

### Error: "Firebase app not initialized"
- Make sure you've run `npm install firebase`
- Check that firebaseConfig is correct

### Error: "Permission denied"
- Check Firestore Security Rules
- Ensure rules allow write access for seeding

### "Already exists" messages
- Normal! Script skips existing documents by default
- Use `--force` to overwrite

### Want to delete all and re-seed?
1. Delete collections in Firebase Console
2. Run: `node scripts/seedWorkoutsAndAchievements.js --force`

## Best Practices

1. **Start with dry-run**: Always test with `--dry-run` first
2. **Keep code as source of truth**: Even if using Firestore, keep workoutTemplates.js updated
3. **Version control**: Commit changes to workoutTemplates.js before seeding
4. **Backup**: Export Firestore data before major changes
5. **Indexes**: Create composite indexes for complex queries

## Database Costs

With this approach:
- **Reads**: Free up to 50k/day (then $0.06 per 100k)
- **Writes**: Free up to 20k/day (then $0.18 per 100k)
- **Storage**: Free up to 1GB

For 1000 users loading 29 workouts each:
- 29,000 reads/day
- **Cost: $0** (under free tier)

## Summary

**Current Setup (Recommended):**
- ✅ Workouts in code (fast, free, offline)
- ✅ User data in Firestore (progress, stats)
- ✅ Best performance and cost

**Optional:** Use seeding script to populate Firestore as a backup or for future CMS features.
