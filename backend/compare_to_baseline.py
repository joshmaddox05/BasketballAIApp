"""
Shot Comparison Tool - Compare user shot against Steph Curry baseline
Shows detailed metrics comparison with visual feedback
"""
import json
import sys
from pathlib import Path
import logging
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

from services.pose_processor import PoseProcessor
from services.hand_processor import HandProcessor
from services.video_handler import VideoHandler

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


def compare_to_baseline(user_video: str, baseline_dir: str = "baselines"):
    """Compare user's shot to Steph Curry baseline"""

    print("=" * 80)
    print("🏀 SHOT COMPARISON: YOU vs STEPH CURRY")
    print("=" * 80)
    print(f"\n📹 Your shot: {Path(user_video).name}")
    print(f"📊 Baseline: Steph Curry (multiple angles)\n")

    if not Path(user_video).exists():
        print(f"❌ Video not found: {user_video}")
        return

    # Analyze user's shot
    print("🔍 Step 1: Analyzing your shot...")
    user_metrics = analyze_shot_simple(user_video, "Your Shot")

    # Detect orientation and get matching baselines
    print("\n🔍 Step 2: Analyzing Steph Curry baseline...")
    user_orientation = VideoHandler.detect_orientation(user_video)

    # Look in the appropriate subdirectory based on orientation
    if user_orientation == 'front':
        baseline_subdir = Path(baseline_dir) / 'front_shots'
    else:
        baseline_subdir = Path(baseline_dir) / 'side_shots'

    baseline_videos = list(baseline_subdir.glob("*.mp4")) if baseline_subdir.exists() else []

    # Fallback: check both directories if nothing found
    if not baseline_videos:
        print(f"   No videos in {baseline_subdir}, checking all directories...")
        baseline_videos = (
            list(Path(baseline_dir).glob("front_shots/*.mp4")) +
            list(Path(baseline_dir).glob("side_shots/*.mp4")) +
            list(Path(baseline_dir).glob("*.mp4"))
        )

    if not baseline_videos:
        print(f"❌ No baseline videos found in {baseline_dir}")
        return

    print(f"   Found {len(baseline_videos)} baseline videos in {baseline_subdir.name if baseline_subdir.exists() else 'baselines'}")

    baseline_metrics_list = []
    for video in baseline_videos[:3]:  # Use first 3 for speed
        print(f"   Processing {video.name}...")
        metrics = analyze_shot_simple(str(video), "Steph Curry", silent=True)
        if metrics:
            baseline_metrics_list.append(metrics)

    # Aggregate baseline metrics
    baseline_metrics = aggregate_baseline_metrics(baseline_metrics_list)

    # Compare metrics
    print("\n📊 Step 3: Computing comparison...")
    comparison = compare_metrics(user_metrics, baseline_metrics)

    # Display results
    print("\n" + "=" * 80)
    print("📊 COMPARISON RESULTS")
    print("=" * 80)

    display_comparison(comparison, user_metrics, baseline_metrics)

    # Save results
    output_file = Path("output") / f"{Path(user_video).stem}_vs_curry_comparison.json"
    output_file.parent.mkdir(exist_ok=True)

    full_results = {
        'user_video': str(user_video),
        'user_metrics': user_metrics,
        'baseline_metrics': baseline_metrics,
        'comparison': comparison
    }

    with open(output_file, 'w') as f:
        json.dump(full_results, f, indent=2, default=str)

    print(f"\n💾 Full comparison saved to: {output_file}")
    print("\n" + "=" * 80)
    print("✅ COMPARISON COMPLETE")
    print("=" * 80 + "\n")

    return full_results


def analyze_shot_simple(video_path: str, name: str, silent: bool = False):
    """Analyze a single shot and extract key metrics"""

    if not silent:
        print(f"   Analyzing {name}...")

    try:
        # Initialize processors
        pose_processor = PoseProcessor(model_complexity=1)

        # Extract pose data
        pose_data = pose_processor.process_video(video_path, frame_skip=1)
        keypoints_seq = pose_data['keypoints_sequence']
        metadata = pose_data['metadata']

        if not silent:
            print(f"      ✓ {metadata['processed_frames']} frames @ {metadata['fps']:.1f} fps")

        # Find release frame
        release_frame = find_release_frame(keypoints_seq)
        load_frame = max(0, release_frame - 12) if release_frame else len(keypoints_seq) // 3

        # Compute metrics
        metrics = {
            'video_name': name,
            'frames': metadata['processed_frames'],
            'fps': metadata['fps'],
            'release_frame': release_frame,
            'load_frame': load_frame,
            'wrist': compute_wrist_metrics(keypoints_seq, release_frame, load_frame, metadata['fps']),
            'head': compute_head_metrics(keypoints_seq, load_frame, release_frame, metadata['fps']),
            'body': compute_body_metrics(keypoints_seq),
            'quality': pose_data['quality']['confidence']
        }

        return metrics

    except Exception as e:
        if not silent:
            print(f"      ✗ Error: {str(e)}")
        return None


def find_release_frame(keypoints_seq):
    """Find frame with highest wrist position"""
    max_height = 0
    release_frame = None

    for i, frame in enumerate(keypoints_seq):
        if 'right_wrist' in frame and isinstance(frame['right_wrist'], dict):
            wrist = frame['right_wrist']
            if wrist.get('visibility', 0) > 0.5:
                height = 1 - wrist['y']
                if height > max_height:
                    max_height = height
                    release_frame = i

    return release_frame if release_frame is not None else len(keypoints_seq) // 2


def compute_wrist_metrics(keypoints_seq, release_frame, load_frame, fps):
    """Compute wrist metrics"""
    metrics = {
        'release_height': None,
        'elbow_angle_at_release': None,
        'wrist_speed': None
    }

    if release_frame and release_frame < len(keypoints_seq):
        frame = keypoints_seq[release_frame]

        # Release height
        if 'right_wrist' in frame and isinstance(frame['right_wrist'], dict):
            wrist = frame['right_wrist']
            if wrist.get('visibility', 0) > 0.5:
                metrics['release_height'] = (1 - wrist['y']) * 100

        # Elbow angle at release
        if all(k in frame for k in ['right_shoulder', 'right_elbow', 'right_wrist']):
            shoulder = frame['right_shoulder']
            elbow = frame['right_elbow']
            wrist = frame['right_wrist']

            if all(isinstance(x, dict) and x.get('visibility', 0) > 0.5 for x in [shoulder, elbow, wrist]):
                v1 = np.array([shoulder['x'] - elbow['x'], shoulder['y'] - elbow['y']])
                v2 = np.array([wrist['x'] - elbow['x'], wrist['y'] - elbow['y']])

                angle = np.degrees(np.arccos(np.clip(
                    np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6),
                    -1.0, 1.0
                )))
                metrics['elbow_angle_at_release'] = angle

        # Wrist speed (movement between load and release)
        if load_frame and load_frame < len(keypoints_seq):
            load_frame_data = keypoints_seq[load_frame]
            if 'right_wrist' in load_frame_data and isinstance(load_frame_data['right_wrist'], dict):
                wrist_load = load_frame_data['right_wrist']
                if wrist_load.get('visibility', 0) > 0.5:
                    distance = np.sqrt(
                        (wrist['x'] - wrist_load['x'])**2 +
                        (wrist['y'] - wrist_load['y'])**2
                    )
                    time_diff = (release_frame - load_frame) / fps
                    metrics['wrist_speed'] = (distance * 100) / time_diff if time_diff > 0 else 0

    return metrics


def compute_head_metrics(keypoints_seq, load_frame, release_frame, fps):
    """Compute head stability metrics"""
    metrics = {
        'head_tilt': None,
        'head_movement': None
    }

    if not release_frame:
        return metrics

    nose_positions = []

    for frame in keypoints_seq[load_frame:release_frame+1]:
        if 'nose' in frame and isinstance(frame['nose'], dict):
            nose = frame['nose']
            if nose.get('visibility', 0) > 0.5:
                nose_positions.append([nose['x'], nose['y']])

    if len(nose_positions) > 2:
        nose_positions = np.array(nose_positions)

        # Head movement (standard deviation of lateral movement)
        movement = np.std(nose_positions[:, 0]) * 100
        metrics['head_movement'] = movement

        # Head tilt from load frame
        first_frame = keypoints_seq[load_frame]
        if all(k in first_frame for k in ['left_eye', 'right_eye']):
            left_eye = first_frame['left_eye']
            right_eye = first_frame['right_eye']

            if all(isinstance(x, dict) and x.get('visibility', 0) > 0.5 for x in [left_eye, right_eye]):
                eye_vec = np.array([right_eye['x'] - left_eye['x'], right_eye['y'] - left_eye['y']])
                tilt = abs(np.degrees(np.arctan2(eye_vec[1], eye_vec[0])))
                metrics['head_tilt'] = tilt

    return metrics


def compute_body_metrics(keypoints_seq):
    """Compute body alignment metrics"""
    metrics = {
        'shoulder_level': None,
        'hip_level': None,
        'knee_bend': None
    }

    if not keypoints_seq:
        return metrics

    shoulder_tilts = []
    hip_tilts = []
    knee_angles = []

    for frame in keypoints_seq:
        # Shoulder level
        if all(k in frame for k in ['left_shoulder', 'right_shoulder']):
            left = frame['left_shoulder']
            right = frame['right_shoulder']

            if all(isinstance(x, dict) and x.get('visibility', 0) > 0.5 for x in [left, right]):
                tilt = abs(left['y'] - right['y']) * 100
                shoulder_tilts.append(tilt)

        # Hip level
        if all(k in frame for k in ['left_hip', 'right_hip']):
            left = frame['left_hip']
            right = frame['right_hip']

            if all(isinstance(x, dict) and x.get('visibility', 0) > 0.5 for x in [left, right]):
                tilt = abs(left['y'] - right['y']) * 100
                hip_tilts.append(tilt)

        # Knee bend
        if all(k in frame for k in ['right_hip', 'right_knee', 'right_ankle']):
            hip = frame['right_hip']
            knee = frame['right_knee']
            ankle = frame['right_ankle']

            if all(isinstance(x, dict) and x.get('visibility', 0) > 0.5 for x in [hip, knee, ankle]):
                v1 = np.array([hip['x'] - knee['x'], hip['y'] - knee['y']])
                v2 = np.array([ankle['x'] - knee['x'], ankle['y'] - knee['y']])

                angle = np.degrees(np.arccos(np.clip(
                    np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6),
                    -1.0, 1.0
                )))
                knee_angles.append(angle)

    if shoulder_tilts:
        metrics['shoulder_level'] = np.mean(shoulder_tilts)

    if hip_tilts:
        metrics['hip_level'] = np.mean(hip_tilts)

    if knee_angles:
        metrics['knee_bend'] = np.min(knee_angles)  # Deepest bend

    return metrics


def aggregate_baseline_metrics(baseline_metrics_list):
    """Aggregate metrics from multiple baseline videos"""

    if not baseline_metrics_list:
        return None

    aggregated = {
        'videos_analyzed': len(baseline_metrics_list),
        'wrist': {},
        'head': {},
        'body': {}
    }

    # Aggregate each metric category
    for category in ['wrist', 'head', 'body']:
        for metric_name in baseline_metrics_list[0][category].keys():
            values = []
            for baseline in baseline_metrics_list:
                value = baseline[category].get(metric_name)
                if value is not None:
                    values.append(value)

            if values:
                aggregated[category][metric_name] = {
                    'mean': float(np.mean(values)),
                    'std': float(np.std(values)),
                    'min': float(np.min(values)),
                    'max': float(np.max(values))
                }

    return aggregated


def compare_metrics(user_metrics, baseline_metrics):
    """Compare user metrics to baseline"""

    comparison = {
        'overall_similarity': 0.0,
        'categories': {}
    }

    similarities = []

    for category in ['wrist', 'head', 'body']:
        category_comparison = {}

        for metric_name, baseline_data in baseline_metrics[category].items():
            user_value = user_metrics[category].get(metric_name)

            if user_value is not None:
                baseline_mean = baseline_data['mean']
                baseline_std = baseline_data['std']

                # Calculate how close user is to baseline (within 1 std = 100% similarity)
                if baseline_std > 0:
                    z_score = abs(user_value - baseline_mean) / baseline_std
                    similarity = max(0, 1 - (z_score / 2))  # 2 std = 0% similarity
                else:
                    similarity = 1.0 if abs(user_value - baseline_mean) < 1 else 0.5

                category_comparison[metric_name] = {
                    'user_value': user_value,
                    'baseline_mean': baseline_mean,
                    'baseline_range': f"{baseline_data['min']:.1f}-{baseline_data['max']:.1f}",
                    'difference': user_value - baseline_mean,
                    'similarity': similarity,
                    'grade': 'A' if similarity > 0.9 else 'B' if similarity > 0.75 else 'C' if similarity > 0.5 else 'D'
                }

                similarities.append(similarity)

        comparison['categories'][category] = category_comparison

    if similarities:
        comparison['overall_similarity'] = np.mean(similarities)
        comparison['overall_grade'] = 'A' if comparison['overall_similarity'] > 0.9 else 'B' if comparison['overall_similarity'] > 0.75 else 'C' if comparison['overall_similarity'] > 0.5 else 'D'

    return comparison


def display_comparison(comparison, user_metrics, baseline_metrics):
    """Display comparison results in a readable format"""

    print(f"\n🏆 OVERALL SIMILARITY: {comparison['overall_similarity']*100:.1f}% (Grade: {comparison.get('overall_grade', 'N/A')})")

    print("\n" + "-" * 80)
    print("📊 DETAILED COMPARISON")
    print("-" * 80)

    for category, metrics in comparison['categories'].items():
        if not metrics:
            continue

        print(f"\n🎯 {category.upper()} METRICS:")
        print()

        for metric_name, data in metrics.items():
            grade = data['grade']
            similarity = data['similarity'] * 100

            if grade == 'A':
                status = "✅"
            elif grade == 'B':
                status = "✓"
            elif grade == 'C':
                status = "⚠️"
            else:
                status = "❌"

            print(f"   {status} {metric_name.replace('_', ' ').title()}:")
            print(f"      Your value:      {data['user_value']:.1f}")
            print(f"      Curry average:   {data['baseline_mean']:.1f}")
            print(f"      Curry range:     {data['baseline_range']}")
            print(f"      Difference:      {data['difference']:+.1f}")
            print(f"      Similarity:      {similarity:.1f}% (Grade: {grade})")

            # Provide feedback
            if abs(data['difference']) > baseline_metrics[category][metric_name]['std'] * 1.5:
                if category == 'wrist':
                    if 'release_height' in metric_name and data['difference'] < 0:
                        print(f"      💡 Tip: Release the ball higher")
                    elif 'elbow_angle' in metric_name:
                        if data['difference'] < 0:
                            print(f"      💡 Tip: Extend your elbow more at release")
                        else:
                            print(f"      💡 Tip: Keep your elbow bent slightly more")
                elif category == 'head':
                    if 'movement' in metric_name and data['difference'] > 0:
                        print(f"      💡 Tip: Keep your head more stable")
                    elif 'tilt' in metric_name and data['difference'] > 0:
                        print(f"      💡 Tip: Keep your head more level")
                elif category == 'body':
                    if 'shoulder' in metric_name and data['difference'] > 0:
                        print(f"      💡 Tip: Keep your shoulders more level")

            print()


def main():
    user_video = sys.argv[1] if len(sys.argv) > 1 else "tests/TestShot3.mp4"

    compare_to_baseline(user_video)


if __name__ == "__main__":
    main()
