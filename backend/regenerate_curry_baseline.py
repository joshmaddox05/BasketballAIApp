"""
Regenerate Steph Curry Baseline from Single High-Quality Video
Creates a cached baseline with maximum accuracy for fast comparisons
"""
import json
import sys
from pathlib import Path
import numpy as np
from typing import Dict, Any
import logging

sys.path.insert(0, str(Path(__file__).parent))

from services.pose_processor import PoseProcessor
from services.phase_detector import PhaseDetector
from services.metrics_calculator import MetricsCalculator

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class NumpyEncoder(json.JSONEncoder):
    """Custom JSON encoder for numpy types"""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)


class SingleVideoBaselineCreator:
    """Create high-quality baseline from a single video"""

    def __init__(self):
        # Use MAXIMUM accuracy settings
        self.pose_processor = PoseProcessor(model_complexity=1)
        self.phase_detector = PhaseDetector()
        self.metrics_calculator = MetricsCalculator()

    def create_baseline(self, video_path: str, player_name: str = "Stephen Curry") -> Dict[str, Any]:
        """
        Create baseline from single video with maximum accuracy

        Args:
            video_path: Path to the video file
            player_name: Name of the player

        Returns:
            Complete baseline data ready for caching
        """
        logger.info(f"🎯 Creating baseline for {player_name}")
        logger.info(f"📹 Video: {video_path}")

        video_file = Path(video_path)
        if not video_file.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        # Step 1: Extract pose data with MAXIMUM accuracy (frame_skip=1)
        logger.info("🔍 Step 1/4: Extracting pose data (processing every frame)...")
        pose_data = self.pose_processor.process_video(str(video_file), frame_skip=1)

        logger.info(f"   ✅ Extracted {pose_data['metadata']['processed_frames']} frames")
        logger.info(f"   📊 Confidence: {pose_data['quality']['confidence']:.1%}")

        if pose_data['quality']['confidence'] < 0.6:
            logger.warning(f"⚠️  Low confidence: {pose_data['quality']['confidence']:.1%}")
            logger.warning("   Consider using a clearer video")

        # Step 2: Detect shooting phases
        logger.info("🔍 Step 2/4: Detecting shooting phases...")
        phases = self.phase_detector.detect_phases(pose_data['keypoints_sequence'])

        # For professional baselines, be more lenient with phase validation
        # We need at least load, release, and follow-through
        has_essential_phases = (
            phases.get('load') is not None and
            phases.get('release') is not None and
            phases.get('follow_through_end') is not None
        )

        if not has_essential_phases:
            raise ValueError("Could not detect essential shooting phases (load, release, follow-through). Check video quality.")

        # Override valid flag if we have the essential phases
        if has_essential_phases:
            phases['valid'] = True
            logger.info("   ✅ Essential phases detected (dip may be subtle in pro shots)")

        logger.info(f"   ✅ Detected phases:")
        if 'dip_start' in phases and phases['dip_start']:
            logger.info(f"      • Dip: frame {phases['dip_start']['frame']}")
        else:
            logger.info(f"      • Dip: Not detected (subtle/fast in pro shots)")
        if 'load' in phases:
            logger.info(f"      • Load: frame {phases['load']['frame']}")
        if 'release' in phases:
            logger.info(f"      • Release: frame {phases['release']['frame']}")
        if 'follow_through_end' in phases:
            logger.info(f"      • Follow-through: frame {phases['follow_through_end']['frame']}")

        # Step 3: Calculate all metrics
        logger.info("🔍 Step 3/4: Calculating biomechanical metrics...")
        metrics = self.metrics_calculator.calculate_all_metrics(
            pose_data['keypoints_sequence'],
            phases
        )

        if 'error' in metrics:
            raise ValueError(f"Failed to calculate metrics: {metrics['error']}")

        # Log key metrics
        logger.info("   ✅ Calculated metrics:")
        if 'knee_load' in metrics and 'angle_deg' in metrics['knee_load']:
            logger.info(f"      • Knee Load: {metrics['knee_load']['angle_deg']:.1f}°")
        if 'elbow_flare' in metrics and 'angle_deg' in metrics['elbow_flare']:
            logger.info(f"      • Elbow Flare: {metrics['elbow_flare']['angle_deg']:.1f}°")
        if 'release_angle' in metrics and 'angle_deg' in metrics['release_angle']:
            logger.info(f"      • Release Angle: {metrics['release_angle']['angle_deg']:.1f}°")

        # Step 4: Create baseline structure
        logger.info("🔍 Step 4/4: Assembling baseline data...")

        baseline = {
            'player': player_name,
            'video_source': video_file.name,
            'video_path': str(video_file),
            'created_at': self._get_timestamp(),
            'version': '2.0',
            'quality': {
                'confidence': float(pose_data['quality']['confidence']),
                'frames_processed': int(pose_data['metadata']['processed_frames']),
                'fps': float(pose_data['metadata']['fps']),
                'duration_seconds': float(pose_data['metadata']['duration'])
            },
            'phases': self._serialize_phases(phases),
            'metrics': self._serialize_metrics(metrics),
            'keypoints_sample': self._get_keypoint_samples(pose_data['keypoints_sequence'], phases),
            'metadata': {
                'model_complexity': 1,
                'frame_skip': 1,
                'visibility_threshold': 0.5,
                'tracking_confidence': 0.8
            }
        }

        logger.info("✅ Baseline created successfully!")
        return baseline

    def _serialize_phases(self, phases: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize phase data for JSON"""
        serialized = {}

        phase_keys = ['dip_start', 'load', 'release', 'follow_through_end']
        for key in phase_keys:
            if key in phases and phases[key]:
                serialized[key] = {
                    'frame': int(phases[key]['frame']),
                    'timestamp': float(phases[key]['timestamp'])
                }
                # Add phase-specific data
                if key == 'load' and 'knee_angle' in phases[key]:
                    serialized[key]['knee_angle'] = float(phases[key]['knee_angle'])

        if 'timing' in phases:
            serialized['timing'] = {
                'dip_to_release': float(phases['timing'].get('dip_to_release', 0)),
                'load_to_release': float(phases['timing'].get('load_to_release', 0)),
                'total_shot_time': float(phases['timing'].get('total_shot_time', 0))
            }

        return serialized

    def _serialize_metrics(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize metrics for JSON"""
        serialized = {}

        metric_keys = [
            'knee_load', 'hip_shoulder_alignment', 'elbow_flare',
            'release_angle', 'base_width', 'lateral_sway', 'arc_trajectory'
        ]

        for key in metric_keys:
            if key in metrics and metrics[key] and 'error' not in metrics[key]:
                metric_data = {}

                # Common fields
                if 'quality_score' in metrics[key]:
                    metric_data['quality_score'] = float(metrics[key]['quality_score'])

                # Angle metrics
                if 'angle_deg' in metrics[key]:
                    metric_data['value'] = float(metrics[key]['angle_deg'])
                    metric_data['unit'] = 'degrees'

                # Ratio metrics
                if 'ratio' in metrics[key]:
                    metric_data['value'] = float(metrics[key]['ratio'])
                    metric_data['unit'] = 'ratio'

                if 'sway_ratio' in metrics[key]:
                    metric_data['value'] = float(metrics[key]['sway_ratio'])
                    metric_data['unit'] = 'ratio'

                # Optimal ranges
                if 'optimal_range' in metrics[key]:
                    metric_data['optimal_range'] = metrics[key]['optimal_range']
                if 'in_range' in metrics[key]:
                    metric_data['in_optimal_range'] = bool(metrics[key]['in_range'])

                serialized[key] = metric_data

        return serialized

    def _get_keypoint_samples(self, keypoints_sequence: list, phases: Dict[str, Any]) -> Dict[str, Any]:
        """Extract keypoint samples from key phases for faster comparison"""
        samples = {}

        phase_frames = {
            'dip': phases.get('dip_start', {}).get('frame') if phases.get('dip_start') else None,
            'load': phases.get('load', {}).get('frame') if phases.get('load') else None,
            'release': phases.get('release', {}).get('frame') if phases.get('release') else None,
            'follow_through': phases.get('follow_through_end', {}).get('frame') if phases.get('follow_through_end') else None
        }

        for phase_name, frame_idx in phase_frames.items():
            if frame_idx is not None and frame_idx < len(keypoints_sequence):
                kp = keypoints_sequence[frame_idx]
                # Store only essential landmarks for comparison
                essential_landmarks = [
                    'left_shoulder', 'right_shoulder',
                    'left_elbow', 'right_elbow',
                    'left_wrist', 'right_wrist',
                    'left_hip', 'right_hip',
                    'left_knee', 'right_knee'
                ]

                samples[phase_name] = {}
                for landmark in essential_landmarks:
                    if landmark in kp and isinstance(kp[landmark], dict):
                        samples[phase_name][landmark] = {
                            'x': float(kp[landmark]['x']),
                            'y': float(kp[landmark]['y']),
                            'z': float(kp[landmark]['z'])
                        }

        return samples

    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()

    def save_baseline(self, baseline: Dict[str, Any], output_path: str):
        """Save baseline to JSON file"""
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, 'w') as f:
            json.dump(baseline, f, indent=2, cls=NumpyEncoder)

        logger.info(f"💾 Baseline saved to: {output_file}")

        # Print file size
        size_kb = output_file.stat().st_size / 1024
        logger.info(f"📦 File size: {size_kb:.1f} KB")


def main():
    """Main execution"""
    import argparse

    parser = argparse.ArgumentParser(description='Generate Steph Curry baseline from single video')
    parser.add_argument('video_path', help='Path to video file')
    parser.add_argument('--output', '-o', default='baselines/stephen_curry_single.json',
                       help='Output JSON file path (default: baselines/stephen_curry_single.json)')
    parser.add_argument('--player', '-p', default='Stephen Curry',
                       help='Player name (default: Stephen Curry)')

    args = parser.parse_args()

    try:
        creator = SingleVideoBaselineCreator()

        logger.info("=" * 70)
        logger.info("🏀 STEPH CURRY BASELINE GENERATOR")
        logger.info("=" * 70)

        # Create baseline
        baseline = creator.create_baseline(args.video_path, args.player)

        # Save to file
        creator.save_baseline(baseline, args.output)

        logger.info("=" * 70)
        logger.info("🎉 SUCCESS! Baseline is ready for caching")
        logger.info("=" * 70)
        logger.info(f"📁 Location: {args.output}")
        logger.info(f"⚡ Quality: {baseline['quality']['confidence']:.1%} confidence")
        logger.info(f"📊 Frames: {baseline['quality']['frames_processed']} processed")
        logger.info("")
        logger.info("Next steps:")
        logger.info("1. Update your shot_analysis_service.py to use this baseline")
        logger.info("2. The baseline will be cached automatically on first API request")
        logger.info("3. All future comparisons will use this as reference")

    except Exception as e:
        logger.error(f"❌ Failed to create baseline: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
