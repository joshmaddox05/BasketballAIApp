#!/bin/bash

# Production Setup Script for Basketball AI App
# This script sets up the app for production deployment

echo "🏀 Basketball AI App - Production Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Firebase CLI is installed
echo "🔍 Checking Firebase CLI..."
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI not found. Installing..."
    npm install -g firebase-tools
    if [ $? -ne 0 ]; then
        print_error "Failed to install Firebase CLI"
        exit 1
    fi
    print_status "Firebase CLI installed successfully"
else
    print_status "Firebase CLI is already installed"
fi

# Check if EAS CLI is installed
echo "🔍 Checking EAS CLI..."
if ! command -v eas &> /dev/null; then
    print_error "EAS CLI not found. Installing..."
    npm install -g @expo/eas-cli
    if [ $? -ne 0 ]; then
        print_error "Failed to install EAS CLI"
        exit 1
    fi
    print_status "EAS CLI installed successfully"
else
    print_status "EAS CLI is already installed"
fi

# Check Firebase authentication
echo "🔐 Checking Firebase authentication..."
firebase projects:list &> /dev/null
if [ $? -ne 0 ]; then
    print_warning "Not logged in to Firebase. Please login:"
    firebase login
    if [ $? -ne 0 ]; then
        print_error "Failed to login to Firebase"
        exit 1
    fi
fi
print_status "Firebase authentication verified"

# Check EAS authentication
echo "🔐 Checking EAS authentication..."
eas whoami &> /dev/null
if [ $? -ne 0 ]; then
    print_warning "Not logged in to EAS. Please login:"
    eas login
    if [ $? -ne 0 ]; then
        print_error "Failed to login to EAS"
        exit 1
    fi
fi
print_status "EAS authentication verified"

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi
print_status "Dependencies installed successfully"

# Firebase dependencies no longer needed - using Firebase JS SDK instead
# Removed React Native Firebase packages in favor of Firebase JS SDK (firebase: ^12.4.0)
# echo "🔥 Installing Firebase dependencies..."
# npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore @react-native-firebase/storage
print_status "Using Firebase JS SDK (already in package.json)"

# Deploy Firestore rules and indexes
echo "🚀 Deploying Firestore rules and indexes..."
firebase deploy --only firestore:rules,firestore:indexes --project basketball-ai-app-db000
if [ $? -ne 0 ]; then
    print_error "Failed to deploy Firestore rules and indexes"
    exit 1
fi
print_status "Firestore rules and indexes deployed successfully"

# Populate workout templates
echo "📊 Populating workout templates..."
if [ -f "scripts/populateWorkoutTemplates.js" ]; then
    node scripts/populateWorkoutTemplates.js
    if [ $? -eq 0 ]; then
        print_status "Workout templates populated successfully"
    else
        print_warning "Failed to populate workout templates (this is optional)"
    fi
else
    print_warning "Workout templates script not found"
fi

# Check for required config files
echo "🔍 Checking configuration files..."

# Check for iOS GoogleService-Info.plist
if [ -f "ios/GoogleService-Info.plist" ]; then
    print_status "iOS GoogleService-Info.plist found"
else
    print_error "iOS GoogleService-Info.plist not found. Please add it to ios/GoogleService-Info.plist"
fi

# Check for Android google-services.json
if [ -f "android/app/google-services.json" ]; then
    print_status "Android google-services.json found"
else
    print_warning "Android google-services.json not found. You'll need to add it for Android builds"
fi

# Create development build
echo "🔨 Creating development build..."
print_info "This will create a development build for testing. Choose your platform:"
echo "1) iOS"
echo "2) Android"
echo "3) Both"
echo "4) Skip (create later)"
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        print_info "Creating iOS development build..."
        eas build --profile development --platform ios
        ;;
    2)
        print_info "Creating Android development build..."
        eas build --profile development --platform android
        ;;
    3)
        print_info "Creating both iOS and Android development builds..."
        eas build --profile development --platform all
        ;;
    4)
        print_info "Skipping development build creation"
        ;;
    *)
        print_warning "Invalid choice. Skipping development build creation"
        ;;
esac

# Final status
echo ""
echo "🎉 Production setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Add your Firebase config files if not already present:"
echo "   - iOS: ios/GoogleService-Info.plist"
echo "   - Android: android/app/google-services.json"
echo ""
echo "2. Test your app with the development build:"
echo "   - Install the development build on your device"
echo "   - Run: npx expo start"
echo "   - Scan the QR code with your development build"
echo ""
echo "3. When ready for production:"
echo "   - eas build --profile production --platform all"
echo "   - eas submit --platform all"
echo ""
echo "4. Set up RevenueCat for monetization (optional):"
echo "   - npm install react-native-purchases"
echo "   - Configure products in RevenueCat dashboard"
echo ""
echo "🔗 Useful links:"
echo "- Firebase Console: https://console.firebase.google.com/project/basketball-ai-app-db000"
echo "- EAS Dashboard: https://expo.dev/accounts/jmaddox0503/projects/basketball-ai-app"
echo "- App Store Connect: https://appstoreconnect.apple.com"
echo "- Google Play Console: https://play.google.com/console"
echo ""
print_status "Setup complete! Happy coding! 🚀"
