# FastAPI Backend for Basketball AI Analysis with Pro Player Baselines
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uuid
import os
from typing import Dict, Any, Optional, List
import json
from datetime import datetime
import shutil
from pathlib import Path
import numpy as np
import logging

from services.baseline_analyzer import BaselineAnalyzer
from services.shot_comparator import ShotComparator
from services.video_processor import VideoProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Basketball AI Analysis API",
    version="2.0.0",
    description="AI-powered basketball shooting form analysis with pro player comparisons"
)

# Enable CORS for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your app's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
baseline_analyzer = BaselineAnalyzer()
shot_comparator = ShotComparator()
video_processor = VideoProcessor()

# Storage directories
UPLOAD_DIR = Path("uploads")
BASELINES_DIR = Path("baselines")
PROCESSED_DIR = Path("processed")

for dir in [UPLOAD_DIR, BASELINES_DIR, PROCESSED_DIR]:
    dir.mkdir(exist_ok=True)

# In-memory storage (use database in production)
video_storage = {}
analysis_cache = {}

@app.get("/")
async def root():
    return {
        "message": "Basketball AI Analysis API",
        "status": "running",
        "version": "2.0.0",
        "features": [
            "Real-time pose detection with MediaPipe",
            "Pro player baseline comparisons",
            "Detailed shooting form analysis",
            "Personalized feedback generation"
        ],
        "available_baselines": baseline_analyzer.list_available_baselines()
    }

@app.post("/upload/video")
async def upload_video(video: UploadFile = File(...)):
    """Upload video file for analysis"""
    try:
        # Generate unique video ID
        video_id = str(uuid.uuid4())
        
        # Validate file type
        if not video.filename.lower().endswith(('.mp4', '.mov', '.avi', '.mkv')):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Supported: mp4, mov, avi, mkv"
            )
        
        # Save video file
        file_path = UPLOAD_DIR / f"{video_id}.mp4"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        
        # Get video metadata
        try:
            metadata = video_processor.get_video_metadata(str(file_path))
        except Exception as e:
            logger.warning(f"Could not extract metadata: {e}")
            metadata = {"error": "Could not extract metadata"}
        
        # Store video metadata
        video_storage[video_id] = {
            "id": video_id,
            "filename": video.filename,
            "filepath": str(file_path),
            "metadata": metadata,
            "uploaded_at": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Video uploaded: {video_id}")
        
        return {
            "video_id": video_id,
            "message": "Video uploaded successfully",
            "metadata": metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/analyze/shooting")
async def analyze_shooting_form(request: Dict[str, Any]):
    """Analyze shooting form from uploaded video with optional pro player comparison"""
    try:
        video_id = request.get("video_id")
        analysis_mode = request.get("analysis_mode", "shooting")
        camera_type = request.get("camera_type", "back")
        duration = request.get("duration", 5.0)
        comparison_player = request.get("comparison_player")
        
        if video_id not in video_storage:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video_info = video_storage[video_id]
        video_path = video_info['filepath']
        
        logger.info(f"🎯 Analyzing video: {video_id}")
        
        # Process video and extract pose data
        user_analysis = video_processor.analyze_shooting_video(video_path)
        
        # If comparison player specified, compare forms
        comparison = None
        if comparison_player:
            try:
                comparison = shot_comparator.compare_to_baseline(
                    user_analysis,
                    comparison_player
                )
            except Exception as e:
                logger.warning(f"Comparison failed: {e}")
                comparison = None
        
        # Generate comprehensive results
        results = {
            "video_id": video_id,
            "analysis_mode": analysis_mode,
            "overall_score": _calculate_overall_score(user_analysis),
            "confidence": user_analysis.get('confidence', 0.85),
            "metrics": _format_metrics_for_app(user_analysis['metrics']),
            "keypoints": user_analysis.get('keypoints_sequence', [])[:10],  # First 10 frames
            "recommendations": _generate_recommendations(user_analysis, comparison),
            "biomechanics": _format_biomechanics(user_analysis),
            "comparison": comparison,
            "analyzed_at": datetime.now().isoformat()
        }
        
        # Cache results
        analysis_cache[video_id] = results
        
        logger.info(f"✅ Analysis complete - Score: {results['overall_score']}")
        
        return results
        
    except Exception as e:
        logger.error(f"❌ Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/analyze/compare-to-curry")
async def compare_to_curry(video: UploadFile = File(...)):
    """
    Upload a video and immediately compare it to Steph Curry's shooting form.
    This is a streamlined endpoint that handles upload, analysis, and comparison in one call.
    """
    try:
        # Step 1: Upload and save video
        video_id = str(uuid.uuid4())
        
        # Validate file type
        if not video.filename.lower().endswith(('.mp4', '.mov', '.avi', '.mkv')):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Supported: mp4, mov, avi, mkv"
            )
        
        # Save video file
        file_path = UPLOAD_DIR / f"{video_id}.mp4"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        
        logger.info(f"📹 Video uploaded for Curry comparison: {video_id}")
        
        # Store video metadata
        video_storage[video_id] = {
            "id": video_id,
            "filename": video.filename,
            "filepath": str(file_path),
            "uploaded_at": datetime.now().isoformat()
        }
        
        # Step 2: Analyze user's shooting form
        logger.info(f"🎯 Analyzing user's shooting form...")
        user_analysis = video_processor.analyze_shooting_video(str(file_path))
        
        # Step 3: Compare to Steph Curry's baseline
        logger.info(f"🏀 Comparing to Steph Curry's form...")
        comparison = shot_comparator.compare_to_baseline(
            user_analysis,
            "stephen_curry"
        )
        
        # Step 4: Generate comprehensive results
        overall_score = _calculate_overall_score(user_analysis)
        
        results = {
            "video_id": video_id,
            "analysis_mode": "curry_comparison",
            "overall_score": overall_score,
            "similarity_to_curry": comparison['overall_similarity'],
            "confidence": user_analysis.get('confidence', 0.85),
            
            # User's metrics formatted for the app
            "your_metrics": _format_metrics_for_app(user_analysis['metrics']),
            
            # Comparison details
            "comparison": {
                "player": "Stephen Curry",
                "position": "Point Guard",
                "team": "Golden State Warriors",
                "overall_similarity": comparison['overall_similarity'],
                "metric_comparisons": comparison['metric_comparisons'],
                "strengths": comparison.get('strengths', []),
                "areas_for_improvement": comparison.get('areas_for_improvement', []),
            },
            
            # Specific recommendations based on comparison
            "recommendations": comparison.get('specific_feedback', [])[:5],
            
            # Biomechanics comparison
            "biomechanics_comparison": {
                "your_form": _format_biomechanics(user_analysis),
                "curry_form": {
                    "release_angle": "48.5°",
                    "arc_angle": "47.0°",
                    "follow_through_extension": "Excellent",
                    "stance_width": "Optimal"
                }
            },
            
            # Visual data for charts
            "visual_data": {
                "similarity_breakdown": [
                    {
                        "metric": "Release Angle",
                        "similarity": comparison['metric_comparisons']['release_angle']['similarity'] * 100,
                        "your_value": user_analysis['metrics']['release_angle']['trajectory_angle'],
                        "curry_value": 48.5
                    },
                    {
                        "metric": "Elbow Alignment",
                        "similarity": comparison['metric_comparisons']['elbow_alignment']['similarity'] * 100,
                        "your_value": user_analysis['metrics']['elbow_alignment']['consistency'] * 100,
                        "curry_value": 95.0
                    },
                    {
                        "metric": "Follow Through",
                        "similarity": comparison['metric_comparisons']['follow_through']['similarity'] * 100,
                        "your_value": user_analysis['metrics']['follow_through']['quality_score'] * 10,
                        "curry_value": 95.0
                    },
                    {
                        "metric": "Balance",
                        "similarity": comparison['metric_comparisons']['balance']['similarity'] * 100,
                        "your_value": user_analysis['metrics']['balance']['stability_score'] * 10,
                        "curry_value": 90.0
                    }
                ]
            },
            
            "analyzed_at": datetime.now().isoformat()
        }
        
        # Cache results
        analysis_cache[video_id] = results
        
        logger.info(f"✅ Curry comparison complete - Similarity: {comparison['overall_similarity']:.1f}%")
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Curry comparison error: {str(e)}")
        # Clean up file if it was created
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

@app.get("/analysis/{video_id}")
async def get_analysis(video_id: str):
    """Get cached analysis results"""
    if video_id not in analysis_cache:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return analysis_cache[video_id]

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "baseline_analyzer": "operational",
            "shot_comparator": "operational",
            "video_processor": "operational"
        },
        "storage": {
            "videos": len(video_storage),
            "analyses": len(analysis_cache),
            "baselines": len(baseline_analyzer.list_available_baselines())
        }
    }

@app.post("/baseline/create")
async def create_baseline(
    video: UploadFile = File(...),
    player_name: str = Form(...),
    position: str = Form("Guard"),
    team: str = Form("")
):
    """Create a new pro player baseline from video"""
    try:
        # Save baseline video
        baseline_id = str(uuid.uuid4())
        video_path = BASELINES_DIR / f"{baseline_id}.mp4"
        
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        
        logger.info(f"📹 Creating baseline for {player_name}...")
        
        # Analyze and create baseline
        baseline_data = baseline_analyzer.analyze_pro_video(
            str(video_path),
            player_name
        )
        
        # Add metadata
        baseline_data['position'] = position
        baseline_data['team'] = team
        baseline_data['video_id'] = baseline_id
        
        logger.info(f"✅ Baseline created for {player_name}")
        
        return {
            "message": f"Baseline created for {player_name}",
            "player_name": player_name,
            "position": position,
            "team": team,
            "metrics_summary": {
                "release_angle": baseline_data['metrics']['release_angle']['trajectory_angle'],
                "follow_through_score": baseline_data['metrics']['follow_through']['quality_score'],
                "balance_score": baseline_data['metrics']['balance']['stability_score']
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Baseline creation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Baseline creation failed: {str(e)}"
        )

@app.get("/baselines/list")
async def list_baselines():
    """List all available pro player baselines"""
    try:
        baselines = baseline_analyzer.list_available_baselines()
        
        detailed_baselines = []
        for player in baselines:
            try:
                baseline = baseline_analyzer.load_baseline(player)
                detailed_baselines.append({
                    "name": player,
                    "position": baseline.get('position', 'Unknown'),
                    "team": baseline.get('team', 'Unknown'),
                    "created_at": baseline.get('created_at', 'Unknown'),
                    "metrics": {
                        "release_angle": baseline['metrics']['release_angle']['trajectory_angle'],
                        "follow_through": baseline['metrics']['follow_through']['quality_score'],
                        "balance": baseline['metrics']['balance']['stability_score']
                    }
                })
            except:
                detailed_baselines.append({
                    "name": player,
                    "position": "Unknown",
                    "team": "Unknown"
                })
        
        return {
            "count": len(detailed_baselines),
            "baselines": detailed_baselines
        }
    except Exception as e:
        logger.error(f"❌ Error listing baselines: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/video/{video_id}")
async def delete_video(video_id: str):
    """Delete uploaded video and its analysis"""
    if video_id in video_storage:
        # Delete file
        try:
            os.remove(video_storage[video_id]['filepath'])
        except:
            pass
        
        # Remove from storage
        del video_storage[video_id]
        
        if video_id in analysis_cache:
            del analysis_cache[video_id]
        
        return {"message": "Video deleted successfully"}
    
    raise HTTPException(status_code=404, detail="Video not found")

# Helper functions
def _calculate_overall_score(analysis: Dict[str, Any]) -> int:
    """Calculate overall shooting form score"""
    metrics = analysis['metrics']
    
    scores = [
        metrics['release_angle'].get('quality_score', 7) * 10,
        metrics['elbow_alignment'].get('consistency', 0.7) * 100,
        metrics['follow_through'].get('quality_score', 7) * 10,
        metrics['balance'].get('stability_score', 7) * 10
    ]
    
    return int(np.mean(scores))

def _format_metrics_for_app(metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Format metrics for React Native app"""
    formatted = []
    
    # Release angle
    release = metrics['release_angle']
    formatted.append({
        "id": "release_angle",
        "name": "Release Angle",
        "score": release.get('quality_score', 7),
        "value": f"{release['trajectory_angle']:.1f}°",
        "ideal": "45-50°",
        "status": "good" if 45 <= release['trajectory_angle'] <= 50 else "improve",
        "feedback": "Your release angle is within optimal range" if 45 <= release['trajectory_angle'] <= 50 else "Try to release at 45-50 degrees"
    })
    
    # Elbow alignment
    elbow = metrics['elbow_alignment']
    formatted.append({
        "id": "elbow_alignment",
        "name": "Elbow Alignment",
        "score": elbow.get('consistency', 0.7) * 10,
        "value": "Good" if elbow['average_offset'] < 0.05 else "Needs work",
        "ideal": "Under ball",
        "status": "good" if elbow['average_offset'] < 0.05 else "improve",
        "feedback": "Keep elbow directly under ball throughout shot"
    })
    
    # Follow-through
    follow = metrics['follow_through']
    formatted.append({
        "id": "follow_through",
        "name": "Follow Through",
        "score": follow.get('quality_score', 7),
        "value": "Excellent" if follow['extension_distance'] > 0.15 else "Good",
        "ideal": "Full extension",
        "status": "good",
        "feedback": "Great follow-through motion"
    })
    
    # Balance
    balance = metrics['balance']
    formatted.append({
        "id": "balance",
        "name": "Balance & Stance",
        "score": balance.get('stability_score', 7),
        "value": "Stable" if balance['stability_score'] > 7 else "Needs work",
        "ideal": "Stable base",
        "status": "good" if balance['stability_score'] > 7 else "improve",
        "feedback": "Focus on maintaining a solid base"
    })
    
    return formatted

def _format_biomechanics(analysis: Dict[str, Any]) -> Dict[str, str]:
    """Format biomechanics data"""
    metrics = analysis['metrics']
    
    return {
        "release_height": f"{metrics['release_angle']['trajectory_angle']:.1f}°",
        "arc_angle": f"{metrics.get('arc_trajectory', {}).get('arc_angle', 47):.1f}°",
        "follow_through_extension": f"{metrics['follow_through']['extension_distance']:.2f}m",
        "stance_width": f"{metrics['balance']['average_stance_width']:.2f}m"
    }

def _generate_recommendations(
    analysis: Dict[str, Any],
    comparison: Optional[Dict[str, Any]]
) -> List[str]:
    """Generate personalized recommendations"""
    recommendations = []
    
    if comparison and 'specific_feedback' in comparison:
        recommendations.extend(comparison['specific_feedback'][:3])
    
    # Add general recommendations based on metrics
    metrics = analysis['metrics']
    
    if metrics['balance']['stability_score'] < 7:
        recommendations.append("Practice shooting with feet shoulder-width apart for better balance")
    
    if metrics['elbow_alignment']['average_offset'] > 0.05:
        recommendations.append("Focus on keeping your elbow aligned under the ball")
    
    if metrics['follow_through']['extension_distance'] < 0.1:
        recommendations.append("Work on extending your follow-through completely")
    
    return recommendations[:5]  # Return top 5

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
