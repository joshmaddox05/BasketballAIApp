# Baseline Video Setup Guide

This guide will help you create professional player baselines for shot comparison.

## Quick Start

### 1. Start the FastAPI Server

```bash
cd backend
source venv/bin/activate  # Activate virtual environment
uvicorn main:app --reload
```

The server should start at `http://localhost:8000`

### 2. Prepare Your Video

**Requirements:**
- Format: MP4, MOV, or AVI
- Duration: 3-10 seconds recommended
- Content: Clear view of a single basketball shot
- Quality: Good lighting, player clearly visible
- Angle: Side view or 45-degree angle works best

**Recommended Players to Start With:**
- Stephen Curry (3-point shot)
- Kevin Durant (mid-range)
- LeBron James (driving layup)
- Kawhi Leonard (corner 3)

### 3. Create a Baseline

#### Option A: Using the Helper Script (Recommended)

```bash
python create_baseline.py path/to/video.mp4 "Player Name"
```

Example:
```bash
python create_baseline.py curry_shot.mp4 "Stephen Curry"
```

#### Option B: Using cURL

```bash
curl -X POST "http://localhost:8000/baseline/create" \
  -F "video=@curry_shot.mp4" \
  -F "player_name=Stephen Curry"
```

#### Option C: Using Python Requests

```python
import requests

with open('curry_shot.mp4', 'rb') as video_file:
    files = {'video': video_file}
    data = {'player_name': 'Stephen Curry'}
    response = requests.post(
        'http://localhost:8000/baseline/create',
        files=files,
        data=data
    )
    print(response.json())
```

### 4. Verify Baseline Creation

List all available baselines:

```bash
curl http://localhost:8000/baselines/list
```

Or visit: `http://localhost:8000/baselines/list` in your browser

## Finding Good Baseline Videos

### YouTube Videos (For Reference)

Search for:
- "Stephen Curry shooting form slow motion"
- "NBA shooting form breakdown"
- "Professional basketball shot technique"

**Note:** For copyright reasons, you should:
1. Use publicly available training videos
2. Record your own footage of professional games
3. Use licensed content
4. Or use videos specifically marked for educational use

### Recording Your Own

If you can't find suitable videos, you can:
1. Record clips from NBA games on TV (personal use only)
2. Use NBA official training videos
3. Film local professional/college players with permission

## Baseline Storage

Created baselines are stored in:
```
backend/baselines/
├── stephen_curry_YYYYMMDD_HHMMSS.json
└── ... (other player baselines)
```

Each baseline file contains:
- Player name and metadata
- Frame-by-frame pose data
- Average metrics (release angle, elbow alignment, etc.)
- Timestamp and video info

## Using Baselines in the App

Once created, baselines are automatically available in the mobile app. Users can:

1. Upload their shooting video
2. Select "Stephen Curry" as comparison baseline
3. Receive detailed analysis comparing their shot to the baseline

## Troubleshooting

### "Could not connect to API server"
- Make sure FastAPI server is running
- Check that it's running on port 8000
- Try accessing http://localhost:8000 in your browser

### "Video processing failed"
- Ensure video file is not corrupted
- Check that the player is clearly visible
- Try a shorter video (3-5 seconds)
- Verify video format is supported (MP4 recommended)

### "No pose detected"
- Video lighting might be too dark
- Player might be too far from camera
- Try a video with better visibility
- Ensure the shot is in-frame throughout

## Example Workflow

```bash
# 1. Start server
cd backend
source venv/bin/activate
uvicorn main:app --reload

# 2. In another terminal, create baseline
cd backend
python create_baseline.py curry_shot.mp4 "Stephen Curry"

# 3. Verify it was created
curl http://localhost:8000/baselines/list

# 4. Test with a user video
curl -X POST "http://localhost:8000/analyze/shooting" \
  -F "video=@user_shot.mp4" \
  -F "baseline_id=stephen_curry_20241008_120000"
```

## Next Steps

After creating your first baseline:
1. Test it with sample user videos
2. Create additional baselines for different shot types
3. Integrate with the React Native mobile app
4. Add more professional players for variety
