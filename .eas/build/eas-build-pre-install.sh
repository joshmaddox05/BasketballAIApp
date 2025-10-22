#!/usr/bin/env bash
# EAS Build Hook: eas-build-pre-install.sh
# This runs BEFORE npm install and BEFORE expo prebuild

set -e

echo ""
echo "🔥 [EAS Hook] Injecting Firebase configuration files..."
echo "=================================================="

# iOS: GoogleService-Info.plist
if [ -n "$GOOGLE_SERVICES_INFO_PLIST" ]; then
    echo "📝 Creating ios directory..."
    mkdir -p ios
    
    echo "📝 Decoding GoogleService-Info.plist..."
    echo "$GOOGLE_SERVICES_INFO_PLIST" | base64 --decode > ios/GoogleService-Info.plist
    
    if [ -f "ios/GoogleService-Info.plist" ]; then
        echo "✅ GoogleService-Info.plist created successfully"
        ls -lh ios/GoogleService-Info.plist
    else
        echo "❌ Failed to create GoogleService-Info.plist"
        exit 1
    fi
else
    echo "⚠️  WARNING: GOOGLE_SERVICES_INFO_PLIST environment variable not set"
    echo "    This will cause the build to fail!"
    echo "    Run: eas secret:list to verify secrets exist"
    exit 1
fi

# Android: google-services.json
if [ -n "$GOOGLE_SERVICES_JSON" ]; then
    echo "📝 Creating android/app directory..."
    mkdir -p android/app
    
    echo "📝 Decoding google-services.json..."
    echo "$GOOGLE_SERVICES_JSON" | base64 --decode > android/app/google-services.json
    
    if [ -f "android/app/google-services.json" ]; then
        echo "✅ google-services.json created successfully"
        ls -lh android/app/google-services.json
    else
        echo "❌ Failed to create google-services.json"
    fi
else
    echo "⚠️  WARNING: GOOGLE_SERVICES_JSON environment variable not set"
    echo "    Android builds may fail if Firebase is required"
fi

echo ""
echo "✅ Firebase configuration injection complete!"
echo "=================================================="
echo ""
