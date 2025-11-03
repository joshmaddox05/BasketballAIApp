# Backend API Separation Guide

This guide provides step-by-step instructions for separating the FastAPI backend into a standalone project.

## Overview

**Current State**: Backend API and React Native app in same repository
**Target State**: Two separate repositories with independent deployments
**Timeline**: 30-45 minutes

---

## Phase 1: Create New Backend Repository

### Step 1.1: Create New GitHub Repository

1. Go to https://github.com/new
2. Repository name: `basketball-ai-backend`
3. Description: "FastAPI backend for Basketball AI Training app - AI-powered shot analysis using MediaPipe and OpenCV"
4. Visibility: Private (or Public if you prefer)
5. **Do NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

### Step 1.2: Initialize Local Backend Repository

```bash
# Navigate to a parent directory (outside current project)
cd ~/Codebase

# Create new backend directory
mkdir basketball-ai-backend
cd basketball-ai-backend

# Initialize git
git init
git branch -M main

# Add remote (replace with your actual GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/basketball-ai-backend.git
```

---

## Phase 2: Copy Backend Files

### Step 2.1: Copy Backend Directory

From your current BasketballAIApp directory:

```bash
# Copy entire backend directory to new repository
cp -r /Users/joshuamaddox/Codebase/BasketballAIApp/backend/* /Users/joshuamaddox/Codebase/basketball-ai-backend/
```

### Step 2.2: Create Backend-Specific Files

In the new `basketball-ai-backend` directory, create these files:

**README.md**:
```markdown
# Basketball AI Backend

FastAPI backend service providing AI-powered basketball shot analysis.

## Features

- Shot analysis using MediaPipe pose detection
- Video processing with OpenCV
- Stephen Curry shooting form comparison
- RESTful API endpoints
- Real-time pose tracking

## Tech Stack

- FastAPI 0.104.1
- MediaPipe 0.10.8
- OpenCV 4.8.1.78
- NumPy 1.24.3
- Python 3.9+

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set environment variables:
   ```bash
   export PORT=8000
   ```

3. Run server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

## API Endpoints

- `GET /health` - Health check
- `POST /upload/video` - Upload video for analysis
- `POST /analyze/comprehensive` - Full shot analysis
- `POST /analyze/shooting` - Shooting form analysis
- `GET /baselines/curry` - Get Curry baseline data
- `POST /compare/curry` - Compare with Curry form

## Deployment

Deployed on Render: https://basketballaiapp.onrender.com

See `render.yaml` for configuration.
```

**.gitignore**:
```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Logs
*.log
logs/

# Testing
.pytest_cache/
.coverage
htmlcov/

# Temporary files
temp/
uploads/
*.mp4
*.avi
*.mov
```

**LICENSE** (optional - MIT example):
```
MIT License

Copyright (c) 2025 Joshua Maddox

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Phase 3: Update Backend Code (if needed)

### Step 3.1: Review CORS Settings

Check `main.py` CORS configuration allows your app domain:

```python
# In basketball-ai-backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",  # Expo local development
        "exp://192.168.*",         # Expo Go
        "*"                        # Or specific production domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 3.2: Verify render.yaml

Ensure deployment configuration is correct:

```yaml
services:
  - type: web
    name: basketball-ai-backend
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: PYTHON_VERSION
        value: 3.9.16
```

---

## Phase 4: Deploy Backend

### Step 4.1: Commit and Push Backend

```bash
cd ~/Codebase/basketball-ai-backend

# Add all files
git add .

# Commit
git commit -m "Initial commit: FastAPI backend for Basketball AI app

- Shot analysis with MediaPipe
- Video processing with OpenCV
- Curry comparison baselines
- RESTful API endpoints
- Render deployment config"

# Push to GitHub
git push -u origin main
```

### Step 4.2: Deploy to Render

**Option A: Keep Existing Render Deployment**

1. Go to https://dashboard.render.com
2. Find your existing "BasketballAIApp" service
3. Go to Settings > Repository
4. Click "Disconnect"
5. Click "Connect a repository"
6. Select `basketball-ai-backend`
7. Render will redeploy automatically

**Option B: Create New Render Deployment**

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect to `basketball-ai-backend` repository
4. Settings:
   - Name: `basketball-ai-backend`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Instance Type: Free (or paid if needed)
5. Click "Create Web Service"
6. **Note the deployed URL** (e.g., `https://basketball-ai-backend.onrender.com`)

---

## Phase 5: Update App Configuration

### Step 5.1: Update API Base URL

Edit `/Users/joshuamaddox/Codebase/BasketballAIApp/src/services/aiAnalysisService.js`:

```javascript
// OLD:
const API_BASE_URL = 'https://basketballaiapp.onrender.com';

// NEW (use your actual Render URL):
const API_BASE_URL = 'https://basketball-ai-backend.onrender.com';

// OR for local development:
const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'  // Local backend during development
  : 'https://basketball-ai-backend.onrender.com';  // Production backend
```

### Step 5.2: Test API Connection

```javascript
// Add this test function to aiAnalysisService.js temporarily
export const testBackendConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    console.log('Backend health check:', data);
    return data;
  } catch (error) {
    console.error('Backend connection failed:', error);
    throw error;
  }
};
```

Then test in your app:
```javascript
import { testBackendConnection } from './services/aiAnalysisService';

// In a useEffect or button handler:
testBackendConnection()
  .then(result => console.log('Backend connected:', result))
  .catch(error => console.error('Backend connection failed:', error));
```

---

## Phase 6: Clean Up Original Repository

### Step 6.1: Remove Backend Directory

```bash
cd /Users/joshuamaddox/Codebase/BasketballAIApp

# Remove backend directory
rm -rf backend/

# Remove backend-specific files from root if any
rm -f render.yaml  # Only if it's for backend only
```

### Step 6.2: Update Main App README

Edit `/Users/joshuamaddox/Codebase/BasketballAIApp/README.md` to reference separate backend:

```markdown
# Basketball AI Training App

React Native/Expo mobile app for AI-powered basketball training.

## Related Repositories

- **Backend API**: [basketball-ai-backend](https://github.com/YOUR_USERNAME/basketball-ai-backend)

## Backend Setup

This app requires the Basketball AI Backend to be running. See the backend repository for setup instructions.

**Production Backend**: https://basketball-ai-backend.onrender.com

## App Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start Expo:
   ```bash
   npx expo start
   ```

3. Configure backend URL in `src/services/aiAnalysisService.js`
```

### Step 6.3: Commit App Changes

```bash
cd /Users/joshuamaddox/Codebase/BasketballAIApp

git add .
git commit -m "Separate backend into standalone repository

- Removed backend/ directory
- Updated API URL in aiAnalysisService.js
- Backend now deployed separately at basketball-ai-backend
- Updated README with backend repository reference"

git push
```

---

## Phase 7: Verification Checklist

### Backend Verification

- [ ] New `basketball-ai-backend` repository created on GitHub
- [ ] All backend files copied and committed
- [ ] Backend deployed to Render successfully
- [ ] `/health` endpoint returns `{"status": "healthy"}`
- [ ] Can access Swagger docs at `/docs`

### App Verification

- [ ] `backend/` directory removed from app repository
- [ ] API_BASE_URL updated in `aiAnalysisService.js`
- [ ] App builds successfully: `npx expo start`
- [ ] Health check test passes
- [ ] Video upload works
- [ ] Shot analysis works
- [ ] Curry comparison works

### Deployment Verification

- [ ] Backend deployment automatic on push to main
- [ ] Backend URL accessible from mobile device
- [ ] CORS configured correctly (no CORS errors in app)
- [ ] API response times acceptable (<5s for analysis)

---

## Rollback Plan (If Needed)

If something goes wrong, you can quickly rollback:

```bash
cd /Users/joshuamaddox/Codebase/BasketballAIApp

# Restore backend directory from git history
git checkout HEAD~1 backend/

# Restore original API URL
git checkout HEAD~1 src/services/aiAnalysisService.js

# Commit rollback
git commit -m "Rollback: Restore backend to monorepo"
git push
```

---

## Environment Variables

### Backend (Render)

Currently minimal, but you may want to add:

- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `MAX_VIDEO_SIZE_MB` - Maximum video upload size (default: 100)
- `TEMP_DIR` - Temporary file storage path

### App

Add to `app.config.js` or `.env`:

```javascript
extra: {
  apiBaseUrl: process.env.API_BASE_URL || 'https://basketball-ai-backend.onrender.com'
}
```

Then update `aiAnalysisService.js`:

```javascript
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'https://basketball-ai-backend.onrender.com';
```

---

## Benefits After Separation

1. **Independent Deployments**: Deploy backend changes without rebuilding app
2. **Faster App Builds**: No Python dependencies in app build process
3. **Cleaner Codebase**: Clear separation of concerns
4. **Easier Scaling**: Scale backend independently of app
5. **Better CI/CD**: Separate build pipelines for frontend and backend
6. **Team Collaboration**: Different teams can work on frontend/backend

---

## Estimated Timeline

- Phase 1-2 (Repository setup): 5 minutes
- Phase 3 (Code updates): 5 minutes
- Phase 4 (Backend deployment): 10-15 minutes (includes Render build time)
- Phase 5 (App updates): 10 minutes
- Phase 6 (Cleanup): 5 minutes
- Phase 7 (Testing): 10 minutes

**Total**: 45-60 minutes

---

## Support

If you encounter issues:

1. Check Render logs: https://dashboard.render.com → Your Service → Logs
2. Test backend health: `curl https://your-backend.onrender.com/health`
3. Check CORS errors in app console
4. Verify API_BASE_URL is correct in aiAnalysisService.js
5. Test endpoints with Postman/Thunder Client

---

## Next Steps After Separation

1. Set up GitHub Actions for automated testing
2. Add backend monitoring (Sentry, LogRocket)
3. Configure rate limiting
4. Add authentication to backend endpoints
5. Set up staging environment
6. Add API versioning (/v1/analyze/shooting)
