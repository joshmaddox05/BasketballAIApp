# ✅ Render Deployment Checklist

## Pre-Deployment

- [ ] Code is pushed to GitHub
- [ ] All changes committed
- [ ] Backend code in `backend/` directory
- [ ] `render.yaml` exists in root
- [ ] `requirements.txt` has all dependencies
- [ ] `runtime.txt` specifies Python version
- [ ] `.gitignore` excludes venv and uploads

## Deployment Steps

### 1. Push to GitHub
```bash
git add render.yaml backend/requirements.txt backend/runtime.txt Procfile .gitignore
git commit -m "Configure API for Render deployment"
git push origin main
```

### 2. Connect to Render
- [ ] Go to https://render.com/dashboard
- [ ] Sign up/Login
- [ ] Connect GitHub account
- [ ] Authorize Render app

### 3. Create Service

**Option A: Blueprint (Recommended)**
- [ ] Click "New +" → "Blueprint"
- [ ] Select your repository
- [ ] Render detects `render.yaml`
- [ ] Click "Apply"

**Option B: Manual**
- [ ] Click "New +" → "Web Service"
- [ ] Select repository
- [ ] Configure:
  - Build: `cd backend && pip install -r requirements.txt`
  - Start: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
  - Python Version: 3.11.0

### 4. Wait for Deploy
- [ ] Monitor build logs (5-10 minutes)
- [ ] Check for errors
- [ ] Wait for "Live" status

### 5. Verify Deployment
- [ ] Visit API URL (e.g., `https://basketball-ai-api.onrender.com`)
- [ ] Test health check: `/health`
- [ ] Check API docs: `/docs`
- [ ] Verify CORS works

## Post-Deployment

### Update Mobile App
- [ ] Open `src/services/aiAnalysisService.js`
- [ ] Change `API_BASE_URL` to Render URL
- [ ] Set `isOfflineMode = false`
- [ ] Test video upload
- [ ] Test analysis feature

### Test API
- [ ] Upload test video
- [ ] Verify analysis completes
- [ ] Check comparison works
- [ ] Monitor response times

### Optional Setup
- [ ] Add custom domain
- [ ] Set up monitoring
- [ ] Configure alerts
- [ ] Add database (if needed)
- [ ] Set up backups

## Troubleshooting

### Build Fails
- [ ] Check build logs in Render
- [ ] Verify requirements.txt
- [ ] Check Python version
- [ ] Review build command

### API Not Responding
- [ ] Check start command
- [ ] Verify port uses $PORT
- [ ] Review application logs
- [ ] Check health check path

### Upload Fails
- [ ] Add persistent disk storage
- [ ] Check upload size limits
- [ ] Verify directory permissions

## Success Criteria

- [ ] ✅ API is live at Render URL
- [ ] ✅ Health endpoint returns 200
- [ ] ✅ API docs accessible
- [ ] ✅ Mobile app connects successfully
- [ ] ✅ Video upload works
- [ ] ✅ Analysis completes
- [ ] ✅ Results display correctly
- [ ] ✅ No errors in logs

## Quick Commands

```bash
# Test health endpoint
curl https://YOUR-SERVICE.onrender.com/health

# Test baselines list
curl https://YOUR-SERVICE.onrender.com/baselines/list

# Upload test (from mobile app or Postman)
# POST /analyze/compare-to-curry with video file
```

## Important URLs

- **Dashboard:** https://render.com/dashboard
- **Your Service:** https://render.com/dashboard → [Your Service]
- **Logs:** Dashboard → Your Service → Logs
- **Environment:** Dashboard → Your Service → Environment
- **Shell:** Dashboard → Your Service → Shell

## Estimated Timeline

- **Setup:** 5 minutes
- **First Deploy:** 10-15 minutes
- **Testing:** 5 minutes
- **Mobile App Update:** 5 minutes
- **Total:** ~30 minutes

## Cost

- **Free Tier:** $0/month (with sleep after 15min inactivity)
- **Starter:** $7/month (no sleep, better performance)

## Next Steps After Success

1. Monitor performance for a week
2. Decide if upgrade needed
3. Add database if storing user data
4. Set up automated testing
5. Configure custom domain
6. Add monitoring/analytics

---

**Ready to deploy?** Follow the steps above! 🚀

See `RENDER_DEPLOYMENT_GUIDE.md` for detailed instructions.
