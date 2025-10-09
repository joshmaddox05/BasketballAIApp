# Quick Start Guide: Testing the Steph Curry Comparison Feature

## 🚀 Quick Setup (5 minutes)

### Option 1: Test with Offline Mode (Recommended for UI Testing)
No backend needed - uses simulated data.

1. **Start the app:**
   ```bash
   cd /Users/joshuamaddox/Codebase/BasketballAIApp
   npm start
   ```

2. **Navigate in the app:**
   - Open the app on your device/simulator
   - Go to: Training → Shooting Analysis
   - Tap "Compare with Pro Form"
   - Select "Stephen Curry"
   - Tap "Start Recording"
   - Record a video (simulated analysis will run)
   - View the comparison results!

### Option 2: Test with Real Backend (Full Feature Testing)

1. **Start the backend server:**
   ```bash
   cd /Users/joshuamaddox/Codebase/BasketballAIApp/backend
   
   # Create virtual environment if not exists
   python3 -m venv venv
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Start server
   python main.py
   ```
   
   Server will start at: `http://localhost:8000`

2. **Configure the frontend:**
   ```bash
   # Edit src/services/aiAnalysisService.js
   # Change line 10:
   this.isOfflineMode = false;
   
   # Change line 9 to your computer's IP:
   this.API_BASE_URL = 'http://YOUR_IP_ADDRESS:8000';
   ```
   
   **Find your IP:**
   ```bash
   # macOS
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

3. **Start the app:**
   ```bash
   npm start
   ```

4. **Test the feature:**
   - Follow the same navigation as Option 1
   - Your video will be sent to the real backend for analysis

## 🧪 Test the Backend API Directly

### Health Check
```bash
curl http://localhost:8000/health
```

### Upload & Compare (with a video file)
```bash
curl -X POST "http://localhost:8000/analyze/compare-to-curry" \
  -H "Content-Type: multipart/form-data" \
  -F "video=@/path/to/your/shooting_video.mp4"
```

### List Available Baselines
```bash
curl http://localhost:8000/baselines/list
```

### API Documentation
Open in browser: http://localhost:8000/docs

## 📱 What to Expect

### Recording Tips
- Position camera at **90° side angle** to your body
- Ensure **good lighting** and **clear background**
- Record **3-5 shooting attempts**
- Keep video **5-10 seconds** long
- Stay in frame throughout the shot

### Results You'll See

1. **Overall Score:** Your shooting form score (0-100)
2. **Similarity to Curry:** Percentage match (0-100%)
3. **Metric Breakdown:**
   - Release Angle (with color-coded bar)
   - Elbow Alignment (with color-coded bar)
   - Follow Through (with color-coded bar)
   - Balance & Stance (with color-coded bar)
4. **Your Strengths:** List of what you're doing well
5. **Areas to Improve:** List of focus areas
6. **Recommendations:** Specific tips to improve

### Color Coding
- 🟢 **Green (80%+):** Excellent similarity
- 🟡 **Yellow (70-79%):** Good similarity
- 🟠 **Orange (<70%):** Needs improvement

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check Python version (needs 3.11+)
python --version

# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Check for port conflicts
lsof -i :8000
```

### App Can't Connect to Backend
```bash
# Verify backend is running
curl http://localhost:8000/health

# Check firewall settings - allow port 8000
# Make sure phone/simulator is on same network

# For iOS Simulator, use:
this.API_BASE_URL = 'http://localhost:8000';

# For Android Emulator, use:
this.API_BASE_URL = 'http://10.0.2.2:8000';

# For physical device, use your computer's IP:
this.API_BASE_URL = 'http://192.168.X.X:8000';
```

### "Analysis Failed" Error
- Check backend logs in terminal
- Verify video file is valid format (mp4, mov, avi, mkv)
- Ensure video file size is <100MB
- Check network connection

### Low Similarity Scores
- Ensure video is from **side angle** (90°)
- Check for **good lighting**
- Make sure **background is clear**
- Record **complete shooting motion**

## 📊 Expected Processing Times

| Stage | Time |
|-------|------|
| Video Upload | 1-3 sec |
| AI Analysis | 3-5 sec |
| Comparison | 1-2 sec |
| **Total** | **5-10 sec** |

## 🎯 Key Features to Test

### Must Test
- [ ] Video recording works
- [ ] Analysis progress shows
- [ ] Results display correctly
- [ ] Similarity score appears
- [ ] Metric bars show correct percentages
- [ ] Recommendations are relevant

### Nice to Test
- [ ] Multiple recordings in a row
- [ ] Different pro player selections
- [ ] "Try Again" button works
- [ ] "Save & Exit" button works
- [ ] Results persist on app restart

## 📝 Quick Commands Reference

```bash
# Start backend
cd backend && source venv/bin/activate && python main.py

# Start frontend
npm start

# Check backend health
curl http://localhost:8000/health

# View logs
tail -f backend/baseline_process.log

# Kill backend server
lsof -ti:8000 | xargs kill -9
```

## 🎬 Demo Script

1. **Open app** → Training → Shooting Analysis
2. **Select Curry** as comparison player
3. **Tap "Start Recording"**
4. **Record 5 seconds** of shooting motion
5. **Wait for analysis** (3-5 seconds)
6. **View results:**
   - Check overall score
   - Review similarity percentage
   - Examine metric breakdowns
   - Read recommendations
7. **Try "New Analysis"** to test again
8. **Tap "Save & Exit"** when done

## 📚 Related Documentation

- **Feature Overview:** [CURRY_COMPARISON_FEATURE.md](./CURRY_COMPARISON_FEATURE.md)
- **Implementation Details:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Backend Setup:** [backend/README.md](./backend/README.md)
- **API Documentation:** http://localhost:8000/docs (when running)

## 💡 Pro Tips

1. **Use Offline Mode** for quick UI testing without backend
2. **Test on real device** for best camera experience
3. **Record multiple angles** to see how it affects results
4. **Compare results** between different shooting techniques
5. **Save good recordings** to test consistency

## ✅ Success Checklist

- [ ] Backend starts without errors
- [ ] App connects to backend (or offline mode works)
- [ ] Video recording captures successfully
- [ ] Analysis completes within 10 seconds
- [ ] Results display with all metrics
- [ ] Similarity score is reasonable (65-90%)
- [ ] Recommendations are actionable
- [ ] Can perform multiple analyses
- [ ] No crashes or errors

---

**Ready to test!** 🏀 Start with Option 1 (Offline Mode) for the quickest results.

**Questions?** Check [CURRY_COMPARISON_FEATURE.md](./CURRY_COMPARISON_FEATURE.md) for detailed troubleshooting.
