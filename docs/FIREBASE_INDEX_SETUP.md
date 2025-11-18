# Firebase Index Setup Instructions

## Required Firestore Index

To enable full query functionality for workout analytics, you need to create a composite index in Firebase.

### Why This Index is Needed

The app queries workout data using multiple fields:
- `type` (to filter for workout activities)
- `createdAt` (to sort by date and filter by date range)
- `category` (optional filter for workout categories)

Firestore requires a composite index when you combine equality filters with ordering.

### Quick Setup (Recommended)

When you see the error message in your console, it will include a direct link to create the index. It looks like this:

```
https://console.firebase.google.com/v1/r/project/basketball-ai-app-db000/firestore/indexes?create_composite=...
```

**Simply click this link** and Firebase will automatically set up the correct index for you!

### Manual Setup (Alternative)

If you prefer to create the index manually:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `basketball-ai-app-db000`
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Set up the index with these settings:
   - **Collection ID**: `activities` (in collection group mode)
   - **Fields to index**:
     - `type` - Ascending
     - `createdAt` - Descending
   - Click **Create**

### Index Build Time

- Small databases: 1-2 minutes
- Larger databases: 5-10 minutes

You'll receive an email when the index is ready. The app will automatically work better once it's built!

### Current Workaround

The app currently uses **in-memory filtering** as a workaround, which means:
- ✅ The app works without the index
- ✅ No crashes or errors
- ⚠️ Slightly less efficient for large datasets (1000+ workouts)

Once you create the index, the app will automatically use more efficient Firestore queries.

## Testing After Index Creation

After the index is built, test these features:
1. Navigate to Progress screen
2. Check the Overview tab (should load faster)
3. Switch between Week/Month/Year timeframes
4. View the Skills tab to see category breakdown
5. Check the History tab for recent workouts

All features should work smoothly with real-time data!
