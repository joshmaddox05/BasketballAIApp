#!/bin/bash
# Quick build starter script

echo "🏀 Basketball AI App - EAS Build"
echo "=================================="
echo ""
echo "This will build the app for your physical device so the camera works!"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check EAS login
echo "📋 Checking EAS login..."
if npx eas whoami > /dev/null 2>&1; then
    USERNAME=$(npx eas whoami 2>/dev/null | grep -v "eas-cli" | grep -v "Proceeding" | head -1)
    echo -e "${GREEN}✅ Logged in as: $USERNAME${NC}"
else
    echo -e "${YELLOW}⚠️  Not logged in to EAS${NC}"
    echo "Run: npx eas login"
    exit 1
fi
echo ""

# Platform selection
echo "📱 Which platform do you want to build for?"
echo ""
echo "1) Android (Recommended - fastest, easiest)"
echo "   ✅ APK file - install directly"
echo "   ⏱️  10-15 minutes"
echo "   📦 No special requirements"
echo ""
echo "2) iOS (iPhone)"
echo "   ✅ TestFlight or direct install"
echo "   ⏱️  20-30 minutes"
echo "   🍎 Requires Apple Developer account"
echo ""
echo "3) Both (Android + iOS)"
echo "   ⏱️  30-45 minutes total"
echo ""

read -p "Choose (1/2/3): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}🤖 Building for Android...${NC}"
        echo ""
        echo "This will:"
        echo "  1. Build an APK file (10-15 min)"
        echo "  2. Give you a download link"
        echo "  3. You can install directly on Android phone"
        echo ""
        read -p "Continue? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npx eas build --profile preview --platform android
        fi
        ;;
    2)
        echo ""
        echo -e "${BLUE}🍎 Building for iOS...${NC}"
        echo ""
        echo "This will:"
        echo "  1. Build an IPA file (20-30 min)"
        echo "  2. Set up certificates (if needed)"
        echo "  3. Upload to TestFlight or give install link"
        echo ""
        echo "⚠️  You'll need your Apple ID during the build"
        echo ""
        read -p "Continue? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npx eas build --profile preview --platform ios
        fi
        ;;
    3)
        echo ""
        echo -e "${BLUE}📱 Building for Both Platforms...${NC}"
        echo ""
        echo "This will:"
        echo "  1. Build Android APK (10-15 min)"
        echo "  2. Build iOS IPA (20-30 min)"
        echo "  3. Total: ~30-45 minutes"
        echo ""
        read -p "Continue? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npx eas build --profile preview --platform all
        fi
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "================================================"
echo -e "${GREEN}✨ Build Started!${NC}"
echo "================================================"
echo ""
echo "📋 What happens next:"
echo ""
echo "1. EAS will build your app in the cloud"
echo "2. You'll see progress in the terminal"
echo "3. When done, you'll get:"
echo "   • Download URL"
echo "   • QR code to scan"
echo "   • Installation instructions"
echo ""
echo "4. You can check status anytime:"
echo "   npx eas build:list"
echo ""
echo "5. Or visit: https://expo.dev"
echo ""
echo "================================================"
echo ""
echo "⏰ Estimated time:"
echo "   Android: 10-15 minutes"
echo "   iOS: 20-30 minutes"
echo ""
echo "☕ Grab a coffee and wait for the build!"
echo ""
echo "💡 TIP: You can close this terminal."
echo "   Build continues in the cloud!"
echo ""
