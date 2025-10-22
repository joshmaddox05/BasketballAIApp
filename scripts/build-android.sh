#!/bin/bash

# Build Android development build with automatic responses
echo "🤖 Building Android Development Build"
echo "====================================="

# Generate Android keystore automatically
echo "y" | eas build --profile development --platform android --non-interactive

echo ""
echo "✅ Android build initiated!"
echo "📱 Check the build status at: https://expo.dev/accounts/jmaddox0503/projects/basketball-ai-app/builds"

