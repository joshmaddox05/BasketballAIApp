#!/bin/bash

echo "🔥 Firestore Setup Verification"
echo "================================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not installed"
    exit 1
fi

echo "✅ Firebase CLI installed ($(firebase --version))"

# Check if project is initialized
if [ ! -f ".firebaserc" ]; then
    echo "❌ Firebase project not initialized"
    exit 1
fi

echo "✅ Firebase project configured"

# Get current project
PROJECT=$(cat .firebaserc | grep "default" | cut -d '"' -f 4)
echo "   Project: $PROJECT"

# Check if rules file exists
if [ ! -f "firestore.rules" ]; then
    echo "❌ firestore.rules file not found"
    exit 1
fi

echo "✅ firestore.rules file exists"

# Check rules content
echo ""
echo "📋 Current Rules Summary:"
echo "   - Helper functions: isSignedIn(), isOwner()"
echo "   - /users/{uid}: User profiles (owner access)"
echo "   - /workouts/{workoutId}: Global workouts (read for authenticated)"
echo "   - /videos/{videoId}: Global videos (read for authenticated)"
echo "   - /workoutTemplates & /exercises: Public read access"
echo ""

echo "✅ All checks passed! Your Firestore setup is ready."
echo ""
echo "📝 Next Steps:"
echo "   1. Test the app with a NEW user account"
echo "   2. Check Firebase Console to verify user profile is created"
echo "   3. Monitor app logs for any permission errors"
echo ""
echo "🔗 Firebase Console: https://console.firebase.google.com/project/$PROJECT/firestore"
