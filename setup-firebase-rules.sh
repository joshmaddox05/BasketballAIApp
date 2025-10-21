#!/bin/bash

# Firebase Security Rules Setup Script
# This script helps you deploy Firestore security rules to fix permission errors

echo "🔥 Firebase Security Rules Setup"
echo "================================"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Firebase CLI. Please install manually:"
        echo "   npm install -g firebase-tools"
        exit 1
    fi
    echo "✅ Firebase CLI installed successfully"
else
    echo "✅ Firebase CLI is already installed"
fi

# Check if user is logged in
echo "🔐 Checking Firebase authentication..."
firebase projects:list &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Firebase. Please login:"
    firebase login
    if [ $? -ne 0 ]; then
        echo "❌ Failed to login to Firebase"
        exit 1
    fi
fi

echo "✅ Firebase authentication verified"

# Initialize Firebase project if needed
if [ ! -f "firebase.json" ]; then
    echo "🔧 Initializing Firebase project..."
    firebase init firestore --project basketball-ai-app-db000
    if [ $? -ne 0 ]; then
        echo "❌ Failed to initialize Firebase project"
        exit 1
    fi
fi

# Deploy security rules
echo "🚀 Deploying Firestore security rules..."
firebase deploy --only firestore:rules --project basketball-ai-app-db000

if [ $? -eq 0 ]; then
    echo "✅ Security rules deployed successfully!"
    echo ""
    echo "🎉 Your Firebase permission errors should now be resolved!"
    echo "   Try restarting your app and testing the authentication flow."
else
    echo "❌ Failed to deploy security rules"
    echo "   Please check the error messages above and try again."
    exit 1
fi
