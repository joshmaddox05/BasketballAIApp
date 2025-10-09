# Render Deployment - Monitoring Guide

## 🚀 Deployment Status

**Commit Pushed:** ✅  
**Timestamp:** Just now  
**Commit:** `fa258fb` - Python version fix (3.11.9)

## What Happens Next

### 1. Render Auto-Deploy Triggers (1-2 minutes)
- Render detects the GitHub push
- Queues a new deployment
- You'll see "Building" status in dashboard

### 2. Build Phase (3-5 minutes)
Render will:
1. Clone the repository
2. Detect `runtime.txt` → Use Python 3.11.9
3. Run build command:
   ```bash
   python --version          # Should show 3.11.9
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. Install dependencies (MediaPipe takes ~2 minutes)

### 3. Deploy Phase (30 seconds)
- Service starts with: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check: `GET /health`
- Status: "Live" 🟢

## How to Monitor

### Option 1: Render Dashboard (Recommended)
1. Go to: https://dashboard.render.com
2. Click your service: **basketball-ai-api**
3. Watch the "Events" tab for real-time logs

### Option 2: Render CLI
```bash
# Install Render CLI (if not already)
brew tap render-cli/render-cli
brew install render-cli

# Login
render login

# View logs
render logs -s basketball-ai-api --tail
```

### Option 3: GitHub Webhook
Check your GitHub repo's webhooks:
- https://github.com/joshmaddox05/BasketballAIApp/settings/hooks
- Look for Render webhook with recent delivery

## Key Things to Watch For

### ✅ Success Indicators
```
🐍 Checking Python version...
Python 3.11.9
```

```
Successfully installed mediapipe-0.10.8
```

```
==> Your service is live 🎉
```

### ❌ Error Indicators
```
ERROR: No matching distribution found for mediapipe
```
→ Python version still wrong

```
ModuleNotFoundError: No module named 'mediapipe'
```
→ Installation failed

```
FileNotFoundError: baselines/stephen_curry.json
```
→ Baseline files missing

## Quick Status Check

### Once Deployed (5-7 minutes from now):

```bash
# Test health endpoint
curl https://basketball-ai-api.onrender.com/health

# Expected response:
# {"status":"healthy","version":"1.0.0"}
```

```bash
# Test root endpoint
curl https://basketball-ai-api.onrender.com/

# Expected response:
# {"message":"Basketball AI API","version":"1.0.0"}
```

## Troubleshooting Commands

### If Build Fails Again:

1. **Check Python Version in Logs:**
   Look for the build command output showing Python version

2. **Clear Build Cache:**
   - Dashboard → Service → Settings
   - Click "Clear Build Cache"
   - Click "Manual Deploy" → "Deploy latest commit"

3. **Verify Files:**
   ```bash
   # Check locally
   cat backend/runtime.txt
   # Should show: python-3.11.9
   
   git log --oneline -1
   # Should show: fa258fb fix: Update Python version...
   ```

4. **Check Render Environment:**
   - Dashboard → Service → Environment
   - Verify `PYTHON_VERSION = 3.11.9`

## Timeline

| Time | Status | Action |
|------|--------|--------|
| 0:00 | Push to GitHub | ✅ Done |
| 0:30 | Render detects push | Wait... |
| 1:00 | Build starts | Check logs |
| 3:00 | Installing MediaPipe | Should succeed |
| 5:00 | Service starting | Almost there |
| 6:00 | Live! | Test endpoints |

## Next Steps After Successful Deploy

### 1. Get Your API URL
Your API will be at:
```
https://basketball-ai-api.onrender.com
```

### 2. Test Curry Comparison Endpoint

```bash
# Create a test video or use existing
curl -X POST https://basketball-ai-api.onrender.com/analyze/compare-to-curry \
  -F "video=@/path/to/test_video.mp4" \
  -o response.json

# Check response
cat response.json | jq .
```

### 3. Update Mobile App

Edit `src/services/aiAnalysisService.js`:

```javascript
// Find this line:
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Change to:
const API_URL = 'https://basketball-ai-api.onrender.com';
```

Or use environment variable:
```bash
# Create .env file
echo "EXPO_PUBLIC_API_URL=https://basketball-ai-api.onrender.com" > .env
```

### 4. Build for Physical Device

```bash
# Run the build script
./build-for-device.sh

# Follow prompts:
# - Select iOS or Android
# - Wait for build (~10-15 minutes)
# - Download and install on device
```

### 5. Test End-to-End

1. Open app on physical phone
2. Select "Compare with Steph Curry"
3. Record a shot with camera
4. Wait for analysis
5. See comparison results!

## Render Service URLs

| Type | URL | Purpose |
|------|-----|---------|
| Dashboard | https://dashboard.render.com | Manage service |
| API Root | https://basketball-ai-api.onrender.com | Base URL |
| Health | https://basketball-ai-api.onrender.com/health | Status check |
| Docs | https://basketball-ai-api.onrender.com/docs | FastAPI Swagger |
| Curry Compare | https://basketball-ai-api.onrender.com/analyze/compare-to-curry | Main endpoint |

## Support

If deployment fails after 10 minutes:
1. Check Render logs for errors
2. Review `PYTHON_VERSION_FIX.md` for troubleshooting
3. Verify all files are committed and pushed
4. Consider posting Render logs for debugging

---

**Status:** Waiting for Render to build... ⏳  
**ETA:** ~6 minutes from push  
**Next Action:** Monitor Render dashboard
