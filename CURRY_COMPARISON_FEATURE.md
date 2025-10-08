# Steph Curry Shooting Form Comparison Feature

## Overview

This feature allows users to upload a video of their basketball shooting form and receive a detailed comparison against Stephen Curry's professional shooting mechanics. The system analyzes key metrics and provides personalized feedback to help users improve their form.

## How It Works

### 1. Video Upload & Analysis Flow

```
User Records Video → Upload to Backend → AI Analysis → Comparison with Curry Baseline → Results Display
```

### 2. Backend API Endpoint

**Endpoint:** `POST /analyze/compare-to-curry`

**Description:** Upload a video and immediately compare it to Steph Curry's shooting form. This streamlined endpoint handles upload, analysis, and comparison in one call.

**Request:**
```
Content-Type: multipart/form-data

video: [video file] (mp4, mov, avi, mkv)
```

**Response:**
```json
{
  "video_id": "unique-uuid",
  "analysis_mode": "curry_comparison",
  "overall_score": 78,
  "similarity_to_curry": 75.3,
  "confidence": 0.88,
  
  "your_metrics": [
    {
      "id": "release_angle",
      "name": "Release Angle",
      "score": 8.2,
      "value": "47.5°",
      "ideal": "45-50°",
      "status": "good",
      "feedback": "Your release angle is within optimal range"
    },
    // ... more metrics
  ],
  
  "comparison": {
    "player": "Stephen Curry",
    "position": "Point Guard",
    "team": "Golden State Warriors",
    "overall_similarity": 75.3,
    "strengths": [
      "Good release timing",
      "Consistent follow-through"
    ],
    "areas_for_improvement": [
      "Elbow alignment throughout shot",
      "Weight distribution"
    ]
  },
  
  "recommendations": [
    "Practice your release angle - aim for 48° like Curry",
    "Work on keeping your elbow aligned under the ball",
    "Focus on complete follow-through extension"
  ],
  
  "biomechanics_comparison": {
    "your_form": {
      "release_angle": "47.5°",
      "arc_angle": "45.2°",
      "follow_through_extension": "Good",
      "stance_width": "Optimal"
    },
    "curry_form": {
      "release_angle": "48.5°",
      "arc_angle": "47.0°",
      "follow_through_extension": "Excellent",
      "stance_width": "Optimal"
    }
  },
  
  "visual_data": {
    "similarity_breakdown": [
      {
        "metric": "Release Angle",
        "similarity": 92.5,
        "your_value": 47.5,
        "curry_value": 48.5
      },
      // ... more metrics
    ]
  },
  
  "analyzed_at": "2025-10-08T10:30:45Z"
}
```

## Analyzed Metrics

### 1. Release Angle
- **What it measures:** The angle at which the ball leaves the shooter's hand
- **Curry's baseline:** 48.5°
- **Optimal range:** 45-50°
- **Why it matters:** Proper release angle ensures optimal arc and shooting consistency

### 2. Elbow Alignment
- **What it measures:** How well the shooting elbow stays aligned under the ball
- **Curry's baseline:** 95% consistency
- **Optimal range:** >90% consistency
- **Why it matters:** Proper elbow alignment reduces shooting inconsistency and improves accuracy

### 3. Follow Through
- **What it measures:** Extension and wrist snap after ball release
- **Curry's baseline:** Excellent extension with complete wrist snap
- **Optimal range:** Full extension with smooth wrist rotation
- **Why it matters:** Follow-through affects shot arc, backspin, and overall shooting touch

### 4. Balance & Stance
- **What it measures:** Stability, foot positioning, and center of mass during the shot
- **Curry's baseline:** 90% stability score
- **Optimal range:** >85% stability
- **Why it matters:** Good balance ensures consistent shooting mechanics and power transfer

## Mobile App Integration

### Using the Feature

1. **Navigate to Shooting Analysis:**
   - From the app's main navigation, go to Training → Shooting Analysis

2. **Select Steph Curry as Comparison:**
   - On the intro screen, tap "Compare with Pro Form"
   - Select "Stephen Curry" from the list

3. **Record Your Shot:**
   - Tap "Start Recording"
   - Position yourself at a 90° angle to the camera
   - Record 3-5 shooting attempts
   - Ensure good lighting and clear background

4. **View Results:**
   - Wait 3-5 seconds for AI analysis
   - Review your overall similarity score
   - Check detailed metric comparisons
   - Read personalized recommendations

### Code Implementation

**ShootingAnalysisScreen.js:**
```javascript
// When Steph Curry is selected, use the dedicated comparison API
const handleCameraCapture = async (videoData) => {
  if (selectedProModel.name === 'Stephen Curry') {
    results = await aiAnalysisService.compareWithStephCurry(videoData);
  } else {
    results = await aiAnalysisService.analyzeShootingForm(videoData);
  }
  // ... handle results
};
```

**aiAnalysisService.js:**
```javascript
async compareWithStephCurry(videoData) {
  const formData = new FormData();
  formData.append('video', {
    uri: videoData.videoUri,
    type: 'video/mp4',
    name: 'shooting_video.mp4',
  });

  const response = await fetch(`${this.API_BASE_URL}/analyze/compare-to-curry`, {
    method: 'POST',
    body: formData,
  });

  return await response.json();
}
```

## Baseline Data

Stephen Curry's baseline shooting form was created by analyzing professional game footage and practice sessions. The baseline includes:

- **File:** `backend/baselines/stephen_curry.json`
- **Video:** `backend/baselines/StephCurryShot.mp4`
- **Metrics analyzed:** 150+ frames of shooting motion
- **Data points:** Release angle, elbow positioning, follow-through, balance, stance width, and more

## Development Mode

For development and testing without a running backend server:

```javascript
// In aiAnalysisService.js
this.isOfflineMode = true; // Enables simulated analysis
```

When `isOfflineMode` is enabled, the service generates realistic simulated results for testing the UI and user experience.

## Backend Setup

### Requirements
```
python >= 3.11
opencv-python
mediapipe
numpy
fastapi
uvicorn
```

### Installation
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Running the Server
```bash
cd backend
python main.py
```

The API will be available at `http://localhost:8000`

### API Documentation
Visit `http://localhost:8000/docs` for interactive API documentation.

## Testing

### Test the Backend Endpoint

```bash
# Upload a video and compare with Curry
curl -X POST "http://localhost:8000/analyze/compare-to-curry" \
  -H "Content-Type: multipart/form-data" \
  -F "video=@/path/to/your/video.mp4"
```

### Test the Mobile App

1. Set `isOfflineMode = false` in `aiAnalysisService.js`
2. Update `API_BASE_URL` to your backend server (e.g., your computer's IP address)
3. Record a shooting video
4. View the comparison results

## Future Enhancements

### Planned Features
1. **Multiple Pro Player Comparisons:** Add Kevin Durant, LeBron James, etc.
2. **Video Overlay:** Side-by-side video comparison with pose overlay
3. **Progress Tracking:** Track improvement over time
4. **Drill Recommendations:** Suggest specific drills based on weak areas
5. **Social Sharing:** Share comparison results with friends
6. **AR Guidance:** Real-time AR feedback during shooting practice

### Technical Improvements
1. **Video Compression:** Optimize video upload size
2. **Caching:** Cache analysis results to reduce API calls
3. **Batch Processing:** Analyze multiple shots at once
4. **Cloud Storage:** Store videos in cloud (AWS S3, Firebase Storage)
5. **Real-time Analysis:** WebSocket-based live feedback

## Troubleshooting

### Common Issues

**Issue:** "Analysis Failed" error
- **Solution:** Check that backend server is running, video file is valid format, and network connection is stable

**Issue:** Low similarity scores
- **Solution:** Ensure video is recorded from side angle (90°), good lighting, and clear background

**Issue:** Slow analysis
- **Solution:** Reduce video length to 5-10 seconds, check server resources, ensure good network speed

**Issue:** Video upload fails
- **Solution:** Check file size (<100MB), valid format (mp4, mov, avi, mkv), and API_BASE_URL is correct

## Support

For questions or issues:
- Check the [main README](./README.md)
- Review [Backend Documentation](./backend/README.md)
- Check [Implementation Status](./IMPLEMENTATION_COMPLETE.md)

## License

This feature is part of the Basketball AI App. All rights reserved.
