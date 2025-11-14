#!/usr/bin/env bash
# EAS Build Post-Install Hook
# This script runs after npm install but before the iOS build

set -e

echo "🔧 Running EAS post-install hook..."

# Check if running on EAS (not locally)
if [ -n "$EAS_BUILD" ]; then
  echo "📱 EAS Build detected"

  # Navigate to iOS directory
  cd ios

  # Install pods if needed
  if [ -f "Podfile" ]; then
    echo "📦 Installing CocoaPods dependencies..."

    # Clear any existing pod cache
    pod cache clean --all || true

    # Install pods
    pod install --repo-update

    echo "✅ CocoaPods dependencies installed"
  fi

  cd ..

  echo "✅ Post-install hook completed successfully"
else
  echo "⚠️  Not running on EAS, skipping post-install hook"
fi
