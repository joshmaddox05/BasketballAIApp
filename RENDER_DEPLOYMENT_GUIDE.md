# 🚀 Deploying Basketball AI API to Render

## Overview
This guide will help you deploy your FastAPI backend to Render.com - a free hosting platform perfect for Python APIs.

---

## 📋 Prerequisites

1. **GitHub Account** - Your code should be pushed to GitHub
2. **Render Account** - Sign up at https://render.com (free)
3. **Backend Code** - Already configured in the `backend/` directory

---

## 🎯 Quick Deploy (5 minutes)

### Method 1: One-Click Deploy via Blueprint (Recommended)

#### Step 1: Push to GitHub
```bash
cd /Users/joshuamaddox/Codebase/BasketballAIApp

# Make sure all changes are committed
git add render.yaml backend/runtime.txt backend/build.sh backend/requirements.txt
git commit -m "Configure API for Render deployment"
git push origin main
```

#### Step 2: Connect to Render
1. Go to https://render.com/dashboard
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Select `BasketballAIApp` repository
5. Render will auto-detect `render.yaml`
6. Click **"Apply"**

#### Step 3: Wait for Deploy
- First deployment takes **5-10 minutes**
- Render will:
  - Install dependencies
  - Set up storage
  - Configure environment
  - Start the API

#### Step 4: Get Your API URL
- You'll get a URL like: `https://basketball-ai-api.onrender.com`
- Test it: `https://basketball-ai-api.onrender.com/health`

---

### Method 2: Manual Setup

#### Step 1: Create New Web Service
1. Go to https://render.com/dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository

#### Step 2: Configure Service

**Basic Settings:**
- **Name:** `basketball-ai-api`
- **Region:** Oregon (or closest to you)
- **Branch:** `main`
- **Root Directory:** Leave empty (we'll use cd in commands)
- **Runtime:** Python 3

**Build Settings:**
- **Build Command:**
  ```bash
  cd backend && pip install --upgrade pip && pip install -r requirements.txt
  ```

- **Start Command:**
  ```bash
  cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
  ```

**Advanced Settings:**
- **Python Version:** `3.11.0`
- **Health Check Path:** `/health`
- **Auto-Deploy:** Yes

#### Step 3: Add Disk Storage (Optional)
1. Click **"Add Disk"**
2. **Name:** `basketball-ai-storage`
3. **Mount Path:** `/opt/render/project/src/backend/uploads`
4. **Size:** 1 GB (free tier)

#### Step 4: Deploy
- Click **"Create Web Service"**
- Wait 5-10 minutes for deployment

---

## 🔧 Configuration Details

### Environment Variables

Render automatically provides:
- `PORT` - Assigned by Render
- `PYTHON_VERSION` - Set to 3.11.0

You can add custom variables in the Render dashboard:
- Go to your service → **Environment** tab
- Add variables as needed

Example variables to add:
```env
ENVIRONMENT=production
LOG_LEVEL=info
MAX_UPLOAD_SIZE=100000000  # 100MB
```

### Files Created for Render

1. **`render.yaml`** - Blueprint configuration (root directory)
2. **`backend/runtime.txt`** - Python version specification
3. **`backend/build.sh`** - Build script (optional)
4. **`backend/requirements.txt`** - Updated with pinned versions

---

## 📦 Baseline Files

### Important: Upload Baseline Data

Your Steph Curry baseline files are large and need to be handled carefully:

#### Option 1: Include in Git (If under 100MB)
```bash
# Check file sizes
ls -lh backend/baselines/

# If small enough, add to git
git add backend/baselines/
git commit -m "Add baseline files"
git push origin main
```

#### Option 2: Upload After Deployment
1. Deploy without baseline files first
2. Use Render Shell to upload:
   ```bash
   # In Render dashboard, go to Shell tab
   cd backend/baselines
   # Upload files via SFTP or curl
   ```

#### Option 3: Use Cloud Storage (Recommended for Production)
- Store baseline files in AWS S3, Google Cloud Storage, or Cloudflare R2
- Update code to download from cloud storage on startup

---

## 🌐 Update Mobile App with API URL

After deployment, update your mobile app to use the Render URL:

### Update API URL
```javascript
// src/services/aiAnalysisService.js
constructor() {
  // Change from localhost to your Render URL
  this.API_BASE_URL = 'https://basketball-ai-api.onrender.com';
  this.isOfflineMode = false; // Enable real API
}
```

### Test the Connection
```bash
# Test health endpoint
curl https://basketball-ai-api.onrender.com/health

# Test baselines list
curl https://basketball-ai-api.onrender.com/baselines/list
```

---

## 🔍 Monitoring & Logs

### View Logs
1. Go to your service in Render dashboard
2. Click **"Logs"** tab
3. See real-time application logs

### Check Status
1. **Health Check:** Visit `/health` endpoint
2. **Metrics:** Available in Render dashboard
3. **Uptime:** Monitor in dashboard

### Common Log Messages
```
✅ Application startup complete
🎯 Analyzing video: {video_id}
📊 Comparing to {player_name}'s form...
✅ Analysis complete - Score: {score}
```

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Could not find a version that satisfies the requirement"**
```
Solution: Check requirements.txt has correct versions
Using opencv-python-headless instead of opencv-python
```

**Error: "Python version not found"**
```
Solution: Verify runtime.txt has correct Python version
Should be: python-3.11.0
```

### Deployment Fails

**Error: "Application failed to respond"**
```
Solution: 
1. Check Start Command uses $PORT variable
2. Verify Health Check path is /health
3. Check logs for errors
```

**Error: "Build command returned non-zero exit"**
```
Solution:
1. Check build.sh is executable
2. Verify all dependencies are in requirements.txt
3. Review build logs for specific error
```

### Runtime Issues

**Error: "No such file or directory: baselines"**
```
Solution: 
1. Ensure baselines directory exists
2. Upload baseline files (see above)
3. Or handle missing baselines gracefully in code
```

**Error: "Disk full"**
```
Solution:
1. Add persistent disk storage
2. Clean up old uploads regularly
3. Use cloud storage for videos
```

### Performance Issues

**API is slow**
```
Solutions:
1. Upgrade from Starter to Standard plan ($7/month)
2. Use faster region (closer to users)
3. Optimize video processing
4. Add caching
```

**Requests timing out**
```
Solutions:
1. Increase timeout in Render settings
2. Process videos asynchronously
3. Use background jobs for long tasks
```

---

## 💰 Pricing

### Free Tier (Starter Plan)
- ✅ 750 hours/month free compute
- ✅ 1 GB RAM
- ✅ 0.1 CPU
- ✅ 1 GB disk storage
- ⚠️ Sleeps after 15 min inactivity
- ⚠️ Slower performance

**Good for:** Testing, development, low-traffic apps

### Paid Plan (Standard - $7/month)
- ✅ Unlimited hours
- ✅ 2 GB RAM
- ✅ 1 CPU
- ✅ 10 GB disk storage
- ✅ No sleeping
- ✅ Faster performance

**Good for:** Production apps with regular traffic

---

## 🚀 Post-Deployment Checklist

After successful deployment:

### Backend Verification
- [ ] API is accessible at Render URL
- [ ] `/health` endpoint returns 200
- [ ] `/baselines/list` shows available players
- [ ] Logs show no errors
- [ ] CORS allows your mobile app domain

### Mobile App Update
- [ ] Update API_BASE_URL in aiAnalysisService.js
- [ ] Set isOfflineMode to false
- [ ] Test video upload
- [ ] Test Curry comparison
- [ ] Verify results display correctly

### Performance Check
- [ ] Video upload works (<100MB)
- [ ] Analysis completes in reasonable time
- [ ] No timeout errors
- [ ] Baseline comparisons work

### Optional Enhancements
- [ ] Add database for persistent storage
- [ ] Set up automated backups
- [ ] Configure custom domain
- [ ] Add monitoring/alerts
- [ ] Set up CI/CD pipeline

---

## 📈 Scaling Tips

### When to Upgrade

Upgrade to Standard plan if:
- API sleeps too often (affects UX)
- Response times are too slow
- Need more storage
- Want better reliability

### Performance Optimization

1. **Caching:**
   - Cache analysis results
   - Cache baseline data in memory
   - Use Redis for session storage

2. **Async Processing:**
   - Use background workers for video processing
   - Return immediate response, process later
   - Notify mobile app when complete

3. **Video Optimization:**
   - Compress videos before upload
   - Reduce frame rate for analysis
   - Limit video length (5-10 seconds)

4. **Database:**
   - Add PostgreSQL for persistent storage
   - Store user data, analysis history
   - Enable better querying

---

## 🔐 Security Best Practices

### Environment Variables
```env
# Add these in Render dashboard
API_SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret-here
ALLOWED_ORIGINS=https://yourapp.com
```

### CORS Configuration
Update in `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourapp.com",
        "exp://your-expo-app"
    ],  # Specific origins for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Rate Limiting
Consider adding rate limiting:
```bash
pip install slowapi
```

---

## 📚 Additional Resources

- **Render Docs:** https://render.com/docs
- **FastAPI Deployment:** https://fastapi.tiangolo.com/deployment/
- **Render Python Guide:** https://render.com/docs/deploy-fastapi
- **Render Free Tier:** https://render.com/docs/free

---

## 🎯 Quick Reference

### Useful Commands

```bash
# View logs
# Go to: https://render.com/dashboard → Your Service → Logs

# Restart service
# Dashboard → Your Service → Manual Deploy → Deploy latest commit

# Shell access
# Dashboard → Your Service → Shell

# Environment variables
# Dashboard → Your Service → Environment
```

### Key URLs

- **Dashboard:** https://render.com/dashboard
- **Your API:** `https://basketball-ai-api.onrender.com`
- **Health Check:** `https://basketball-ai-api.onrender.com/health`
- **API Docs:** `https://basketball-ai-api.onrender.com/docs`

---

## ✅ Success Indicators

Your deployment is successful when:
1. ✅ API responds at Render URL
2. ✅ `/health` returns `{"status": "healthy"}`
3. ✅ `/docs` shows interactive API documentation
4. ✅ Mobile app can connect and upload videos
5. ✅ Analysis completes and returns results
6. ✅ No errors in Render logs

---

## 🎊 You're Ready!

Your Basketball AI API is now deployed on Render!

**Next steps:**
1. Update mobile app with new API URL
2. Test the Curry comparison feature
3. Monitor logs for any issues
4. Consider upgrading to paid plan for production

**Need help?** Check the troubleshooting section or Render's documentation.

---

**Deployment Time:** ~5-10 minutes
**Cost:** Free (with limitations) or $7/month for production
**Effort:** Minimal - Render handles most of the infrastructure!

Happy deploying! 🚀🏀
