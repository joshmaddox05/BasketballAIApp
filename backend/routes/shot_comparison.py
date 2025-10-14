"""
API endpoint for shot comparison with separate video outputs
Returns comparison results + user video + baseline video
"""
from fastapi import UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, FileResponse
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

from compare_to_baseline import compare_to_baseline
from create_separate_videos import SeparateVideoVisualizer
from services.video_handler import VideoHandler

logger = logging.getLogger(__name__)

def setup_comparison_routes(app, upload_dir: Path, output_dir: Path):
    """Setup shot comparison API routes with video outputs"""

    @app.post("/analyze/shot-comparison")
    async def analyze_shot_with_videos(
        video: UploadFile = File(...)
    ):
        """
        Complete shot analysis with comparison videos

        Returns:
        - Detailed comparison metrics (JSON)
        - User video with pose overlay and metrics (MP4)
        - Matched baseline video with pose overlay (MP4)

        The system automatically detects video orientation (front/side)
        and matches with appropriate Steph Curry baseline videos.
        """
        user_video_path = None

        try:
            # Generate unique ID
            video_id = str(uuid.uuid4())

            # Validate file type
            if not video.filename.lower().endswith(('.mp4', '.mov', '.avi', '.mkv')):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid file type. Supported: mp4, mov, avi, mkv"
                )

            # Save uploaded video
            user_video_path = upload_dir / f"{video_id}_user.mp4"
            logger.info(f"💾 Saving video to: {user_video_path}")

            with open(user_video_path, "wb") as buffer:
                shutil.copyfileobj(video.file, buffer)

            logger.info(f"✅ Video saved, starting analysis...")

            # Step 1: Detect orientation and match baseline
            logger.info("🔍 Detecting video orientation...")
            orientation = VideoHandler.detect_orientation(str(user_video_path))
            baseline_video = VideoHandler.get_matching_baseline(str(user_video_path))

            logger.info(f"📐 Orientation: {orientation.upper()}")
            logger.info(f"📹 Matched baseline: {Path(baseline_video).name}")

            # Step 2: Run comparison analysis
            logger.info("📊 Running comparison analysis...")
            comparison_results = compare_to_baseline(str(user_video_path))

            if not comparison_results:
                raise HTTPException(
                    status_code=422,
                    detail="Failed to analyze video. Please ensure: (1) Person is clearly visible, (2) Good lighting, (3) Video is at least 2 seconds long, (4) Person performs a complete shooting motion"
                )

            # Step 3: Generate annotated videos
            logger.info("🎬 Generating visualization videos...")

            comparison_json = output_dir / f"{video_id}_comparison.json"
            user_output = output_dir / f"{video_id}_user_annotated.mp4"
            baseline_output = output_dir / f"{video_id}_baseline_annotated.mp4"

            # Save comparison JSON temporarily
            import json
            with open(comparison_json, 'w') as f:
                json.dump(comparison_results, f)

            # Create visualization videos
            visualizer = SeparateVideoVisualizer()
            visualizer.create_separate_videos(
                str(user_video_path),
                baseline_video,
                str(comparison_json),
                str(user_output),
                str(baseline_output)
            )

            logger.info("✅ Videos generated successfully")

            # Step 4: Format response
            comparison = comparison_results['comparison']
            user_metrics = comparison_results['user_metrics']
            baseline_metrics = comparison_results['baseline_metrics']

            response = {
                "video_id": video_id,
                "success": True,
                "orientation": orientation,
                "baseline_player": "Stephen Curry",
                "baseline_video_used": Path(baseline_video).name,

                # Overall results
                "overall_similarity": comparison['overall_similarity'] * 100,
                "overall_grade": comparison['overall_grade'],

                # Detailed metrics by category
                "wrist_metrics": _format_category_comparison(
                    comparison['categories']['wrist'],
                    user_metrics['wrist'],
                    baseline_metrics['wrist']
                ),
                "head_metrics": _format_category_comparison(
                    comparison['categories']['head'],
                    user_metrics['head'],
                    baseline_metrics['head']
                ),
                "body_metrics": _format_category_comparison(
                    comparison['categories']['body'],
                    user_metrics['body'],
                    baseline_metrics['body']
                ),

                # Top recommendations (worst 3 metrics)
                "top_recommendations": _generate_top_recommendations(comparison),

                # Video URLs (relative paths for app to download)
                "videos": {
                    "user_video": f"/videos/{video_id}_user_annotated.mp4",
                    "baseline_video": f"/videos/{video_id}_baseline_annotated.mp4"
                },

                "analyzed_at": datetime.now().isoformat()
            }

            # Clean up temp files
            if user_video_path.exists():
                user_video_path.unlink()
            if comparison_json.exists():
                comparison_json.unlink()

            logger.info(f"✅ Analysis complete - Similarity: {response['overall_similarity']:.1f}% (Grade: {response['overall_grade']})")

            gc.collect()

            return response

        except Exception as e:
            logger.error(f"❌ Analysis error: {str(e)}", exc_info=True)

            # Clean up on error
            if user_video_path and user_video_path.exists():
                user_video_path.unlink()

            gc.collect()

            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed: {str(e)}"
            )

    @app.get("/videos/{video_filename}")
    async def download_video(video_filename: str):
        """Download generated comparison video"""
        video_path = output_dir / video_filename

        if not video_path.exists():
            raise HTTPException(status_code=404, detail="Video not found")

        return FileResponse(
            path=str(video_path),
            media_type="video/mp4",
            filename=video_filename
        )

    @app.delete("/videos/{video_id}")
    async def cleanup_videos(video_id: str):
        """Clean up generated videos after user has downloaded them"""
        try:
            user_video = output_dir / f"{video_id}_user_annotated.mp4"
            baseline_video = output_dir / f"{video_id}_baseline_annotated.mp4"

            deleted = []
            if user_video.exists():
                user_video.unlink()
                deleted.append("user_video")
            if baseline_video.exists():
                baseline_video.unlink()
                deleted.append("baseline_video")

            return {
                "success": True,
                "deleted": deleted,
                "message": "Videos cleaned up successfully"
            }
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
            raise HTTPException(status_code=500, detail=str(e))


def _format_category_comparison(category_comparison: dict, user_values: dict, baseline_values: dict):
    """Format a category's comparison data for the app"""
    formatted = {}

    for metric_name, comparison_data in category_comparison.items():
        formatted[metric_name] = {
            "your_value": comparison_data['user_value'],
            "curry_average": comparison_data['baseline_mean'],
            "curry_range": comparison_data['baseline_range'],
            "difference": comparison_data['difference'],
            "similarity_percent": comparison_data['similarity'] * 100,
            "grade": comparison_data['grade'],
            "status": "excellent" if comparison_data['grade'] == 'A'
                     else "good" if comparison_data['grade'] == 'B'
                     else "needs_work" if comparison_data['grade'] == 'C'
                     else "poor"
        }

    return formatted


def _generate_top_recommendations(comparison: dict):
    """Generate top 3 recommendations based on worst metrics"""
    all_metrics = []

    # Collect all metrics with their grades and tips
    for category, metrics in comparison['categories'].items():
        for metric_name, data in metrics.items():
            # Map metrics to actionable tips
            tip = _get_metric_tip(category, metric_name, data)

            all_metrics.append({
                "category": category,
                "metric": metric_name.replace('_', ' ').title(),
                "grade": data['grade'],
                "similarity": data['similarity'],
                "difference": data['difference'],
                "tip": tip,
                "priority": _get_priority_score(data['grade'], data['similarity'])
            })

    # Sort by priority (worst first)
    all_metrics.sort(key=lambda x: x['priority'])

    # Return top 3
    return [
        {
            "title": m['metric'],
            "category": m['category'],
            "grade": m['grade'],
            "tip": m['tip'],
            "drill": _get_drill_for_metric(m['category'], m['metric'])
        }
        for m in all_metrics[:3]
    ]


def _get_metric_tip(category: str, metric_name: str, data: dict):
    """Get coaching tip for a specific metric with detailed explanations"""
    difference = data['difference']
    your_value = data['user_value']
    curry_avg = data['baseline_mean']

    if category == 'wrist':
        if 'release_height' in metric_name:
            if difference < 0:
                return f"Your release point is {abs(difference):.1f}° lower than Curry's. Focus on releasing the ball at the peak of your jump with full arm extension. This gives the ball a higher arc and better chance of going in. Practice: Stand close to the basket and focus on releasing at your maximum reach."
            else:
                return f"Good release height! You're releasing {difference:.1f}° higher than average. Just make sure this is consistent on every shot and you maintain control."
        elif 'elbow_angle' in metric_name:
            if difference < 0:
                return f"Your elbow angle at release is {abs(difference):.1f}° more bent than Curry's. Work on extending your shooting arm fully at release - imagine reaching into a cookie jar on a high shelf. This creates better arc and backspin. Drill: Form shooting from 5 feet, focusing on full extension."
            else:
                return f"Your elbow extends {difference:.1f}° more than average. This is okay, but ensure you're not locking out too hard which can reduce touch and control."
        elif 'speed' in metric_name:
            if difference < 0:
                return f"Your shot motion is {abs(difference):.1f} units slower than Curry's. While a smooth shot is good, work on adding a bit more power and explosiveness from your legs. The speed should come from your lower body, not forcing with your arms. Drill: Jump shots focusing on quick, explosive leg drive."
            else:
                return f"Your wrist movement is {difference:.1f} units faster than Curry's optimal speed. Try slowing down slightly for better control and consistency. Remember: smooth is fast. Focus on rhythm over rushing."

    elif category == 'head':
        if 'movement' in metric_name:
            if difference > 0:
                return f"Your head moves {difference:.1f} cm during your shot - {abs(difference/0.4):.1f}x more than Curry's ({curry_avg:.1f} cm). This affects your vision and balance. Practice: Pick a spot on the rim and never take your eyes off it. Drill: Shoot with a small object balanced on your head to feel the stability."
            else:
                return f"Excellent head stability! You're moving only {your_value:.1f} cm, which is better than most players. Keep this consistency."
        elif 'tilt' in metric_name:
            if difference > 0:
                return f"Your head tilts {difference:.1f}° more than ideal. Keep your head level and eyes straight at the target. A tilted head throws off your spatial awareness. Practice: Use a mirror to check that your eyes stay level throughout your shot."
            else:
                return f"Good head position! Your {your_value:.1f}° tilt is close to optimal. Just maintain this on every shot."

    elif category == 'body':
        if 'shoulder' in metric_name:
            if difference > 0:
                return f"Your shoulders are tilted {difference:.1f}° more than Curry's nearly level shoulders ({curry_avg:.1f}°). This creates inconsistent power transfer and can affect accuracy. Focus on keeping shoulders square to the basket. Drill: Practice with a broomstick across your shoulders to feel level alignment."
            else:
                return f"Great shoulder alignment! You're at {your_value:.1f}° which shows good balance and posture."
        elif 'hip' in metric_name:
            if difference > 0:
                return f"Your hips show {difference:.1f}° more tilt than optimal. This indicates you may be favoring one leg or leaning. Work on balanced stance with equal weight distribution. Curry maintains {curry_avg:.1f}° hip level for maximum power and consistency."
            else:
                return f"Solid hip alignment at {your_value:.1f}°. This balanced base helps with consistent power generation."
        elif 'knee' in metric_name:
            if difference < 0:
                return f"Your knee bend is {abs(difference):.1f}° less than Curry's ({curry_avg:.1f}°). Bend your knees more to generate power from your legs, not just your arms. Think of loading a spring - the deeper the dip, the more explosive your shot. Drill: Chair-touch squats before each shot."
            else:
                return f"You're bending {difference:.1f}° more than needed. While leg power is good, too much bend can slow your release and make you inconsistent. Find the sweet spot where you feel balanced and explosive."

    return f"Work on matching Curry's {curry_avg:.1f} {metric_name.replace('_', ' ')} (currently at {your_value:.1f})"


def _get_drill_for_metric(category: str, metric: str):
    """Get recommended drill for improving a metric"""
    drills = {
        'release_height': "Wall touch drill: Jump and touch a point on the wall as high as possible",
        'elbow_angle': "Form shooting: 10 shots close to basket focusing on elbow extension",
        'head_movement': "Balance drill: Shoot with a book balanced on your head",
        'head_tilt': "Mirror work: Practice form in front of mirror keeping head level",
        'shoulder_level': "Wall press: Press back against wall while shooting to feel alignment",
        'hip_level': "One-leg balance: Practice shooting form standing on one leg",
        'knee_bend': "Chair touch: Practice lowering until you touch a chair, then shoot"
    }

    # Find matching drill
    for key, drill in drills.items():
        if key in metric.lower().replace(' ', '_'):
            return drill

    return "Practice this movement slowly, focusing on Curry's form"


def _get_priority_score(grade: str, similarity: float):
    """Calculate priority score (lower = higher priority)"""
    grade_scores = {'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0}
    return grade_scores.get(grade, 0) + similarity
