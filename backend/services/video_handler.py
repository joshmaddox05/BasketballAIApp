"""
Video Handler with Orientation Detection
Fixes rotation issues and matches videos to correct baselines
"""
import cv2
import numpy as np
from pathlib import Path
import subprocess
import json


class VideoHandler:
    """Handle video orientation and baseline matching"""

    @staticmethod
    def get_rotation_metadata(video_path: str) -> int:
        """Get rotation metadata from video file"""
        try:
            cmd = [
                'ffprobe', '-v', 'error',
                '-select_streams', 'v:0',
                '-show_entries', 'stream_tags=rotate',
                '-of', 'json',
                video_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            data = json.loads(result.stdout)

            if 'streams' in data and len(data['streams']) > 0:
                tags = data['streams'][0].get('tags', {})
                rotation = int(tags.get('rotate', 0))
                return rotation
        except:
            pass

        return 0

    @staticmethod
    def fix_rotation(frame, rotation: int):
        """Fix frame rotation based on metadata"""
        if rotation == 90:
            return cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
        elif rotation == 180:
            return cv2.rotate(frame, cv2.ROTATE_180)
        elif rotation == 270:
            return cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
        return frame

    @staticmethod
    def detect_orientation(video_path: str) -> str:
        """
        Detect if video is front-facing or side-facing
        Returns: 'front' or 'side'

        Uses both aspect ratio and pose analysis for better detection
        """
        cap = cv2.VideoCapture(video_path)

        # Get rotation metadata
        rotation = VideoHandler.get_rotation_metadata(video_path)

        # Read a frame from the middle of the video
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_count // 2)
        ret, frame = cap.read()

        if not ret:
            cap.release()
            return 'side'  # Default

        # Fix rotation if needed
        if rotation != 0:
            frame = VideoHandler.fix_rotation(frame, rotation)

        height, width = frame.shape[:2]
        cap.release()

        # Method 1: Aspect ratio analysis (after rotation fix)
        aspect_ratio = width / height

        # Method 2: Use MediaPipe to analyze pose orientation
        try:
            import mediapipe as mp
            mp_pose = mp.solutions.pose

            with mp_pose.Pose(static_image_mode=True, model_complexity=1) as pose:
                # Convert BGR to RGB
                image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(image_rgb)

                if results.pose_landmarks:
                    landmarks = results.pose_landmarks.landmark

                    # Check shoulder visibility and position
                    left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER]
                    right_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER]
                    nose = landmarks[mp_pose.PoseLandmark.NOSE]

                    # Calculate shoulder width in frame coordinates
                    shoulder_width = abs(left_shoulder.x - right_shoulder.x)

                    # Check if both shoulders are visible (front-facing indicator)
                    both_shoulders_visible = (
                        left_shoulder.visibility > 0.5 and
                        right_shoulder.visibility > 0.5
                    )

                    # Front-facing videos show both shoulders with significant separation
                    # Side-facing videos show shoulders more aligned (less horizontal separation)
                    if both_shoulders_visible and shoulder_width > 0.15:
                        # Wide shoulder separation = front-facing
                        return 'front'
                    elif shoulder_width < 0.08:
                        # Narrow shoulder separation = side-facing
                        return 'side'

                    # If inconclusive, check nose-to-shoulder alignment
                    nose_x = nose.x
                    shoulder_center_x = (left_shoulder.x + right_shoulder.x) / 2

                    # In front view, nose should be between shoulders
                    # In side view, nose is often outside shoulder range
                    if abs(nose_x - shoulder_center_x) < 0.1 and shoulder_width > 0.12:
                        return 'front'
        except:
            pass  # Fall back to aspect ratio if pose detection fails

        # Fallback to aspect ratio
        # Portrait/square videos are more likely front-facing
        # Landscape videos are more likely side-facing
        if aspect_ratio < 1.0:
            # Portrait orientation
            return 'front'
        elif aspect_ratio < 1.3:
            # Nearly square - check if it's more vertical
            return 'front' if aspect_ratio < 1.15 else 'side'
        else:
            # Landscape orientation
            return 'side'

    @staticmethod
    def get_matching_baseline(user_video: str, baselines_dir: str = "baselines") -> str:
        """
        Get the best matching baseline video based on orientation
        Uses organized directory structure: baselines/front_shots and baselines/side_shots
        """
        baselines_path = Path(baselines_dir)

        # Detect user video orientation
        user_orientation = VideoHandler.detect_orientation(user_video)

        print(f"📐 Detected orientation: {user_orientation.upper()}")

        # Determine which directory to use based on orientation
        if user_orientation == 'front':
            search_dir = baselines_path / 'front_shots'
            print(f"🔍 Searching in: baselines/front_shots/")
        else:
            search_dir = baselines_path / 'side_shots'
            print(f"🔍 Searching in: baselines/side_shots/")

        # Find all videos in the appropriate directory
        if search_dir.exists():
            baseline_videos = list(search_dir.glob("*.mp4"))
            if baseline_videos:
                # Sort by file size (larger files are usually better quality)
                baseline_videos.sort(key=lambda x: x.stat().st_size, reverse=True)
                selected = baseline_videos[0]
                print(f"📹 Matching baseline: {selected.name}")
                return str(selected)

        # Fallback: try the opposite orientation if nothing found
        print(f"⚠️  No videos found in {search_dir}, checking other orientation...")
        fallback_dir = baselines_path / ('side_shots' if user_orientation == 'front' else 'front_shots')
        if fallback_dir.exists():
            baseline_videos = list(fallback_dir.glob("*.mp4"))
            if baseline_videos:
                baseline_videos.sort(key=lambda x: x.stat().st_size, reverse=True)
                selected = baseline_videos[0]
                print(f"📹 Using fallback baseline: {selected.name}")
                return str(selected)

        # Last resort: check root baselines directory
        all_baselines = list(baselines_path.glob("*.mp4"))
        if all_baselines:
            print(f"⚠️  Using baseline from root directory: {all_baselines[0].name}")
            return str(all_baselines[0])

        raise FileNotFoundError(f"No baseline videos found in {baselines_dir}")

    @staticmethod
    def get_video_capture_with_rotation(video_path: str):
        """
        Get video capture with rotation fix applied
        Returns: (cap, rotation, fixed_width, fixed_height)
        """
        rotation = VideoHandler.get_rotation_metadata(video_path)
        cap = cv2.VideoCapture(video_path)

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Swap dimensions if rotated 90 or 270 degrees
        if rotation in [90, 270]:
            width, height = height, width

        return cap, rotation, width, height

    @staticmethod
    def convert_mov_to_mp4(input_path: str, output_path: str = None) -> str:
        """
        Convert .mov to .mp4 with proper rotation handling
        """
        if output_path is None:
            output_path = str(Path(input_path).with_suffix('.mp4'))

        try:
            # Use ffmpeg to convert and apply rotation
            cmd = [
                'ffmpeg', '-i', input_path,
                '-vf', 'transpose=dir=clock',  # Fix rotation
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '22',
                '-c:a', 'aac',
                '-y',  # Overwrite
                output_path
            ]

            subprocess.run(cmd, capture_output=True, check=True)
            print(f"✅ Converted: {output_path}")
            return output_path

        except subprocess.CalledProcessError as e:
            print(f"❌ Conversion failed: {e}")
            return input_path
