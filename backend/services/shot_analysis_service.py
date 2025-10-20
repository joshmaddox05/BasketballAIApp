"""
Comprehensive Shot Analysis Service
Integrates pose processing, phase detection, and metrics calculation for pure form analysis
"""
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging

from .pose_processor import PoseProcessor
from .phase_detector import PhaseDetector
from .metrics_calculator import MetricsCalculator

logger = logging.getLogger(__name__)

class ShotAnalysisService:
    """Complete shot analysis pipeline for pure form assessment"""
    
    def __init__(self):
        self.pose_processor = PoseProcessor(model_complexity=1)
        self.phase_detector = PhaseDetector()
        self.metrics_calculator = MetricsCalculator()
        
        logger.info(f"✅ ShotAnalysisService initialized for pure form analysis")
    
    def analyze_shot(
        self, 
        video_path: str,
        frame_skip: int = 1
    ) -> Dict[str, Any]:
        """
        Complete shot analysis pipeline for pure form assessment
        
        Args:
            video_path: Path to video file
            frame_skip: Process every Nth frame
            
        Returns:
            Comprehensive analysis results with technique scoring
        """
        logger.info(f"🏀 Starting form analysis for: {video_path}")
        
        try:
            # Step 1: Extract pose keypoints
            pose_data = self.pose_processor.process_video(video_path, frame_skip=frame_skip)
            
            if pose_data['quality']['confidence'] < 0.5:
                return {
                    'success': False,
                    'error': 'Low video quality or visibility',
                    'warning': pose_data['quality'].get('warning'),
                    'confidence': pose_data['quality']['confidence']
                }
            
            # Step 2: Detect shooting phases
            phases = self.phase_detector.detect_phases(pose_data['keypoints_sequence'])
            
            if not phases.get('valid', False):
                return {
                    'success': False,
                    'error': 'Could not detect shot phases',
                    'phases': phases,
                    'confidence': phases.get('confidence', 0.0)
                }
            
            # Step 3: Calculate metrics with optimal ranges
            metrics = self.metrics_calculator.calculate_all_metrics(
                pose_data['keypoints_sequence'],
                phases
            )
            
            if 'error' in metrics:
                return {
                    'success': False,
                    'error': metrics['error'],
                    'confidence': metrics.get('confidence', 0.0)
                }
            
            # Step 4: Generate coaching cues based on technique
            coaching_cues = self._generate_coaching_cues(metrics)
            
            # Compile final results
            results = {
                'success': True,
                'analysis_mode': 'form_analysis',
                'overall_score': metrics['overall_score'],
                'confidence': min(pose_data['quality']['confidence'], phases['confidence']),
                'phases': {
                    'dip_start': phases['dip_start'],
                    'load': phases['load'],
                    'release': phases['release'],
                    'follow_through_end': phases['follow_through_end'],
                    'timing': phases.get('timing', {})
                },
                'metrics': metrics,
                'coaching_cues': coaching_cues,
                'quality_info': pose_data['quality'],
                'metadata': pose_data['metadata']
            }
            
            logger.info(f"✅ Form analysis complete! Score: {metrics['overall_score']:.1f}/100")
            return results
            
        except Exception as e:
            logger.error(f"❌ Analysis failed: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'confidence': 0.0
            }
    
    
    def _generate_coaching_cues(
        self,
        metrics: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """
        Generate top 3 coaching cues based on technique metrics
        Ranked by (distance from optimal) × (metric weight)
        """
        cues = []
        
        # Define coaching rules
        rules = self._get_coaching_rules()
        
        # Evaluate each rule
        for rule in rules:
            metric_name = rule['metric']
            if metric_name not in metrics:
                continue
            
            metric_data = metrics[metric_name]
            if isinstance(metric_data, dict) and 'quality_score' not in metric_data:
                continue
            
            # Check condition
            if self._evaluate_condition(metric_data, rule['condition']):
                priority = (10.0 - metric_data.get('quality_score', 5.0)) * rule['weight']
                
                cues.append({
                    'cue': rule['cue'],
                    'why': rule['why'],
                    'drill_id': rule.get('drill_id', ''),
                    'priority': priority,
                    'metric': metric_name
                })
        
        # Sort by priority and return top 3
        cues.sort(key=lambda x: x['priority'], reverse=True)
        return cues[:3]
    
    def _get_coaching_rules(self) -> List[Dict[str, Any]]:
        """Define coaching rules for each metric"""
        return [
            {
                'metric': 'elbow_flare',
                'condition': 'angle_deg > 12',
                'cue': 'Tuck your elbow; keep forearm aligned under the ball.',
                'why': 'Reduces side-spin and left/right misses.',
                'drill_id': 'wall-elbow-slides',
                'weight': 0.25
            },
            {
                'metric': 'release_angle',
                'condition': 'angle_deg < 55 or angle_deg > 62',
                'cue': 'Adjust your release angle to 55-62 degrees for optimal arc.',
                'why': 'Higher arc gives better basket entry angle and room for error.',
                'drill_id': 'form-shooting',
                'weight': 0.25
            },
            {
                'metric': 'knee_load',
                'condition': 'angle_deg < 70 or angle_deg > 90',
                'cue': 'Maintain 70-90 degree knee bend at your load point.',
                'why': 'Optimal power generation and balance.',
                'drill_id': 'chair-shooting',
                'weight': 0.20
            },
            {
                'metric': 'hip_shoulder_alignment',
                'condition': 'angle_deg > 15',
                'cue': 'Square your shoulders and hips to the basket.',
                'why': 'Improves accuracy and power transfer.',
                'drill_id': 'balance-shooting',
                'weight': 0.15
            },
            {
                'metric': 'lateral_sway',
                'condition': 'sway_ratio > 0.05',
                'cue': 'Minimize lateral movement; shoot straight up and down.',
                'why': 'Reduces inconsistency and improves balance.',
                'drill_id': 'line-shooting',
                'weight': 0.15
            },
            {
                'metric': 'base_width',
                'condition': 'ratio < 0.15 or ratio > 0.25',
                'cue': 'Adjust your stance to shoulder-width for better balance.',
                'why': 'Optimal base provides stability and power.',
                'drill_id': 'stance-drills',
                'weight': 0.10
            },
            {
                'metric': 'arc_trajectory',
                'condition': 'arc_angle_deg < 45 or arc_angle_deg > 55',
                'cue': 'Focus on shooting with a 45-55 degree arc.',
                'why': 'Optimal arc maximizes basket entry angle.',
                'drill_id': 'arc-training',
                'weight': 0.10
            }
        ]
    
    def _evaluate_condition(self, metric_data: Dict[str, Any], condition: str) -> bool:
        """Evaluate a condition string against metric data"""
        try:
            # Extract variable name and comparison
            if '>' in condition:
                var, threshold = condition.split('>')
                var = var.strip()
                threshold = float(threshold.strip())
                return metric_data.get(var, 0) > threshold
            
            elif '<' in condition:
                var, threshold = condition.split('<')
                var = var.strip()
                threshold = float(threshold.strip())
                return metric_data.get(var, 0) < threshold
            
            elif 'or' in condition:
                # Handle compound conditions
                parts = condition.split('or')
                return any(self._evaluate_condition(metric_data, part.strip()) for part in parts)
            
            return False
        
        except Exception as e:
            logger.warning(f"⚠️ Failed to evaluate condition '{condition}': {e}")
            return False
    
