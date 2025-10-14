"""
Pose Processor - Extract pose data from videos using MediaPipe
OPTIMIZED for low-memory environments (Render free tier)
"""
import cv2
import mediapipe as mp
import numpy as np
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

# Global model cache to avoid reloading on every request
_pose_model_cache = {}

class PoseProcessor:
    """Extract pose data from videos using MediaPipe with optimization"""

    def __init__(self, model_complexity=0):
        """
        Initialize pose processor with optimized settings

        Args:
            model_complexity: 0=Lite (fastest, 150MB less memory), 1=Full, 2=Heavy
        """
        self.model_complexity = model_complexity

        # Use cached model if available
        cache_key = f"pose_model_{model_complexity}"
        if cache_key not in _pose_model_cache:
            logger.info(f"🔧 Loading MediaPipe Pose model (complexity={model_complexity})...")
            self.mp_pose = mp.solutions.pose
            self.pose = self.mp_pose.Pose(
                static_image_mode=False,
                model_complexity=model_complexity,  # 0=Lite for speed
                enable_segmentation=False,  # Disable to save memory
                smooth_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            _pose_model_cache[cache_key] = (self.mp_pose, self.pose)
            logger.info("✅ Model loaded and cached")
        else:
            logger.info(f"♻️ Using cached MediaPipe model")
            self.mp_pose, self.pose = _pose_model_cache[cache_key]

    def process_video(self, video_path: str, frame_skip: int = 3) -> Dict[str, Any]:
        """
        Process video and extract pose keypoints with optimization

        Args:
            video_path: Path to video file
            frame_skip: Process every Nth frame (3 = 10fps for 30fps video)
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
        
        # Adaptive frame skip based on video length
        if total_frames > 150:
            frame_skip = max(frame_skip, 5)  # Skip more for long videos

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
            
            # Resize frame for faster processing (if too large)
            if width > 1280:
                scale = 1280 / width
                frame = cv2.resize(frame, (1280, int(height * scale)))

            # Convert to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Process pose
            results = self.pose.process(rgb_frame)
            
            if results.pose_landmarks:
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

        for lm in landmarks.landmark:
            if lm.visibility < 0.5:
                continue

            # Keypoint name by index
            name = mp.solutions.pose.PoseLandmark(lm).name.lower()

            keypoints[name] = {
                'x': lm.x,
                'y': lm.y,
                'z': lm.z,
                'visibility': lm.visibility
            }

        return keypoints
    
    def __del__(self):
        """Clean up resources"""
        if hasattr(self, 'pose'):
            self.pose.close()
