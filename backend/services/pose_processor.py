"""
Enhanced Pose Processor with MediaPipe Pose Landmarker
Tracks critical joints: shoulders, elbows, hips, knees, ankles, wrists
Includes smoothing, normalization, and visibility filtering
"""
import cv2
import mediapipe as mp
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from scipy.signal import savgol_filter
from scipy.spatial.distance import euclidean
import logging

logger = logging.getLogger(__name__)

class PoseProcessor:
    """Advanced pose estimation and tracking for basketball shot analysis"""
    
    # MediaPipe Pose landmark indices (33 landmarks)
    LANDMARK_INDICES = {
        'nose': 0,
        'left_eye_inner': 1,
        'left_eye': 2,
        'left_eye_outer': 3,
        'right_eye_inner': 4,
        'right_eye': 5,
        'right_eye_outer': 6,
        'left_ear': 7,
        'right_ear': 8,
        'mouth_left': 9,
        'mouth_right': 10,
        'left_shoulder': 11,
        'right_shoulder': 12,
        'left_elbow': 13,
        'right_elbow': 14,
        'left_wrist': 15,
        'right_wrist': 16,
        'left_pinky': 17,
        'right_pinky': 18,
        'left_index': 19,
        'right_index': 20,
        'left_thumb': 21,
        'right_thumb': 22,
        'left_hip': 23,
        'right_hip': 24,
        'left_knee': 25,
        'right_knee': 26,
        'left_ankle': 27,
        'right_ankle': 28,
        'left_heel': 29,
        'right_heel': 30,
        'left_foot_index': 31,
        'right_foot_index': 32
    }
    
    # Priority landmarks for shot analysis
    CRITICAL_LANDMARKS = [
        'left_shoulder', 'right_shoulder',
        'left_elbow', 'right_elbow',
        'left_wrist', 'right_wrist',
        'left_hip', 'right_hip',
        'left_knee', 'right_knee',
        'left_ankle', 'right_ankle'
    ]
    
    MIN_VISIBILITY = 0.3  # Drop landmarks below this threshold
    MIN_CONFIDENCE = 0.5
    
    def __init__(self, model_complexity: int = 1):
        """
        Initialize pose processor
        Args:
            model_complexity: 0=Lite (fast), 1=Full (balanced), 2=Heavy (accurate)
        """
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=model_complexity,
            enable_segmentation=False,
            smooth_landmarks=True,
            min_detection_confidence=self.MIN_CONFIDENCE,
            min_tracking_confidence=self.MIN_CONFIDENCE
        )
        logger.info(f"✅ PoseProcessor initialized with model_complexity={model_complexity}")
    
    def process_video(self, video_path: str, frame_skip: int = 1) -> Dict[str, Any]:
        """
        Process video and extract pose landmarks with visibility filtering
        
        Args:
            video_path: Path to video file
            frame_skip: Process every Nth frame (1=all frames)
            
        Returns:
            Dictionary with keypoints, metadata, and quality metrics
        """
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        logger.info(f"📹 Processing video: {total_frames} frames @ {fps:.1f}fps, {width}x{height}")
        
        raw_keypoints = []
        frame_number = 0
        low_visibility_frames = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Skip frames for performance
            if frame_number % frame_skip != 0:
                frame_number += 1
                continue
            
            # Process frame
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb_frame)
            
            if results.pose_landmarks:
                keypoints = self._extract_keypoints_with_visibility(
                    results.pose_landmarks,
                    frame_number,
                    frame_number / fps,
                    width,
                    height
                )
                
                # Check if we have sufficient landmark visibility
                visible_count = sum(1 for lm in self.CRITICAL_LANDMARKS 
                                  if keypoints.get(lm, {}).get('visibility', 0) >= self.MIN_VISIBILITY)
                
                if visible_count < len(self.CRITICAL_LANDMARKS) * 0.5:
                    low_visibility_frames += 1
                
                raw_keypoints.append(keypoints)
            else:
                low_visibility_frames += 1
                # Add null frame to maintain temporal continuity
                raw_keypoints.append({
                    'frame': frame_number,
                    'timestamp': frame_number / fps,
                    'visible': False
                })
            
            frame_number += 1
        
        cap.release()
        
        # Calculate quality metrics
        processed_frames = len(raw_keypoints)
        visibility_ratio = 1.0 - (low_visibility_frames / max(processed_frames, 1))
        
        logger.info(f"✅ Processed {processed_frames} frames, visibility: {visibility_ratio:.1%}")
        
        # Smooth and normalize keypoints
        smoothed_keypoints = self._smooth_keypoints(raw_keypoints)
        normalized_keypoints = self._normalize_keypoints(smoothed_keypoints)
        
        return {
            'keypoints_sequence': normalized_keypoints,
            'raw_keypoints': raw_keypoints,
            'metadata': {
                'total_frames': total_frames,
                'processed_frames': processed_frames,
                'fps': fps,
                'duration': total_frames / fps,
                'width': width,
                'height': height,
                'frame_skip': frame_skip
            },
            'quality': {
                'visibility_ratio': visibility_ratio,
                'low_visibility_frames': low_visibility_frames,
                'confidence': max(0.0, min(1.0, visibility_ratio)),
                'warning': 'Low visibility detected - consider re-recording' if visibility_ratio < 0.8 else None
            }
        }
    
    def _extract_keypoints_with_visibility(
        self, 
        landmarks, 
        frame: int, 
        timestamp: float,
        width: int,
        height: int
    ) -> Dict[str, Any]:
        """Extract keypoints with visibility scores and normalized coordinates"""
        keypoints = {
            'frame': frame,
            'timestamp': timestamp,
            'visible': True
        }
        
        for name, idx in self.LANDMARK_INDICES.items():
            if idx < len(landmarks.landmark):
                lm = landmarks.landmark[idx]
                
                # Extract with visibility filtering
                visibility = lm.visibility if hasattr(lm, 'visibility') else 1.0
                
                if visibility >= self.MIN_VISIBILITY:
                    keypoints[name] = {
                        'x': lm.x,  # Normalized [0,1]
                        'y': lm.y,  # Normalized [0,1]
                        'z': lm.z,  # Depth (relative)
                        'visibility': visibility,
                        'x_px': int(lm.x * width),  # Pixel coordinates
                        'y_px': int(lm.y * height)
                    }
                else:
                    # Mark as low visibility
                    keypoints[name] = {
                        'x': lm.x,
                        'y': lm.y,
                        'z': lm.z,
                        'visibility': visibility,
                        'low_visibility': True
                    }
        
        return keypoints
    
    def _smooth_keypoints(self, keypoints_sequence: List[Dict]) -> List[Dict]:
        """
        Apply Savitzky-Golay smoothing to keypoint trajectories
        Reduces noise while preserving motion characteristics
        """
        if len(keypoints_sequence) < 7:
            logger.warning("⚠️ Too few frames for smoothing")
            return keypoints_sequence
        
        # Extract visible frames only
        visible_frames = [kp for kp in keypoints_sequence if kp.get('visible', True)]
        
        if len(visible_frames) < 7:
            return keypoints_sequence
        
        # Smooth each landmark coordinate
        smoothed_sequence = []
        
        for landmark_name in self.CRITICAL_LANDMARKS:
            # Extract trajectories
            x_coords = []
            y_coords = []
            z_coords = []
            valid_indices = []
            
            for i, kp in enumerate(visible_frames):
                if landmark_name in kp and 'low_visibility' not in kp[landmark_name]:
                    lm = kp[landmark_name]
                    x_coords.append(lm['x'])
                    y_coords.append(lm['y'])
                    z_coords.append(lm['z'])
                    valid_indices.append(i)
            
            if len(x_coords) >= 7:
                # Apply Savitzky-Golay filter (window=7, polynomial=3)
                window = min(7, len(x_coords) if len(x_coords) % 2 == 1 else len(x_coords) - 1)
                if window >= 5:
                    try:
                        x_smooth = savgol_filter(x_coords, window, 3)
                        y_smooth = savgol_filter(y_coords, window, 3)
                        z_smooth = savgol_filter(z_coords, window, 3)
                        
                        # Update coordinates
                        for j, idx in enumerate(valid_indices):
                            if landmark_name in visible_frames[idx]:
                                visible_frames[idx][landmark_name]['x'] = float(x_smooth[j])
                                visible_frames[idx][landmark_name]['y'] = float(y_smooth[j])
                                visible_frames[idx][landmark_name]['z'] = float(z_smooth[j])
                    except Exception as e:
                        logger.warning(f"⚠️ Smoothing failed for {landmark_name}: {e}")
        
        return visible_frames
    
    def _normalize_keypoints(self, keypoints_sequence: List[Dict]) -> List[Dict]:
        """
        Normalize coordinates to person-centric frame
        Origin: mid-hip
        Scale: hip-to-shoulder distance or body height
        """
        normalized_sequence = []
        
        for kp in keypoints_sequence:
            if not kp.get('visible', True):
                normalized_sequence.append(kp)
                continue
            
            # Calculate mid-hip as origin
            if 'left_hip' in kp and 'right_hip' in kp:
                left_hip = kp['left_hip']
                right_hip = kp['right_hip']
                
                if 'low_visibility' not in left_hip and 'low_visibility' not in right_hip:
                    mid_hip_x = (left_hip['x'] + right_hip['x']) / 2
                    mid_hip_y = (left_hip['y'] + right_hip['y']) / 2
                    
                    # Calculate body scale (hip to shoulder distance)
                    if 'left_shoulder' in kp and 'right_shoulder' in kp:
                        left_shoulder = kp['left_shoulder']
                        right_shoulder = kp['right_shoulder']
                        
                        if 'low_visibility' not in left_shoulder and 'low_visibility' not in right_shoulder:
                            mid_shoulder_y = (left_shoulder['y'] + right_shoulder['y']) / 2
                            body_height = abs(mid_shoulder_y - mid_hip_y)
                            
                            if body_height > 0.01:  # Avoid division by zero
                                # Normalize all landmarks
                                normalized_kp = kp.copy()
                                
                                for landmark_name in self.CRITICAL_LANDMARKS:
                                    if landmark_name in kp and 'low_visibility' not in kp[landmark_name]:
                                        lm = kp[landmark_name]
                                        normalized_kp[landmark_name] = {
                                            **lm,
                                            'x_norm': (lm['x'] - mid_hip_x) / body_height,
                                            'y_norm': (lm['y'] - mid_hip_y) / body_height,
                                            'z_norm': lm['z'] / body_height
                                        }
                                
                                normalized_kp['normalization'] = {
                                    'origin_x': mid_hip_x,
                                    'origin_y': mid_hip_y,
                                    'scale': body_height
                                }
                                
                                normalized_sequence.append(normalized_kp)
                                continue
            
            # If normalization fails, keep original
            normalized_sequence.append(kp)
        
        return normalized_sequence
    
    def __del__(self):
        """Clean up resources"""
        if hasattr(self, 'pose'):
            self.pose.close()
