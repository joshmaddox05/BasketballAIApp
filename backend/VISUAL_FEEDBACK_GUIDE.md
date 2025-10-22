# 🎬 Real-Time Shot Comparison - Implementation Guide

## Overview

This guide covers the implementation of visual feedback showing how the user's shot differs from baseline professional form using pose skeleton overlays.

## Implementation Status

### ✅ Phase 1: Backend Video Comparison (COMPLETE)

**What's Implemented:**
- Server-side comparison video generation using OpenCV
- Three visualization modes: Split, Overlay, Ghost
- Phase-synchronized playback between user and baseline
- Pose skeleton drawing with confidence-based styling
- Skeleton JSON export for lightweight mobile rendering

### 🚧 Phase 2: Real-Time Feedback (Future)

**Future Enhancement:**
- On-device real-time skeleton overlay using VisionCamera
- Sub-150ms latency for iOS
- Frame processor worklets for off-thread processing
- Dynamic quality adaptation based on device capabilities

---

## Phase 1: Backend Comparison Videos

### Architecture

```
User Video → Backend API → OpenCV Processing → Comparison Video
                ↓
          MediaPipe Pose
                ↓
       Skeleton Keypoints
                ↓
      Phase Synchronization
                ↓
         Overlay Rendering
```

### Features

#### **1. Three Visualization Modes**

**Split Mode (Default)**
- Side-by-side comparison
- User video on left, baseline on right
- Independent skeleton overlays
- Phase markers synchronized
- Best for: Detailed comparison

**Overlay Mode**
- Both skeletons on user's video
- User skeleton in green (solid)
- Baseline skeleton in cyan (60% opacity)
- Best for: Seeing differences on same frame

**Ghost Mode**
- Baseline skeleton as transparent overlay (30% opacity)
- User skeleton solid on top
- Best for: Subtle reference without distraction

#### **2. Phase Synchronization**

The system synchronizes user and baseline videos by shot phases:

```python
User Phase:     DIP → LOAD → RELEASE → FOLLOW → LAND
                 ↓     ↓       ↓         ↓        ↓
Baseline:       DIP → LOAD → RELEASE → FOLLOW → LAND
```

**Time Warping:**
- Matches baseline frame to user's current phase
- Scales timing based on phase duration ratios
- Resyncs on phase transitions (within 200ms)

#### **3. Pose Skeleton Rendering**

**Connection Drawing:**
- 33 MediaPipe landmarks
- 23 skeletal connections
- Color-coded by confidence:
  - Green (high): visibility > 0.7
  - Orange (medium): visibility 0.5-0.7
  - Red (low): visibility 0.3-0.5
  - Hidden: visibility < 0.3

**Joint Rendering:**
- Circle markers at each joint
- Size based on confidence
- Solid for visible, transparent for occluded

**Phase Markers:**
- Labeled indicators (DIP, LOAD, RELEASE, etc.)
- Appear when within 3 frames of phase event
- Magenta color for visibility

---

## API Usage

### 1. Standard Analysis (No Video)

```bash
curl -X POST http://localhost:8000/analyze/comprehensive \
  -F "video=@my_shot.mp4" \
  -F "baseline_player=Stephen Curry" \
  -F "frame_skip=1"
```

**Response:**
```json
{
  "success": true,
  "overall_score": 76,
  "metrics": {...},
  "phases": {...},
  "comparison": {...}
}
```

### 2. With Comparison Video

```bash
curl -X POST http://localhost:8000/analyze/comparison-video \
  -F "video=@my_shot.mp4" \
  -F "baseline_player=Stephen Curry" \
  -F "comparison_mode=split" \
  -F "frame_skip=1"
```

**Response:**
```json
{
  "success": true,
  "overall_score": 76,
  "comparison_video": {
    "path": "/output/comparisons/comparison_20250110_143022.mp4",
    "filename": "comparison_20250110_143022.mp4",
    "mode": "split",
    "download_url": "/download/comparison/comparison_20250110_143022.mp4"
  },
  "metrics": {...},
  "phases": {...}
}
```

### 3. Mode Options

| Mode | Description | Use Case |
|------|-------------|----------|
| `split` | Side-by-side | Detailed form comparison |
| `overlay` | Both skeletons on user video | See differences in context |
| `ghost` | Transparent baseline overlay | Subtle reference guide |

---

## File Structure

```
backend/
├── services/
│   ├── video_comparator.py      ✅ NEW - OpenCV comparison video generator
│   ├── shot_analysis_service.py ✅ UPDATED - Integration
│   ├── pose_processor.py         ✔️ Existing
│   ├── phase_detector.py         ✔️ Existing
│   └── metrics_calculator.py     ✔️ Existing
├── routes/
│   └── comprehensive_analysis.py ✅ UPDATED - New endpoint
└── output/
    └── comparisons/              ✅ NEW - Generated videos
```

---

## Implementation Details

### VideoComparator Class

**Key Methods:**

```python
class VideoComparator:
    def create_comparison_video(
        user_video_path, user_keypoints, user_phases,
        baseline_video_path, baseline_keypoints, baseline_phases,
        mode='split'
    ) -> str:
        """Generate comparison video with pose overlays"""
    
    def create_skeleton_json(
        keypoints_sequence, phases, fps, output_filename
    ) -> str:
        """Export lightweight skeleton JSON for mobile"""
```

**Skeleton Drawing:**
- Uses OpenCV for rendering
- Draws 23 skeletal connections
- Color-codes by confidence
- Adds phase markers and labels

**Phase Synchronization:**
- Calculates time warp ratio per phase
- Applies offset to baseline frames
- Handles phase transitions smoothly

### Integration with Analysis Service

```python
class ShotAnalysisService:
    def analyze_with_comparison_video(
        video_path, baseline_player, 
        comparison_mode='split',
        generate_video=True
    ) -> Dict:
        """Analysis + comparison video generation"""
```

**Flow:**
1. Run standard comprehensive analysis
2. Load baseline data (video + keypoints)
3. Generate comparison video using VideoComparator
4. Return results with comparison_video_path

---

## Frontend Integration

### Option 1: Download & Display (Immediate)

**React Native:**
```jsx
// After analysis completes
const response = await aiAnalysisService.analyzeWithComparisonVideo(videoUri);

if (response.comparison_video) {
  // Download comparison video
  const comparisonUri = await downloadComparisonVideo(
    response.comparison_video.download_url
  );
  
  // Display in VideoView
  <VideoView source={{ uri: comparisonUri }} />
}
```

### Option 2: Skeleton JSON Rendering (Lightweight)

**For mobile performance:**
```jsx
// Load skeleton JSON instead of full video
const skeletonData = await fetch(skeletonJsonUrl).then(r => r.json());

// Render using react-native-svg
<Svg>
  {skeletonData.frames[currentFrame].points.map(renderSkeleton)}
</Svg>
```

### Option 3: Real-Time (Future - Phase 2)

**Using VisionCamera + frame processors:**
```jsx
import { usePoseDetection } from './hooks/usePoseDetection';

<Camera
  device={device}
  frameProcessor={poseFrameProcessor}
>
  <PoseOverlay
    userKeypoints={userPose}
    referenceKeypoints={referencePose}
    mode="ghost"
  />
</Camera>
```

---

## Configuration

### Backend Settings

**Output Directory:**
```python
# backend/services/video_comparator.py
VideoComparator(output_dir="output/comparisons")
```

**Video Quality:**
```python
# OpenCV fourcc codec
fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # MP4 format
# Or for better compression:
fourcc = cv2.VideoWriter_fourcc(*'H264')  # H.264 codec
```

### Performance Tuning

**Frame Skip:**
- `frame_skip=1`: Process all frames (high quality, slow)
- `frame_skip=2`: Every 2nd frame (balanced)
- `frame_skip=3`: Every 3rd frame (fast, lower quality)

**Resolution:**
```python
# Downscale for faster processing
scale_factor = 0.5  # 50% resolution
width = int(width * scale_factor)
height = int(height * scale_factor)
```

---

## Testing

### 1. Backend Test

```bash
cd backend

# Test video comparison
python3 << EOF
from services.video_comparator import VideoComparator
from services.shot_analysis_service import ShotAnalysisService

# Initialize
service = ShotAnalysisService()

# Analyze with comparison
results = service.analyze_with_comparison_video(
    video_path="test_video.mp4",
    baseline_player="Stephen Curry",
    comparison_mode="split",
    generate_video=True
)

print(f"✅ Comparison video: {results.get('comparison_video_path')}")
EOF
```

### 2. API Test

```bash
# Test endpoint
curl -X POST http://localhost:8000/analyze/comparison-video \
  -F "video=@test_shot.mp4" \
  -F "baseline_player=Stephen Curry" \
  -F "comparison_mode=split" \
  --output response.json

# Check response
cat response.json | jq '.comparison_video'
```

### 3. Frontend Test

```jsx
// Test in app
const testComparisonVideo = async () => {
  const result = await aiAnalysisService.analyzeWithComparisonVideo(
    videoUri,
    'Stephen Curry',
    'split'
  );
  
  console.log('Comparison video:', result.comparison_video);
};
```

---

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'cv2'"

**Solution:**
```bash
cd backend
pip3 install opencv-python-headless
```

### Issue: Comparison video generation fails

**Check:**
1. Baseline video exists
2. Baseline keypoints available
3. User video has valid keypoints
4. Output directory writable

**Debug:**
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Issue: Phase synchronization off

**Fix:**
- Ensure both videos have phase data
- Check phase detection confidence
- Adjust phase hysteresis thresholds

### Issue: Skeleton not visible

**Check:**
1. Keypoint visibility > 0.3
2. Coordinates normalized (0-1 range)
3. OpenCV color channels (BGR not RGB)

---

## Performance

### Benchmarks (Est.)

| Video Length | Resolution | Mode | Processing Time |
|--------------|------------|------|-----------------|
| 3 seconds | 720p | split | ~15-20s |
| 5 seconds | 720p | overlay | ~10-15s |
| 3 seconds | 1080p | split | ~25-30s |
| 5 seconds | 480p | ghost | ~8-12s |

**Bottlenecks:**
1. MediaPipe pose estimation: ~30-50ms/frame
2. OpenCV video encoding: ~10-20ms/frame
3. File I/O: ~2-5s total

**Optimization:**
- Use frame_skip to reduce processing
- Downscale resolution before processing
- Use H.264 codec for smaller file sizes
- Implement caching for baseline data

---

## Future Enhancements (Phase 2)

### Real-Time Feedback

**Requirements:**
- VisionCamera with frame processors
- Reanimated worklets for off-thread processing
- Ring buffer for keypoint smoothing
- Device capability detection

**Architecture:**
```
Camera (60fps) → FrameProcessor (worklet) → Pose Detection (30fps)
       ↓                                            ↓
   Frame Buffer                              Keypoint Buffer
       ↓                                            ↓
   UI Thread ←──────── Smoothing ←──────── Phase Detection
       ↓
  Skeleton Renderer (60fps)
```

**Latency Target:**
- iOS: ≤150ms end-to-end
- Android: ≤250ms end-to-end

**Implementation Steps:**
1. Install VisionCamera + frame processor plugin
2. Implement worklet-based pose detection
3. Create ring buffer for smoothing
4. Build phase-locked reference player
5. Optimize rendering with Skia

---

## API Reference

### POST /analyze/comparison-video

**Request:**
```
POST /analyze/comparison-video
Content-Type: multipart/form-data

video: <file>                    # Video file
baseline_player: string          # NBA player name
comparison_mode: split|overlay|ghost
frame_skip: integer              # Frame processing interval
```

**Response:**
```json
{
  "success": true,
  "video_id": "uuid",
  "overall_score": 76,
  "confidence": 0.92,
  "comparison_video": {
    "path": "/output/comparisons/...",
    "filename": "comparison_20250110.mp4",
    "mode": "split",
    "download_url": "/download/comparison/..."
  },
  "phases": {...},
  "metrics": {...},
  "comparison": {...}
}
```

---

## Summary

### What You Can Do Now:

✅ Generate side-by-side comparison videos  
✅ See pose skeletons overlaid on both videos  
✅ Phase-synchronized playback  
✅ Three visualization modes (split/overlay/ghost)  
✅ Download and review comparison videos  
✅ Export lightweight skeleton JSON for mobile  

### Next Steps:

1. **Test backend comparison video generation**
2. **Integrate with frontend ShootingAnalysisScreen**
3. **Add video download/display in app**
4. **Collect user feedback on visualization**
5. **Plan Phase 2: Real-time implementation**

---

**Status:** ✅ **READY TO TEST**

Start the backend and test the `/analyze/comparison-video` endpoint to see your pose comparison videos!
