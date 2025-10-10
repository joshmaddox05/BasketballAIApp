"""
Shot Metrics Calculator - Compute biomechanical metrics for shooting analysis
Metrics: Knee load, Hip-shoulder alignment, Elbow flare, Release angle,
         Base width, Lateral sway, Arc trajectory
"""
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from scipy.spatial.distance import euclidean
import logging

logger = logging.getLogger(__name__)

class MetricsCalculator:
    """Calculate shooting form metrics from pose keypoints and phases"""
    
    def __init__(self):
        logger.info("✅ MetricsCalculator initialized")
    
    def calculate_all_metrics(
        self, 
        keypoints_sequence: List[Dict],
        phases: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate all shooting metrics
        
        Returns:
            Dictionary with all computed metrics
        """
        if not phases.get('valid', False):
            return {
                'error': 'Invalid phases - cannot calculate metrics',
                'confidence': 0.0
            }
        
        metrics = {}
        
        # Get keyframes
        load_frame = self._get_keyframe(keypoints_sequence, phases['load'])
        release_frame = self._get_keyframe(keypoints_sequence, phases['release'])
        set_point_frame = self._get_set_point_frame(keypoints_sequence, phases)
        
        if not all([load_frame, release_frame]):
            return {
                'error': 'Missing key frames',
                'confidence': 0.0
            }
        
        # Calculate each metric
        metrics['knee_load'] = self._calculate_knee_load(load_frame)
        metrics['hip_shoulder_alignment'] = self._calculate_hip_shoulder_alignment(set_point_frame or load_frame)
        metrics['elbow_flare'] = self._calculate_elbow_flare(set_point_frame or load_frame)
        metrics['release_angle'] = self._calculate_release_angle(release_frame)
        metrics['base_width'] = self._calculate_base_width(keypoints_sequence)
        metrics['lateral_sway'] = self._calculate_lateral_sway(keypoints_sequence, phases)
        metrics['arc_trajectory'] = self._calculate_arc_trajectory(keypoints_sequence, phases)
        metrics['timing'] = phases.get('timing', {})
        
        # Overall quality score
        metrics['overall_score'] = self._calculate_overall_score(metrics)
        metrics['confidence'] = phases.get('confidence', 0.8)
        
        logger.info(f"📊 Calculated metrics: score={metrics['overall_score']:.1f}")
        return metrics
    
    def _get_keyframe(self, keypoints_sequence: List[Dict], phase_point: Optional[Dict]) -> Optional[Dict]:
        """Get the keyframe corresponding to a phase point"""
        if not phase_point:
            return None
        
        for kp in keypoints_sequence:
            if kp.get('frame') == phase_point.get('frame'):
                return kp
        
        return None
    
    def _get_set_point_frame(self, keypoints_sequence: List[Dict], phases: Dict) -> Optional[Dict]:
        """
        Get set point frame (midpoint between load and release)
        This is where most form metrics are evaluated
        """
        if not phases.get('load') or not phases.get('release'):
            return None
        
        load_timestamp = phases['load']['timestamp']
        release_timestamp = phases['release']['timestamp']
        set_point_timestamp = (load_timestamp + release_timestamp) / 2
        
        # Find closest frame
        closest_frame = min(
            [kp for kp in keypoints_sequence if kp.get('visible', True)],
            key=lambda kp: abs(kp['timestamp'] - set_point_timestamp),
            default=None
        )
        
        return closest_frame
    
    def _calculate_knee_load(self, load_frame: Dict) -> Dict[str, Any]:
        """
        Calculate knee angle at load point
        Optimal range: 70-90 degrees
        """
        # Try right knee first
        if all(k in load_frame for k in ['right_hip', 'right_knee', 'right_ankle']):
            hip = load_frame['right_hip']
            knee = load_frame['right_knee']
            ankle = load_frame['right_ankle']
            
            if all('low_visibility' not in p for p in [hip, knee, ankle]):
                angle = self._calculate_angle(
                    (hip['x'], hip['y']),
                    (knee['x'], knee['y']),
                    (ankle['x'], ankle['y'])
                )
                
                return {
                    'angle_deg': float(angle),
                    'optimal_range': [70, 90],
                    'in_range': 70 <= angle <= 90,
                    'quality_score': self._score_in_range(angle, 70, 90, 80),
                    'limb': 'right'
                }
        
        # Fallback to left knee
        if all(k in load_frame for k in ['left_hip', 'left_knee', 'left_ankle']):
            hip = load_frame['left_hip']
            knee = load_frame['left_knee']
            ankle = load_frame['left_ankle']
            
            if all('low_visibility' not in p for p in [hip, knee, ankle]):
                angle = self._calculate_angle(
                    (hip['x'], hip['y']),
                    (knee['x'], knee['y']),
                    (ankle['x'], ankle['y'])
                )
                
                return {
                    'angle_deg': float(angle),
                    'optimal_range': [70, 90],
                    'in_range': 70 <= angle <= 90,
                    'quality_score': self._score_in_range(angle, 70, 90, 80),
                    'limb': 'left'
                }
        
        return {
            'error': 'Cannot calculate knee load',
            'quality_score': 0.0
        }
    
    def _calculate_hip_shoulder_alignment(self, frame: Dict) -> Dict[str, Any]:
        """
        Calculate angle between hip line and shoulder line at set point
        Optimal: Small angle (< 15 degrees) indicates good alignment
        """
        if not all(k in frame for k in ['left_hip', 'right_hip', 'left_shoulder', 'right_shoulder']):
            return {'error': 'Missing landmarks', 'quality_score': 0.0}
        
        left_hip = frame['left_hip']
        right_hip = frame['right_hip']
        left_shoulder = frame['left_shoulder']
        right_shoulder = frame['right_shoulder']
        
        if any('low_visibility' in p for p in [left_hip, right_hip, left_shoulder, right_shoulder]):
            return {'error': 'Low visibility', 'quality_score': 0.0}
        
        # Calculate line angles
        hip_angle = np.degrees(np.arctan2(
            right_hip['y'] - left_hip['y'],
            right_hip['x'] - left_hip['x']
        ))
        
        shoulder_angle = np.degrees(np.arctan2(
            right_shoulder['y'] - left_shoulder['y'],
            right_shoulder['x'] - left_shoulder['x']
        ))
        
        alignment_angle = abs(hip_angle - shoulder_angle)
        
        # Normalize to [0, 180]
        if alignment_angle > 180:
            alignment_angle = 360 - alignment_angle
        
        return {
            'angle_deg': float(alignment_angle),
            'optimal_range': [0, 15],
            'in_range': alignment_angle <= 15,
            'quality_score': self._score_in_range(alignment_angle, 0, 15, 5, inverse=True),
            'description': 'Good alignment' if alignment_angle <= 15 else 'Misaligned'
        }
    
    def _calculate_elbow_flare(self, frame: Dict) -> Dict[str, Any]:
        """
        Calculate elbow flare at set point
        Angle between upper arm vector and torso plane
        Optimal: 0-10 degrees (elbow directly under ball)
        """
        # Try right arm first (shooting arm for right-handed)
        if all(k in frame for k in ['right_shoulder', 'right_elbow', 'right_hip', 'left_hip']):
            shoulder = frame['right_shoulder']
            elbow = frame['right_elbow']
            right_hip = frame['right_hip']
            left_hip = frame['left_hip']
            
            if all('low_visibility' not in p for p in [shoulder, elbow, right_hip, left_hip]):
                # Calculate torso centerline (vertical through mid-hip)
                mid_hip_x = (left_hip['x'] + right_hip['x']) / 2
                
                # Calculate elbow offset from shoulder-to-hip vertical line
                shoulder_to_elbow_x = elbow['x'] - shoulder['x']
                shoulder_to_midhip_x = mid_hip_x - shoulder['x']
                
                # Flare is the horizontal deviation
                flare_ratio = abs(shoulder_to_elbow_x - shoulder_to_midhip_x)
                
                # Convert to approximate degrees
                flare_angle = np.degrees(np.arctan(flare_ratio / (abs(elbow['y'] - shoulder['y']) + 0.01)))
                
                return {
                    'angle_deg': float(flare_angle),
                    'optimal_range': [0, 10],
                    'in_range': flare_angle <= 10,
                    'quality_score': self._score_in_range(flare_angle, 0, 10, 3, inverse=True),
                    'limb': 'right',
                    'description': 'Good tuck' if flare_angle <= 10 else 'Elbow flaring out'
                }
        
        # Fallback to left arm
        if all(k in frame for k in ['left_shoulder', 'left_elbow', 'right_hip', 'left_hip']):
            shoulder = frame['left_shoulder']
            elbow = frame['left_elbow']
            right_hip = frame['right_hip']
            left_hip = frame['left_hip']
            
            if all('low_visibility' not in p for p in [shoulder, elbow, right_hip, left_hip]):
                mid_hip_x = (left_hip['x'] + right_hip['x']) / 2
                shoulder_to_elbow_x = elbow['x'] - shoulder['x']
                shoulder_to_midhip_x = mid_hip_x - shoulder['x']
                flare_ratio = abs(shoulder_to_elbow_x - shoulder_to_midhip_x)
                flare_angle = np.degrees(np.arctan(flare_ratio / (abs(elbow['y'] - shoulder['y']) + 0.01)))
                
                return {
                    'angle_deg': float(flare_angle),
                    'optimal_range': [0, 10],
                    'in_range': flare_angle <= 10,
                    'quality_score': self._score_in_range(flare_angle, 0, 10, 3, inverse=True),
                    'limb': 'left'
                }
        
        return {'error': 'Cannot calculate elbow flare', 'quality_score': 0.0}
    
    def _calculate_release_angle(self, release_frame: Dict) -> Dict[str, Any]:
        """
        Calculate release angle (forearm relative to vertical + shoulder flexion)
        Optimal: 55-62 degrees for high-arc shots
        """
        # Try right arm
        if all(k in release_frame for k in ['right_shoulder', 'right_elbow', 'right_wrist']):
            shoulder = release_frame['right_shoulder']
            elbow = release_frame['right_elbow']
            wrist = release_frame['right_wrist']
            
            if all('low_visibility' not in p for p in [shoulder, elbow, wrist]):
                # Calculate forearm angle from vertical
                forearm_vector = np.array([wrist['x'] - elbow['x'], wrist['y'] - elbow['y']])
                vertical_vector = np.array([0, -1])  # Upward
                
                cos_angle = np.dot(forearm_vector, vertical_vector) / (
                    np.linalg.norm(forearm_vector) * np.linalg.norm(vertical_vector) + 1e-6
                )
                cos_angle = np.clip(cos_angle, -1.0, 1.0)
                angle_from_vertical = np.degrees(np.arccos(cos_angle))
                
                # Add shoulder flexion component
                upper_arm_vector = np.array([elbow['x'] - shoulder['x'], elbow['y'] - shoulder['y']])
                shoulder_flexion = np.degrees(np.arccos(
                    np.dot(upper_arm_vector, vertical_vector) / 
                    (np.linalg.norm(upper_arm_vector) * np.linalg.norm(vertical_vector) + 1e-6)
                ))
                
                # Combined release angle
                release_angle = (angle_from_vertical + shoulder_flexion) / 2
                
                return {
                    'angle_deg': float(release_angle),
                    'forearm_angle': float(angle_from_vertical),
                    'shoulder_flexion': float(shoulder_flexion),
                    'optimal_range': [55, 62],
                    'in_range': 55 <= release_angle <= 62,
                    'quality_score': self._score_in_range(release_angle, 55, 62, 58.5),
                    'limb': 'right'
                }
        
        # Fallback to left arm
        if all(k in release_frame for k in ['left_shoulder', 'left_elbow', 'left_wrist']):
            shoulder = release_frame['left_shoulder']
            elbow = release_frame['left_elbow']
            wrist = release_frame['left_wrist']
            
            if all('low_visibility' not in p for p in [shoulder, elbow, wrist]):
                forearm_vector = np.array([wrist['x'] - elbow['x'], wrist['y'] - elbow['y']])
                vertical_vector = np.array([0, -1])
                
                cos_angle = np.dot(forearm_vector, vertical_vector) / (
                    np.linalg.norm(forearm_vector) + 1e-6
                )
                angle_from_vertical = np.degrees(np.arccos(np.clip(cos_angle, -1.0, 1.0)))
                
                return {
                    'angle_deg': float(angle_from_vertical),
                    'optimal_range': [55, 62],
                    'in_range': 55 <= angle_from_vertical <= 62,
                    'quality_score': self._score_in_range(angle_from_vertical, 55, 62, 58.5),
                    'limb': 'left'
                }
        
        return {'error': 'Cannot calculate release angle', 'quality_score': 0.0}
    
    def _calculate_base_width(self, keypoints_sequence: List[Dict]) -> Dict[str, Any]:
        """
        Calculate average base width (ankle distance / body height)
        Optimal: 0.15-0.25 (shoulder-width stance)
        """
        ratios = []
        
        for kp in keypoints_sequence:
            if not kp.get('visible', True):
                continue
            
            if all(k in kp for k in ['left_ankle', 'right_ankle', 'left_shoulder', 'left_hip']):
                left_ankle = kp['left_ankle']
                right_ankle = kp['right_ankle']
                left_shoulder = kp['left_shoulder']
                left_hip = kp['left_hip']
                
                if all('low_visibility' not in p for p in [left_ankle, right_ankle, left_shoulder, left_hip]):
                    # Calculate ankle distance
                    ankle_distance = euclidean(
                        (left_ankle['x'], left_ankle['y']),
                        (right_ankle['x'], right_ankle['y'])
                    )
                    
                    # Calculate body height (shoulder to ankle)
                    body_height = abs(left_shoulder['y'] - left_ankle['y'])
                    
                    if body_height > 0.01:
                        ratios.append(ankle_distance / body_height)
        
        if not ratios:
            return {'error': 'Cannot calculate base width', 'quality_score': 0.0}
        
        avg_ratio = np.mean(ratios)
        
        return {
            'ratio': float(avg_ratio),
            'optimal_range': [0.15, 0.25],
            'in_range': 0.15 <= avg_ratio <= 0.25,
            'quality_score': self._score_in_range(avg_ratio, 0.15, 0.25, 0.20),
            'description': 'Good stance width' if 0.15 <= avg_ratio <= 0.25 else 
                          'Too narrow' if avg_ratio < 0.15 else 'Too wide'
        }
    
    def _calculate_lateral_sway(
        self, 
        keypoints_sequence: List[Dict],
        phases: Dict
    ) -> Dict[str, Any]:
        """
        Calculate lateral sway (COM x-displacement between load and release)
        Scaled by body height. Optimal: < 0.05 (minimal lateral movement)
        """
        if not phases.get('load') or not phases.get('release'):
            return {'error': 'Missing phases', 'quality_score': 0.0}
        
        load_frame = self._get_keyframe(keypoints_sequence, phases['load'])
        release_frame = self._get_keyframe(keypoints_sequence, phases['release'])
        
        if not all([load_frame, release_frame]):
            return {'error': 'Missing frames', 'quality_score': 0.0}
        
        # Calculate center of mass (approximate as mid-hip)
        load_com_x = self._get_com_x(load_frame)
        release_com_x = self._get_com_x(release_frame)
        
        if load_com_x is None or release_com_x is None:
            return {'error': 'Cannot calculate COM', 'quality_score': 0.0}
        
        # Get body height for scaling
        body_height = self._get_body_height(load_frame)
        if body_height is None or body_height < 0.01:
            return {'error': 'Cannot determine body height', 'quality_score': 0.0}
        
        lateral_sway = abs(release_com_x - load_com_x) / body_height
        
        return {
            'sway_ratio': float(lateral_sway),
            'optimal_range': [0, 0.05],
            'in_range': lateral_sway <= 0.05,
            'quality_score': self._score_in_range(lateral_sway, 0, 0.05, 0.02, inverse=True),
            'description': 'Stable' if lateral_sway <= 0.05 else 'Excessive sway'
        }
    
    def _calculate_arc_trajectory(
        self,
        keypoints_sequence: List[Dict],
        phases: Dict
    ) -> Dict[str, Any]:
        """
        Calculate shot arc from wrist trajectory
        Optimal: 45-55 degrees
        """
        if not phases.get('release') or not phases.get('follow_through_end'):
            return {'error': 'Missing phases', 'quality_score': 0.0}
        
        # Extract wrist trajectory from release to follow-through
        release_idx = next((i for i, kp in enumerate(keypoints_sequence) 
                          if kp.get('frame') == phases['release']['frame']), None)
        
        if release_idx is None:
            return {'error': 'Cannot find release frame', 'quality_score': 0.0}
        
        wrist_trajectory = []
        
        for kp in keypoints_sequence[release_idx:]:
            if not kp.get('visible', True):
                continue
            
            wrist = kp.get('right_wrist') or kp.get('left_wrist')
            if wrist and 'low_visibility' not in wrist:
                wrist_trajectory.append((wrist['x'], wrist['y']))
            
            # Stop at follow-through end
            if kp.get('frame') == phases.get('follow_through_end', {}).get('frame'):
                break
        
        if len(wrist_trajectory) < 3:
            return {'error': 'Insufficient trajectory points', 'quality_score': 0.0}
        
        # Fit parabola to trajectory and calculate arc angle
        y_values = [p[1] for p in wrist_trajectory]
        x_values = [p[0] for p in wrist_trajectory]
        
        # Calculate initial trajectory angle
        if len(wrist_trajectory) >= 2:
            dx = wrist_trajectory[1][0] - wrist_trajectory[0][0]
            dy = wrist_trajectory[1][1] - wrist_trajectory[0][1]
            
            arc_angle = abs(np.degrees(np.arctan2(-dy, dx)))  # Negative dy for upward
            
            return {
                'arc_angle_deg': float(arc_angle),
                'optimal_range': [45, 55],
                'in_range': 45 <= arc_angle <= 55,
                'quality_score': self._score_in_range(arc_angle, 45, 55, 50),
                'trajectory_points': len(wrist_trajectory)
            }
        
        return {'error': 'Cannot calculate arc', 'quality_score': 0.0}
    
    def _get_com_x(self, frame: Dict) -> Optional[float]:
        """Get center of mass x-coordinate (approximate as mid-hip)"""
        if all(k in frame for k in ['left_hip', 'right_hip']):
            left_hip = frame['left_hip']
            right_hip = frame['right_hip']
            
            if all('low_visibility' not in p for p in [left_hip, right_hip]):
                return (left_hip['x'] + right_hip['x']) / 2
        
        return None
    
    def _get_body_height(self, frame: Dict) -> Optional[float]:
        """Get body height (shoulder to ankle distance)"""
        if all(k in frame for k in ['left_shoulder', 'left_ankle']):
            shoulder = frame['left_shoulder']
            ankle = frame['left_ankle']
            
            if all('low_visibility' not in p for p in [shoulder, ankle]):
                return abs(shoulder['y'] - ankle['y'])
        
        return None
    
    def _calculate_angle(self, p1: Tuple[float, float], p2: Tuple[float, float], p3: Tuple[float, float]) -> float:
        """Calculate angle at p2 formed by p1-p2-p3"""
        v1 = np.array([p1[0] - p2[0], p1[1] - p2[1]])
        v2 = np.array([p3[0] - p2[0], p3[1] - p2[1]])
        
        cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
        cos_angle = np.clip(cos_angle, -1.0, 1.0)
        angle = np.degrees(np.arccos(cos_angle))
        
        return float(angle)
    
    def _score_in_range(
        self, 
        value: float, 
        min_val: float, 
        max_val: float, 
        optimal: float,
        inverse: bool = False
    ) -> float:
        """
        Score a value based on how close it is to optimal range
        Returns 0-10 score
        """
        if min_val <= value <= max_val:
            # Within range - score based on distance from optimal
            distance_from_optimal = abs(value - optimal)
            range_size = max_val - min_val
            score = 10.0 * (1.0 - distance_from_optimal / (range_size / 2))
            return max(7.0, min(10.0, score))  # 7-10 when in range
        else:
            # Outside range - penalize based on distance
            if value < min_val:
                distance = min_val - value
            else:
                distance = value - max_val
            
            range_size = max_val - min_val
            penalty = distance / range_size
            score = max(0.0, 7.0 - penalty * 7.0)
            
            if inverse:
                score = 10.0 - score
            
            return score
    
    def _calculate_overall_score(self, metrics: Dict[str, Any]) -> float:
        """
        Calculate overall form score (0-100) from individual metrics
        Weighted average of quality scores
        """
        weights = {
            'release_angle': 0.25,
            'elbow_flare': 0.20,
            'knee_load': 0.15,
            'hip_shoulder_alignment': 0.15,
            'base_width': 0.10,
            'lateral_sway': 0.10,
            'arc_trajectory': 0.05
        }
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for metric_name, weight in weights.items():
            if metric_name in metrics:
                metric_data = metrics[metric_name]
                if isinstance(metric_data, dict) and 'quality_score' in metric_data:
                    score = metric_data['quality_score']
                    if not isinstance(score, str):  # Skip error messages
                        weighted_sum += score * weight
                        total_weight += weight
        
        if total_weight > 0:
            return (weighted_sum / total_weight) * 10  # Convert to 0-100 scale
        
        return 0.0
