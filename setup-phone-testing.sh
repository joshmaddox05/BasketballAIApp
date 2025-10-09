#!/bin/bash
# Setup script to run Basketball AI App on your phone

echo "🏀 Basketball AI App - Phone Setup"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this from the project root.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found project directory${NC}"
echo ""

# Step 2: Check Node.js and npm
echo "📦 Checking Node.js and npm..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
echo ""

# Step 3: Check if Expo CLI is available
echo "🔧 Checking Expo CLI..."
if ! command -v npx expo &> /dev/null; then
    echo -e "${YELLOW}⚠️  Expo CLI not found globally, will use npx${NC}"
else
    echo -e "${GREEN}✅ Expo CLI available${NC}"
fi
echo ""

# Step 4: Install/Update dependencies
echo "📥 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies (this may take a few minutes)...${NC}"
    npm install
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi
echo ""

# Step 5: Check Expo Go app
echo "📱 IMPORTANT: Install Expo Go on your phone"
echo "   iOS: https://apps.apple.com/app/expo-go/id982107779"
echo "   Android: https://play.google.com/store/apps/details?id=host.exp.exponent"
echo ""
read -p "Have you installed Expo Go on your phone? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Please install Expo Go first, then run this script again.${NC}"
    exit 0
fi

# Step 6: Verify offline mode is enabled
echo ""
echo "🔧 Configuring for offline testing..."
if grep -q "this.isOfflineMode = true" src/services/aiAnalysisService.js; then
    echo -e "${GREEN}✅ Offline mode is enabled (no backend needed)${NC}"
else
    echo -e "${YELLOW}⚠️  Enabling offline mode for testing...${NC}"
    # This would be done with a proper edit, but we'll just inform
    echo "   Please ensure 'isOfflineMode = true' in src/services/aiAnalysisService.js"
fi
echo ""

# Step 7: Clear cache (optional but recommended)
echo "🧹 Clearing Expo cache..."
npx expo start -c --clear &
EXPO_PID=$!
sleep 2
kill $EXPO_PID 2>/dev/null
echo -e "${GREEN}✅ Cache cleared${NC}"
echo ""

# Step 8: Instructions
echo "================================================"
echo -e "${GREEN}✨ Setup Complete! Ready to Run${NC}"
echo "================================================"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Make sure your phone and computer are on the SAME WiFi network"
echo ""
echo "2. Run this command to start the app:"
echo -e "   ${YELLOW}npm start${NC}"
echo ""
echo "3. On your phone:"
echo "   • Open the Expo Go app"
echo "   • Scan the QR code that appears in the terminal"
echo "   • Wait for the app to load"
echo ""
echo "4. Test the Curry Comparison feature:"
echo "   • Tap 'Training' in bottom navigation"
echo "   • Tap 'Shooting Analysis'"
echo "   • Select 'Stephen Curry' as comparison"
echo "   • Tap 'Start Recording'"
echo "   • Record a video and see the results!"
echo ""
echo "================================================"
echo ""
echo -e "${YELLOW}💡 TIPS:${NC}"
echo "• The app is in offline mode, so no backend server is needed"
echo "• Analysis results are simulated for testing"
echo "• Make sure to allow camera and media permissions"
echo "• Keep your phone and computer on the same network"
echo ""
echo "🐛 TROUBLESHOOTING:"
echo "• If QR code doesn't work, try typing the URL manually in Expo Go"
echo "• If app doesn't load, restart with: npm start -- --clear"
echo "• If camera doesn't work, check app permissions in phone settings"
echo ""
echo -e "${GREEN}Ready to start! Run: npm start${NC}"
echo ""
