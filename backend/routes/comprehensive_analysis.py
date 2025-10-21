"""
API Routes for Comprehensive Shot Analysis
"""
from fastapi import UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
from pathlib import Path
from datetime import datetime
import uuid
import shutil
import gc
import logging
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.baseline_analyzer import NumpyEncoder
import numpy as np
import json

logger = logging.getLogger(__name__)

def convert_numpy_types(obj):
    """Recursively convert numpy types to native Python types"""
    import numpy as np
    
    # Handle numpy scalar types
    if isinstance(obj, (np.integer, np.int8, np.int16, np.int32, np.int64, np.uint8, np.uint16, np.uint32, np.uint64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float16, np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, (np.bool_, np.bool8)):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return type(obj)(convert_numpy_types(item) for item in obj)
    elif hasattr(obj, '__dict__'):
        # Handle custom objects with __dict__
        try:
            return {key: convert_numpy_types(value) for key, value in obj.__dict__.items()}
        except:
            return str(obj)
    else:
        return obj

def ensure_json_serializable(obj):
    """Ensure object is JSON serializable by using NumpyEncoder"""
    try:
        # Try to serialize and deserialize to catch any remaining numpy types
        json_str = json.dumps(obj, cls=NumpyEncoder)
        return json.loads(json_str)
    except (TypeError, ValueError) as e:
        logger.warning(f"JSON serialization failed, converting to string: {e}")
        return str(obj)

def setup_comprehensive_analysis_routes(app, upload_dir: Path, get_shot_analysis_service_func):
    """Setup comprehensive analysis API routes"""
    
    @app.post("/analyze/comprehensive")
    async def analyze_shot_comprehensive(
        video: UploadFile = File(...),
        frame_skip: int = Form(default=1)
    ):
        """
        Comprehensive shot analysis with MediaPipe Pose Landmarker
        
        Features:
        - Advanced pose estimation with visibility filtering
        - Phase detection (dip, load, release, follow-through, landing)
        - Biomechanical metrics (knee load, elbow flare, release angle, etc.)
        - Pure form analysis with optimal ranges
        - Top 3 coaching cues with drill recommendations
        
        Args:
            video: Video file (mp4, mov, avi, mkv)
            frame_skip: Process every Nth frame (default: 1 for all frames)
            
        Returns:
            Comprehensive analysis with metrics and coaching cues
        """
        file_path = None
        
        try:
            # Get analysis service
            analysis_service = get_shot_analysis_service_func()
            
            # Generate unique video ID
            video_id = str(uuid.uuid4())
            
            # Validate file type
            if not video.filename.lower().endswith(('.mp4', '.mov', '.avi', '.mkv')):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid file type. Supported: mp4, mov, avi, mkv"
                )
            
            # Save video file
            file_path = upload_dir / f"{video_id}.mp4"
            logger.info(f"💾 Saving video to: {file_path}")
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(video.file, buffer)
            
            logger.info(f"✅ Video saved, starting comprehensive analysis...")
            
            # Perform comprehensive analysis
            results = analysis_service.analyze_shot(
                video_path=str(file_path),
                frame_skip=frame_skip
            )
            
            if not results.get('success', False):
                # Analysis failed - return error with details
                error_response = {
                    "video_id": video_id,
                    "success": False,
                    "error": results.get('error', 'Unknown error'),
                    "confidence": results.get('confidence', 0.0),
                    "warning": results.get('warning'),
                    "analyzed_at": datetime.now().isoformat()
                }
                
                # Clean up video file
                if file_path and file_path.exists():
                    file_path.unlink()
                
                logger.warning(f"⚠️ Analysis failed: {error_response['error']}")
                return JSONResponse(status_code=200, content=error_response, cls=NumpyEncoder)
            
            # Convert numpy types to native Python types
            results = convert_numpy_types(results)
            
            # Format successful response
            response = _format_comprehensive_response(video_id, results)
            
            # Convert response to native Python types and ensure JSON serializable
            try:
                response = convert_numpy_types(response)
                response = ensure_json_serializable(response)
            except Exception as e:
                logger.error(f"Error converting response types: {e}")
                # Fallback: convert everything to strings
                response = str(response)
            
            logger.info(f"✅ Comprehensive analysis complete - Score: {response.get('overall_score', 'N/A')}/100")
            
            # Clean up video file to save storage
            if file_path and file_path.exists():
                file_path.unlink()
                logger.info(f"🗑️ Cleaned up video file")
            
            # Force garbage collection
            gc.collect()
            
            return JSONResponse(content=response, cls=NumpyEncoder)
            
        except Exception as e:
            logger.error(f"❌ Comprehensive analysis error: {str(e)}", exc_info=True)
            
            # Clean up on error
            if file_path and Path(file_path).exists():
                Path(file_path).unlink()
            
            gc.collect()
            
            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed: {str(e)}"
            )
    


def _format_comprehensive_response(video_id: str, results: Dict[str, Any]) -> Dict[str, Any]:
    """Format comprehensive analysis results for API response"""
    
    return {
        "video_id": video_id,
        "success": True,
        "analysis_mode": "comprehensive",
        "overall_score": round(results['overall_score'], 1),
        "confidence": round(results['confidence'], 2),
        
        # Shooting phases with timestamps
        "phases": {
            "dip_start": {
                "timestamp": results['phases']['dip_start']['timestamp'] if results['phases'].get('dip_start') else None,
                "frame": results['phases']['dip_start']['frame'] if results['phases'].get('dip_start') else None
            },
            "load": {
                "timestamp": results['phases']['load']['timestamp'] if results['phases'].get('load') else None,
                "frame": results['phases']['load']['frame'] if results['phases'].get('load') else None,
                "knee_angle": results['phases']['load'].get('knee_angle')
            },
            "release": {
                "timestamp": results['phases']['release']['timestamp'] if results['phases'].get('release') else None,
                "frame": results['phases']['release']['frame'] if results['phases'].get('release') else None
            },
            "follow_through_end": {
                "timestamp": results['phases']['follow_through_end']['timestamp'] if results['phases'].get('follow_through_end') else None,
                "frame": results['phases']['follow_through_end']['frame'] if results['phases'].get('follow_through_end') else None
            },
            "timing": results['phases'].get('timing', {})
        },
        
        # Biomechanical metrics
        "metrics": {
            "knee_load": _format_metric(results['metrics'].get('knee_load')),
            "hip_shoulder_alignment": _format_metric(results['metrics'].get('hip_shoulder_alignment')),
            "elbow_flare": _format_metric(results['metrics'].get('elbow_flare')),
            "release_angle": _format_metric(results['metrics'].get('release_angle')),
            "base_width": _format_metric(results['metrics'].get('base_width')),
            "lateral_sway": _format_metric(results['metrics'].get('lateral_sway')),
            "arc_trajectory": _format_metric(results['metrics'].get('arc_trajectory'))
        },
        
        
        # Top 3 coaching cues
        "coaching_cues": [
            {
                "cue": cue['cue'],
                "why": cue['why'],
                "drill_id": cue.get('drill_id', ''),
                "metric": cue.get('metric', '')
            }
            for cue in results.get('coaching_cues', [])
        ],
        
        # Quality information
        "quality": {
            "visibility_ratio": round(results['quality_info']['visibility_ratio'], 2),
            "confidence": round(results['quality_info']['confidence'], 2),
            "warning": results['quality_info'].get('warning')
        },
        
        # Video metadata
        "metadata": {
            "duration": round(results['metadata']['duration'], 2),
            "fps": round(results['metadata']['fps'], 1),
            "total_frames": results['metadata']['total_frames'],
            "processed_frames": results['metadata']['processed_frames']
        },
        
        "analyzed_at": datetime.now().isoformat()
    }


def _format_metric(metric_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Format metric data for API response"""
    if not metric_data or 'error' in metric_data:
        return {
            "error": metric_data.get('error', 'Not available') if metric_data else 'Not available',
            "quality_score": 0.0
        }
    
    # Convert numpy types to native Python types
    metric_data = convert_numpy_types(metric_data)
    
    formatted = {
        "quality_score": round(metric_data.get('quality_score', 0), 1)
    }
    
    # Add metric-specific fields
    if 'angle_deg' in metric_data:
        formatted['angle_deg'] = round(metric_data['angle_deg'], 1)
    if 'ratio' in metric_data:
        formatted['ratio'] = round(metric_data['ratio'], 3)
    if 'sway_ratio' in metric_data:
        formatted['sway_ratio'] = round(metric_data['sway_ratio'], 3)
    if 'arc_angle_deg' in metric_data:
        formatted['arc_angle_deg'] = round(metric_data['arc_angle_deg'], 1)
    if 'optimal_range' in metric_data:
        formatted['optimal_range'] = metric_data['optimal_range']
    if 'in_range' in metric_data:
        formatted['in_range'] = metric_data['in_range']
    if 'description' in metric_data:
        formatted['description'] = metric_data['description']
    
    return formatted
