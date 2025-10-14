# Shot Comparison API Documentation

## New Endpoint: `/analyze/shot-comparison`

Complete shot analysis with comparison videos for mobile app integration.

### Features

✅ **Automatic Orientation Detection**
- Detects if video is front-facing or side-facing using pose analysis
- Automatically matches with appropriate Steph Curry baseline videos

✅ **Comprehensive Comparison Metrics**
- Wrist mechanics (release height, elbow angle, speed)
- Head stability (tilt, movement)
- Body alignment (shoulder level, hip level, knee bend)

✅ **Two Separate Annotated Videos**
- User video with pose overlay and metrics
- Matched Curry baseline video with pose overlay

✅ **Actionable Recommendations**
- Top 3 areas for improvement
- Specific coaching tips
- Recommended drills

---

## API Endpoint

### POST `/analyze/shot-comparison`

Upload a basketball shot video and get detailed comparison against Steph Curry's form.

**Request:**
```
POST /analyze/shot-comparison
Content-Type: multipart/form-data

video: <video file> (mp4, mov, avi, mkv)
```

**Response:**
```json
{
  "video_id": "uuid-string",
  "success": true,
  "orientation": "side",
  "baseline_player": "Stephen Curry",
  "baseline_video_used": "StephSideGood.mp4",
  
  "overall_similarity": 85.5,
  "overall_grade": "B",
  
  "wrist_metrics": {
    "release_height": {
      "your_value": 53.3,
      "curry_average": 90.7,
      "curry_range": "88.3-94.1",
      "difference": -37.4,
      "similarity_percent": 45.2,
      "grade": "D",
      "status": "poor"
    },
    "elbow_angle_at_release": {...},
    "wrist_speed": {...}
  },
  
  "head_metrics": {...},
  "body_metrics": {...},
  
  "top_recommendations": [
    {
      "title": "Release Height",
      "category": "wrist",
      "grade": "D",
      "tip": "Release the ball higher - aim for full extension above your head",
      "drill": "Wall touch drill: Jump and touch a point on the wall as high as possible"
    },
    ...
  ],
  
  "videos": {
    "user_video": "/videos/{video_id}_user_annotated.mp4",
    "baseline_video": "/videos/{video_id}_baseline_annotated.mp4"
  },
  
  "analyzed_at": "2025-10-14T..."
}
```

---

## Download Videos

### GET `/videos/{video_filename}`

Download the generated comparison videos.

**Example:**
```
GET /videos/abc123_user_annotated.mp4
Returns: MP4 video file
```

---

## Cleanup Videos

### DELETE `/videos/{video_id}`

Clean up generated videos after the user has downloaded them.

**Example:**
```
DELETE /videos/abc123
```

**Response:**
```json
{
  "success": true,
  "deleted": ["user_video", "baseline_video"],
  "message": "Videos cleaned up successfully"
}
```

---

## Integration Guide for React Native App

### 1. Upload Video and Get Analysis

```typescript
const uploadAndAnalyze = async (videoUri: string) => {
  const formData = new FormData();
  formData.append('video', {
    uri: videoUri,
    type: 'video/mp4',
    name: 'shot.mp4',
  });

  const response = await fetch('http://your-server/analyze/shot-comparison', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const result = await response.json();
  return result;
};
```

### 2. Display Results

```typescript
// Show overall grade
<Text>{result.overall_grade}</Text>
<Text>{result.overall_similarity}% similarity</Text>

// Show metrics by category
result.wrist_metrics.map(metric => (
  <MetricCard
    title={metric.title}
    grade={metric.grade}
    yourValue={metric.your_value}
    curryValue={metric.curry_average}
  />
))

// Show recommendations
result.top_recommendations.map(rec => (
  <RecommendationCard
    title={rec.title}
    tip={rec.tip}
    drill={rec.drill}
  />
))
```

### 3. Download and Display Videos

```typescript
// Download user's annotated video
const userVideoUrl = `http://your-server${result.videos.user_video}`;
const curryVideoUrl = `http://your-server${result.videos.baseline_video}`;

// Display in video players
<Video source={{ uri: userVideoUrl }} />
<Video source={{ uri: curryVideoUrl }} />
```

### 4. Cleanup After Use

```typescript
// After user views/downloads videos
await fetch(`http://your-server/videos/${result.video_id}`, {
  method: 'DELETE',
});
```

---

## Video Organization

### Baseline Videos Structure
```
baselines/
├── front_shots/
│   ├── Steph Front shot.mp4
│   ├── Steph front shotGood.mp4
│   └── StephCurryShot.mp4
└── side_shots/
    ├── Steph Side jump shot.mp4
    ├── StephSideGood.mp4
    └── StephSideSetShot.mp4
```

The system automatically:
1. Detects if your video is front-facing or side-facing
2. Selects appropriate baseline videos from the matching directory
3. Generates comparison using the best matching baseline

---

## Metrics Explained

### Wrist Metrics
- **Release Height**: How high you release the ball (higher is better)
- **Elbow Angle**: Elbow extension at release (165-175° optimal)
- **Wrist Speed**: Shooting motion speed

### Head Metrics
- **Head Tilt**: Head levelness during shot
- **Head Movement**: Lateral stability (less movement is better)

### Body Metrics
- **Shoulder Level**: Shoulder alignment (level is better)
- **Hip Level**: Hip balance
- **Knee Bend**: Deepest knee bend during load phase (120-140° optimal)

---

## Grading System

| Grade | Similarity | Description |
|-------|-----------|-------------|
| A | >90% | Excellent - Very close to Curry's form |
| B | 75-90% | Good - Minor improvements needed |
| C | 50-75% | Needs Work - Several areas to improve |
| D | <50% | Poor - Significant form issues |

---

## Error Handling

```typescript
try {
  const result = await uploadAndAnalyze(videoUri);
  
  if (!result.success) {
    // Handle analysis failure
    console.error(result.error);
  }
} catch (error) {
  // Handle network/upload errors
  console.error('Upload failed:', error);
}
```

---

## Performance Notes

- Video processing takes 15-30 seconds depending on video length
- Maximum video length: 30 seconds recommended
- Supported formats: MP4, MOV, AVI, MKV
- Server processes one video at a time to prevent memory issues
- Videos are automatically cleaned up after generation

---

## Example Curl Command

```bash
curl -X POST http://localhost:8000/analyze/shot-comparison \
  -F "video=@/path/to/your/shot.mp4" \
  -o response.json

# Download videos
VIDEO_ID=$(cat response.json | jq -r '.video_id')
curl http://localhost:8000/videos/${VIDEO_ID}_user_annotated.mp4 -o user_video.mp4
curl http://localhost:8000/videos/${VIDEO_ID}_baseline_annotated.mp4 -o curry_video.mp4
```

