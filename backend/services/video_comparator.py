"""
Video Comparator - Generate side-by-side comparison videos with pose overlays
Uses OpenCV to create visual feedback showing user vs baseline with skeleton annotations
"""
import cv2
import numpy as np
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class VideoComparator:
    """Generate comparison videos with pose skeleton overlays"""
    
    # MediaPipe Pose connections using LANDMARK NAMES (not indices)
    POSE_CONNECTIONS = [
        # Torso
        ('left_shoulder', 'right_shoulder'),
        ('left_shoulder', 'left_hip'),
        ('right_shoulder', 'right_hip'),
        ('left_hip', 'right_hip'),
        # Right arm
        ('right_shoulder', 'right_elbow'),
        ('right_elbow', 'right_wrist'),
        # Left arm
        ('left_shoulder', 'left_elbow'),
        ('left_elbow', 'left_wrist'),
        # Right leg
        ('right_hip', 'right_knee'),
        ('right_knee', 'right_ankle'),
        # Left leg
        ('left_hip', 'left_knee'),
        ('left_knee', 'left_ankle'),
    ]
    
    # Colors (BGR format for OpenCV)
    COLORS = {
        'user': (0, 255, 0),           # Green
        'baseline': (255, 255, 0),     # Cyan
        'phase_marker': (255, 0, 255), # Magenta
    }
    
    def __init__(self, output_dir: str = "output/comparisons"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"✅ VideoComparator initialized. Output: {self.output_dir}")
    
    def create_comparison_video(
        self,
        user_video_path: str,
        user_keypoints: List[Dict[str, Any]],
        user_phases: Dict[str, Any],
        baseline_video_path: Optional[str] = None,
        baseline_keypoints: Optional[List[Dict[str, Any]]] = None,
        baseline_phases: Optional[Dict[str, Any]] = None,
        output_filename: Optional[str] = None,
        mode: str = 'split'
    ) -> str:
        """
        Create comparison video with pose overlays
        
        Args:
            user_video_path: Path to user's video
            user_keypoints: User's pose keypoints per frame
            user_phases: User's detected shot phases
            baseline_video_path: Path to baseline video (optional)
            baseline_keypoints: Baseline pose keypoints (optional)
            baseline_phases: Baseline shot phases (optional)
            output_filename: Custom output filename
            mode: 'split', 'overlay', or 'ghost'
            
        Returns:
            Path to generated comparison video
        """
        logger.info(f"🎬 Creating comparison video in {mode} mode...")
        
        try:
            # Open user video
            cap = cv2.VideoCapture(user_video_path)
            if not cap.isOpened():
                raise ValueError(f"Cannot open video: {user_video_path}")
            
            # Get properties
            fps = int(cap.get(cv2.CAP_PROP_FPS))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            logger.info(f"📹 Video: {width}x{height} @ {fps}fps, {total_frames} frames")
            logger.info(f"📊 Keypoints: {len(user_keypoints)} frames")

            # Create frame mapping for proper synchronization
            # Map video frames to keypoint indices based on 'frame' field
            frame_to_keypoint_map = {}
            for kp_idx, kp in enumerate(user_keypoints):
                video_frame = kp.get('frame', kp_idx)
                frame_to_keypoint_map[video_frame] = kp_idx

            # Determine output dimensions
            if mode == 'split' and baseline_video_path:
                out_width = width * 2 + 20
                out_height = height + 80
            else:
                out_width = width
                out_height = height + 80
            
            # Setup output
            if output_filename is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_filename = f"comparison_{mode}_{timestamp}.mp4"
            
            output_path = self.output_dir / output_filename
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(str(output_path), fourcc, fps, (out_width, out_height))
            
            # Process frames
            video_frame_idx = 0
            processed_count = 0

            while video_frame_idx < total_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Find corresponding keypoint index
                kp_idx = frame_to_keypoint_map.get(video_frame_idx)

                if kp_idx is not None:
                    # Create output frame with synchronized keypoints
                    if mode == 'split' and baseline_video_path:
                        output_frame = self._create_split_frame(
                            frame, kp_idx, user_keypoints, width, height
                        )
                    else:
                        output_frame = self._create_overlay_frame(
                            frame, kp_idx, user_keypoints, baseline_keypoints
                        )

                    # Add labels
                    output_frame = self._add_labels(output_frame, kp_idx, user_phases, mode)
                else:
                    # No keypoints for this frame - just show the frame
                    output_frame = np.zeros((height + 80, out_width, 3), dtype=np.uint8)
                    output_frame[40:40+height, :width] = frame

                # Resize and write
                if output_frame.shape[:2] != (out_height, out_width):
                    output_frame = cv2.resize(output_frame, (out_width, out_height))
                out.write(output_frame)
                
                video_frame_idx += 1
                processed_count += 1

                if processed_count % 30 == 0:
                    logger.info(f"⏳ Processed {processed_count}/{total_frames} frames")

            cap.release()
            out.release()
            
            logger.info(f"✅ Comparison video created: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"❌ Video comparison failed: {e}", exc_info=True)
            raise
    
    def _create_split_frame(
        self, frame: np.ndarray, frame_idx: int,
        keypoints: List[Dict], width: int, height: int
    ) -> np.ndarray:
        """Create side-by-side frame"""
        canvas = np.zeros((height + 80, width * 2 + 20, 3), dtype=np.uint8)
        
        # Draw user frame with skeleton
        annotated = self._draw_skeleton(frame.copy(), keypoints, frame_idx, 'user')
        canvas[40:40+height, 10:10+width] = annotated
        
        # Placeholder for baseline (can be enhanced later)
        placeholder = np.zeros((height, width, 3), dtype=np.uint8)
        cv2.putText(placeholder, "BASELINE", (width//2-50, height//2),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        canvas[40:40+height, width+10:width*2+10] = placeholder
        
        return canvas
    
    def _create_overlay_frame(
        self, frame: np.ndarray, frame_idx: int,
        user_keypoints: List[Dict],
        baseline_keypoints: Optional[List[Dict]]
    ) -> np.ndarray:
        """Create overlay frame"""
        canvas = np.zeros((frame.shape[0] + 80, frame.shape[1], 3), dtype=np.uint8)
        
        # Draw user skeleton
        annotated = self._draw_skeleton(frame.copy(), user_keypoints, frame_idx, 'user', rotation=0)
        
        # Draw baseline skeleton if available
        if baseline_keypoints and frame_idx < len(baseline_keypoints):
            annotated = self._draw_skeleton(annotated, baseline_keypoints, frame_idx, 'baseline', alpha=0.5, rotation=0)
        
        canvas[40:40+frame.shape[0], :] = annotated
        return canvas
    
    def _draw_skeleton(
        self, frame: np.ndarray, keypoints: List[Dict],
        frame_idx: int, skeleton_type: str, alpha: float = 1.0,
        rotation: int = 0
    ) -> np.ndarray:
        """Draw pose skeleton on frame using landmark NAMES for accurate positioning"""
        if frame_idx >= len(keypoints):
            return frame
        
        kp = keypoints[frame_idx]
        h, w = frame.shape[:2]
        color = self.COLORS.get(skeleton_type, (255, 255, 255))

        # Create overlay for transparency
        overlay = frame.copy()
        
        # Helper for rotation-aware normalized → pixel transform
        def _rot_xy(xn: float, yn: float, rot: int) -> tuple:
            r = rot % 360
            if r == 90:
                return yn, 1.0 - xn
            if r == 180:
                return 1.0 - xn, 1.0 - yn
            if r == 270:
                return 1.0 - yn, xn
            return xn, yn

        # Draw connections using LANDMARK NAMES (not indices)
        for start_name, end_name in self.POSE_CONNECTIONS:
            # Check if both landmarks exist in this frame
            if start_name not in kp or end_name not in kp:
                continue
            
            start_point = kp[start_name]
            end_point = kp[end_name]
            
            # Skip if either point is not a dict (could be metadata)
            if not isinstance(start_point, dict) or not isinstance(end_point, dict):
                continue

            # Check visibility threshold
            if start_point.get('visibility', 0) < 0.5 or end_point.get('visibility', 0) < 0.5:
                continue
            
            # Convert normalized coordinates to pixel coordinates (rotation-aware)
            sxn, syn = _rot_xy(float(start_point['x']), float(start_point['y']), rotation)
            exn, eyn = _rot_xy(float(end_point['x']), float(end_point['y']), rotation)
            sx = int(sxn * w)
            sy = int(syn * h)
            ex = int(exn * w)
            ey = int(eyn * h)
            
            # Validate coordinates are within frame bounds
            if not (0 <= sx < w and 0 <= sy < h and 0 <= ex < w and 0 <= ey < h):
                continue

            # Draw connection line
            cv2.line(overlay, (sx, sy), (ex, ey), color, 3, cv2.LINE_AA)

        # Draw joints (keypoints)
        for landmark_name, landmark in kp.items():
            # Skip metadata fields
            if landmark_name in ['frame', 'timestamp'] or not isinstance(landmark, dict):
                continue

            # Check visibility
            if landmark.get('visibility', 0) < 0.5:
                continue

            # Convert to pixel coordinates (rotation-aware)
            xn, yn = _rot_xy(float(landmark['x']), float(landmark['y']), rotation)
            x = int(xn * w)
            y = int(yn * h)

            # Validate coordinates
            if not (0 <= x < w and 0 <= y < h):
                continue

            # Draw joint as circle
            cv2.circle(overlay, (x, y), 5, color, -1, cv2.LINE_AA)
            cv2.circle(overlay, (x, y), 6, (0, 0, 0), 1, cv2.LINE_AA)  # Black outline

        # Blend for transparency
        if alpha < 1.0:
            frame = cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0)
        else:
            frame = overlay
        
        return frame
    
    def _add_labels(
        self, frame: np.ndarray, frame_idx: int,
        phases: Dict[str, Any], mode: str
    ) -> np.ndarray:
        """Add labels and phase markers"""
        # Add title
        cv2.putText(frame, f"SHOT ANALYSIS - {mode.upper()}", (10, 25),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Add phase marker if at key frame
        if phases:
            phase_labels = {
                'dip_start': 'DIP',
                'load': 'LOAD', 
                'release': 'RELEASE',
                'follow_through_end': 'FOLLOW'
            }
            
            for phase_name, label in phase_labels.items():
                if phase_name in phases and 'frame' in phases[phase_name]:
                    phase_frame = phases[phase_name]['frame']
                    if abs(frame_idx - phase_frame) < 3:
                        cv2.putText(frame, f">> {label}", (frame.shape[1] - 150, 25),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                                   self.COLORS['phase_marker'], 2)
        
        return frame
    
    def create_skeleton_json(
        self, keypoints_sequence: List[Dict[str, Any]],
        phases: Dict[str, Any], fps: int, output_filename: str
    ) -> str:
        """Export keypoints as JSON for mobile rendering"""
        output_path = self.output_dir / output_filename
        
        export_data = {
            'fps': fps,
            'phases': phases,
            'frames': []
        }
        
        for frame_idx, keypoints in enumerate(keypoints_sequence):
            frame_data = {
                't': frame_idx / fps,
                'frame': frame_idx,
                'points': {}
            }
            
            for landmark_name, landmark in keypoints.items():
                frame_data['points'][landmark_name] = {
                    'x': round(landmark['x'], 4),
                    'y': round(landmark['y'], 4),
                    'v': round(landmark.get('visibility', 0), 2)
                }
            
            export_data['frames'].append(frame_data)
        
        with open(output_path, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        logger.info(f"✅ Skeleton JSON exported: {output_path}")
        return str(output_path)
