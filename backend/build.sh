#!/bin/bash
# Build script for Render deployment

echo "🏀 Building Basketball AI API for Render..."

# Navigate to backend directory
cd backend || exit 1

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create necessary directories
echo "📁 Creating storage directories..."
mkdir -p uploads
mkdir -p baselines
mkdir -p processed

# Copy baseline files if they exist
if [ -d "baselines" ] && [ "$(ls -A baselines)" ]; then
    echo "✅ Baseline files found"
else
    echo "⚠️  No baseline files - you'll need to upload them after deployment"
fi

# Verify installation
echo "🔍 Verifying installation..."
python -c "import fastapi; import uvicorn; import cv2; import mediapipe; print('✅ All required packages installed')"

echo "✅ Build complete!"
