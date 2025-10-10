# Comprehensive Shot Analysis API - Documentation

## Overview

The Basketball AI App now includes a **comprehensive shot analysis system** powered by MediaPipe Pose Landmarker. This system provides detailed biomechanical analysis of shooting form with NBA baseline comparisons.

## Features

### 1. **Advanced Pose Estimation**
- MediaPipe Pose Landmarker with 33 keypoints
- Visibility filtering (drops keypoints < 0.3 visibility)
- Savitzky-Golay smoothing (window=7-11 frames)
- Person-centric normalization (origin: mid-hip, scale: body height)

### 2. **Phase Detection**
Automatically detects key shooting phases:
- **Dip Start**: When wrist descends and knees start flexing
- **Load**: Minimum knee angle (maximum flexion)
- **Release**: Peak wrist velocity + elbow extension
- **Follow-Through End**: When wrist stops moving upward
- **Landing**: Local maximum ankle height after flight

Timing constraints:
- Dip duration: ≥ 80ms
- Load to release: 150-450ms

### 3. **Biomechanical Metrics**
Calculates 7 key metrics with quality scores (0-10):

| Metric | Optimal Range | Weight |
|--------|--------------|--------|
| Release Angle | 55-62° | 25% |
| Elbow Flare | 0-10° | 20% |
| Knee Load | 70-90° | 15% |
| Hip-Shoulder Alignment | 0-15° | 15% |
| Base Width Ratio | 0.15-0.25 | 10% |
| Lateral Sway | < 0.05 | 10% |
| Arc Trajectory | 45-55° | 5% |

### 4. **NBA Baseline Comparison**
- Compares user metrics to NBA players (Stephen Curry, etc.)
- Similarity scoring (0-100%)
- Identifies strengths and areas for improvement
- Metric-by-metric delta analysis

### 5. **AI Coaching Cues**
- Top 3 prioritized coaching tips
- Ranked by (distance from optimal) × (metric weight)
- Includes drill recommendations
- Explains "why" for each cue

## API Endpoints

### POST `/analyze/comprehensive`

Complete shot analysis pipeline.

**Request:**
```bash
curl -X POST "http://localhost:8000/analyze/comprehensive" \
  -F "video=@shooting_video.mp4" \
  -F "baseline_player=Stephen Curry" \
  -F "frame_skip=1"
```

**Parameters:**
- `video` (file): Video file (mp4, mov, avi, mkv)
- `baseline_player` (string): NBA player to compare against (default: "Stephen Curry")
- `frame_skip` (int): Process every Nth frame (default: 1 for all frames)

**Response:**
```json
{
  "success": true,
  "video_id": "uuid",
  "overall_score": 87.5,
  "confidence": 0.92,
  "phases": {
    "dip_start": {"timestamp": 0.15, "frame": 9},
    "load": {"timestamp": 0.28, "frame": 17, "knee_angle": 85.2},
    "release": {"timestamp": 0.52, "frame": 31},
    "follow_through_end": {"timestamp": 0.75, "frame": 45},
    "timing": {
      "dip_to_load_ms": 130,
      "load_to_release_ms": 240,
      "total_shot_duration_ms": 370
    }
  },
  "metrics": {
    "release_angle": {
      "angle_deg": 58.5,
      "optimal_range": [55, 62],
      "in_range": true,
      "quality_score": 9.2,
      "description": "Excellent"
    },
    "elbow_flare": {
      "angle_deg": 8.3,
      "optimal_range": [0, 10],
      "in_range": true,
      "quality_score": 8.7,
      "description": "Good tuck"
    },
    ...
  },
  "comparison": {
    "player": "Stephen Curry",
    "overall_similarity": 89.5,
    "strengths": ["Release Angle", "Follow Through"],
    "areas_for_improvement": ["Elbow Alignment", "Lateral Sway"]
  },
  "coaching_cues": [
    {
      "cue": "Tuck your elbow; keep forearm aligned under the ball.",
      "why": "Reduces side-spin and left/right misses.",
      "drill_id": "wall-elbow-slides",
      "metric": "elbow_flare"
    },
    ...
  ],
  "quality": {
    "visibility_ratio": 0.95,
    "confidence": 0.92,
    "warning": null
  }
}
```

### GET `/baselines/available`

Get list of available NBA baseline players.

**Response:**
```json
{
  "available_baselines": ["Stephen Curry", "Kevin Durant", "LeBron James"]
}
```

### GET `/baselines/{player_name}`

Get baseline data for a specific NBA player.

**Response:**
```json
{
  "player_name": "Stephen Curry",
  "baseline_data": {
    "player_name": "Stephen Curry",
    "total_frames": 441,
    "duration": 7.42,
    "metrics": {...}
  }
}
```

## Performance

### Target Performance
- **GPU**: ≤ 3s for 2-second clip
- **CPU**: ≤ 8s for 2-second clip

### Optimization
- Frame skipping: Set `frame_skip=2` to process every other frame (2x speedup)
- Model complexity: Using MediaPipe model_complexity=1 (balanced)
- Memory management: Concurrent request limiting (max 1 at a time)

## Quality Checks

The system performs automatic quality validation:

1. **Visibility Check**: Drops landmarks with visibility < 0.3
2. **Confidence Scoring**: Based on landmark visibility ratio
3. **Phase Validation**: Ensures temporal order and timing constraints
4. **Graceful Degradation**: Returns error with details if quality is insufficient

**Confidence Levels:**
- ≥ 0.8: High confidence
- 0.5-0.8: Medium confidence
- < 0.5: Low confidence (analysis rejected)

**Warning Triggers:**
- Visibility ratio < 0.8: "Low visibility detected - consider re-recording"
- Missing phases: "Could not detect shot phases"
- Invalid timing: "Phase timing constraints violated"

## Error Handling

The API returns structured errors with actionable feedback:

```json
{
  "success": false,
  "error": "Low video quality or visibility",
  "confidence": 0.45,
  "warning": "Low visibility detected - consider re-recording"
}
```

## Installation

```bash
cd backend
pip install -r requirements.txt
```

**Requirements:**
- Python 3.9+
- opencv-python-headless==4.8.1.78
- mediapipe==0.10.8
- numpy==1.26.2
- scipy==1.11.4
- fastapi==0.104.1

## Running the Server

```bash
# Development
python main.py

# Production (with Gunicorn)
gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Testing

### Test Comprehensive Analysis

```bash
# Upload and analyze a video
curl -X POST "http://localhost:8000/analyze/comprehensive" \
  -F "video=@test_shot.mp4" \
  -F "baseline_player=Stephen Curry" \
  | jq .
```

### Test with Frame Skip (faster)

```bash
curl -X POST "http://localhost:8000/analyze/comprehensive" \
  -F "video=@test_shot.mp4" \
  -F "frame_skip=2" \
  | jq .
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Endpoint                        │
│              /analyze/comprehensive                      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│           ShotAnalysisService (Orchestrator)             │
│  - Coordinates full analysis pipeline                    │
│  - Loads NBA baselines                                   │
│  - Generates coaching cues                               │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│PoseProcessor │ │PhaseDetector│ │MetricsCalc   │
│- MediaPipe   │ │- Dip/Load   │ │- Angles      │
│- Smoothing   │ │- Release    │ │- Ratios      │
│- Normalize   │ │- Landing    │ │- Scores      │
└──────────────┘ └─────────────┘ └──────────────┘
```

## Baseline Data Format

NBA baseline data is stored in `baselines/{player_name}.json`:

```json
{
  "player_name": "Stephen Curry",
  "total_frames": 441,
  "duration": 7.42,
  "fps": 59.3,
  "shooting_phases": {
    "setup": {"start": 0, "end": 0},
    "release": {"start": 95, "end": 95},
    "follow_through": {"start": 95, "end": 271}
  },
  "metrics": {
    "release_angle": {
      "elbow_angle": 177.5,
      "trajectory_angle": 85.2,
      "optimal_range": [45, 50]
    },
    ...
  },
  "keypoints_sequence": [...]
}
```

## Coaching Rules

The system uses IF-THEN-THAT rules to generate coaching cues:

```python
{
  'metric': 'elbow_flare',
  'condition': 'angle_deg > 12',
  'cue': 'Tuck your elbow; keep forearm aligned under the ball.',
  'why': 'Reduces side-spin and left/right misses.',
  'drill_id': 'wall-elbow-slides',
  'weight': 0.25
}
```

Rules are ranked by: `(distance_from_optimal) × (metric_weight)`

## Future Enhancements

1. **TensorFlow Lite Fallback**: MoveNet for devices without MediaPipe support
2. **Camera Tilt Correction**: Horizon fitting from background edges
3. **Kalman Filtering**: Alternative to Savitzky-Golay for real-time smoothing
4. **Multi-person Support**: Track multiple players simultaneously
5. **Video Overlay**: Annotated video output with skeleton and metrics

## License

Proprietary - Basketball AI App

## Support

For issues or questions, please contact the development team.
