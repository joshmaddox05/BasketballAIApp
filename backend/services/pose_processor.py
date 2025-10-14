"""
Pose Processor - Extract pose data from videos using MediaPipe
OPTIMIZED for Standard Plan (2GB RAM, 1 CPU)
"""
import cv2
import mediapipe as mp
import numpy as np
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


class PoseProcessor:
    """Extract pose data from videos using MediaPipe with optimization"""

    def __init__(self, model_complexity=1):
        """
        Initialize pose processor with optimized settings

        Args:
            model_complexity: 0=Lite (fastest), 1=Full (balanced), 2=Heavy (most accurate)
                             Standard Plan: Use 1 for best balance of speed + accuracy
        """
        self.model_complexity = model_complexity

        # Create a fresh model instance (don't cache - causes internal state issues)
        logger.info(f"🔧 Loading MediaPipe Pose model (complexity={model_complexity})...")
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=model_complexity,  # 1=Full model for better accuracy on Standard plan
            enable_segmentation=False,  # Disabled to save memory
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        logger.info("✅ Model loaded")

    def process_video(self, video_path: str, frame_skip: int = 2) -> Dict[str, Any]:
        """
        Process video and extract pose keypoints with optimization

        Args:
            video_path: Path to video file
            frame_skip: Process every Nth frame (2 = 15fps for 30fps video)
                       Standard Plan: Use 2 for good balance of speed + accuracy
        """
        logger.info(f"🎥 Processing video: {video_path} (frame_skip={frame_skip})")

        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 30.0

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Less aggressive frame skip for Standard plan (better accuracy)
        if total_frames > 200:  # Increased threshold
            frame_skip = max(frame_skip, 3)  # Only skip more for very long videos

        effective_fps = fps / frame_skip

        logger.info(f"📊 Video: {total_frames} frames @ {fps:.1f}fps → processing @ {effective_fps:.1f}fps")

        keypoints_sequence = []
        frame_number = 0
        processed_count = 0
        low_confidence_count = 0

        while cap.isOpened():
            ret, frame = cap.read()

            if not ret:
                break
            
            # Skip frames for performance
            if frame_number % frame_skip != 0:
                frame_number += 1
                continue
            
            # Keep higher resolution on Standard plan (better accuracy)
            if width > 1920:  # Only resize very large videos
                scale = 1920 / width
                frame = cv2.resize(frame, (1920, int(height * scale)))

            # Convert to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Process pose with error handling
            try:
                results = self.pose.process(rgb_frame)
            except Exception as e:
                logger.warning(f"Frame {frame_number} processing error: {e}")
                frame_number += 1
                continue

            if results and results.pose_landmarks:
                keypoints = self._extract_keypoints(results.pose_landmarks)

                # Track confidence
                avg_visibility = np.mean([
                    kp.get('visibility', 0)
                    for kp in keypoints.values()
                    if isinstance(kp, dict)
                ])

                if avg_visibility < 0.5:
                    low_confidence_count += 1

                keypoints['frame'] = frame_number
                keypoints['timestamp'] = frame_number / fps
                keypoints_sequence.append(keypoints)
                processed_count += 1

            frame_number += 1

            # Progress logging (every 30 frames)
            if processed_count > 0 and processed_count % 30 == 0:
                logger.info(f"   Processed {processed_count} frames...")

        cap.release()
        
        if not keypoints_sequence:
            raise ValueError("No pose detected in video - ensure person is visible")

        confidence = max(0.5, min(0.95, 1.0 - (low_confidence_count / max(1, processed_count))))

        logger.info(f"✅ Extracted {processed_count} frames (confidence: {confidence:.2%})")

        return {
            'keypoints_sequence': keypoints_sequence,
            'metadata': {
                'total_frames': total_frames,
                'processed_frames': processed_count,
                'fps': fps,
                'effective_fps': effective_fps,
                'frame_skip': frame_skip,
                'width': width,
                'height': height,
                'duration': total_frames / fps
            },
            'quality': {
                'confidence': confidence,
                'low_confidence_frames': low_confidence_count
            }
        }
    
    def _extract_keypoints(self, landmarks) -> Dict[str, Any]:
        """Extract keypoints from MediaPipe landmarks"""
        keypoints = {}

        # MediaPipe landmark names mapping
        landmark_names = [
            'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
            'right_eye_inner', 'right_eye', 'right_eye_outer',
            'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
            'left_index', 'right_index', 'left_thumb', 'right_thumb',
            'left_hip', 'right_hip', 'left_knee', 'right_knee',
            'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
            'left_foot_index', 'right_foot_index'
        ]

        for idx, lm in enumerate(landmarks.landmark):
            if lm.visibility < 0.5:
                continue

            # Get landmark name by index
            if idx < len(landmark_names):
                name = landmark_names[idx]
            else:
                continue  # Skip unknown landmarks

            keypoints[name] = {
                'x': lm.x,
                'y': lm.y,
                'z': lm.z,
                'visibility': lm.visibility
            }

        return keypoints
    
    def __del__(self):
        """Clean up resources"""
        try:
            if hasattr(self, 'pose') and self.pose is not None:
                self.pose.close()
        except Exception:
            pass  # Ignore cleanup errors
