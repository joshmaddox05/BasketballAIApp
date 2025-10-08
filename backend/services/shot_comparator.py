"""
Shot Comparator - Compare user's shot with pro player baselines
"""
import numpy as np
from typing import Dict, List, Any
from .baseline_analyzer import BaselineAnalyzer
import logging

logger = logging.getLogger(__name__)

class ShotComparator:
    """Compare user's shot with pro player baselines"""
    
    def __init__(self):
        self.baseline_analyzer = BaselineAnalyzer()
    
    def compare_to_baseline(
        self,
        user_analysis: Dict[str, Any],
        baseline_player: str
    ) -> Dict[str, Any]:
        """
        Compare user's shooting form to a pro player baseline
        
        Args:
            user_analysis: Analysis results from user's video
            baseline_player: Name of pro player to compare against
            
        Returns:
            Detailed comparison results
        """
        logger.info(f"📊 Comparing to {baseline_player}'s form...")
        
        # Load baseline
        try:
            baseline = self.baseline_analyzer.load_baseline(baseline_player)
        except FileNotFoundError:
            return {
                'error': f'Baseline for {baseline_player} not found',
                'available_players': self.baseline_analyzer.list_available_baselines()
            }
        
        # Compare metrics
        comparison = {
            'baseline_player': baseline_player,
            'overall_similarity': 0.0,
            'metric_comparisons': {},
            'strengths': [],
            'areas_for_improvement': [],
            'specific_feedback': []
        }
        
        # Compare release angle
        release_comparison = self._compare_release_angle(
            user_analysis['metrics']['release_angle'],
            baseline['metrics']['release_angle']
        )
        comparison['metric_comparisons']['release_angle'] = release_comparison
        
        # Compare elbow alignment
        elbow_comparison = self._compare_elbow_alignment(
            user_analysis['metrics']['elbow_alignment'],
            baseline['metrics']['elbow_alignment']
        )
        comparison['metric_comparisons']['elbow_alignment'] = elbow_comparison
        
        # Compare follow-through
        follow_through_comparison = self._compare_follow_through(
            user_analysis['metrics']['follow_through'],
            baseline['metrics']['follow_through']
        )
        comparison['metric_comparisons']['follow_through'] = follow_through_comparison
        
        # Compare balance
        balance_comparison = self._compare_balance(
            user_analysis['metrics']['balance'],
            baseline['metrics']['balance']
        )
        comparison['metric_comparisons']['balance'] = balance_comparison
        
        # Calculate overall similarity
        similarities = [
            release_comparison['similarity'],
            elbow_comparison['similarity'],
            follow_through_comparison['similarity'],
            balance_comparison['similarity']
        ]
        comparison['overall_similarity'] = float(np.mean(similarities) * 100)
        
        # Generate feedback
        comparison = self._generate_feedback(comparison, baseline_player)
        
        logger.info(f"✅ Comparison complete: {comparison['overall_similarity']:.1f}% similarity")
        
        return comparison
    
    def _compare_release_angle(
        self,
        user_metric: Dict,
        baseline_metric: Dict
    ) -> Dict[str, Any]:
        """Compare release angles"""
        
        user_angle = user_metric['trajectory_angle']
        baseline_angle = baseline_metric['trajectory_angle']
        
        angle_diff = abs(user_angle - baseline_angle)
        similarity = max(0, 1 - (angle_diff / 45))
        
        return {
            'similarity': similarity,
            'user_value': user_angle,
            'baseline_value': baseline_angle,
            'difference': angle_diff,
            'status': 'excellent' if angle_diff < 5 else 'good' if angle_diff < 10 else 'needs_improvement'
        }
    
    def _compare_elbow_alignment(
        self,
        user_metric: Dict,
        baseline_metric: Dict
    ) -> Dict[str, Any]:
        """Compare elbow alignment"""
        
        user_offset = user_metric['average_offset']
        baseline_offset = baseline_metric['average_offset']
        
        offset_diff = abs(user_offset - baseline_offset)
        similarity = max(0, 1 - (offset_diff / 0.2))
        
        return {
            'similarity': similarity,
            'user_value': user_offset,
            'baseline_value': baseline_offset,
            'difference': offset_diff,
            'status': 'excellent' if offset_diff < 0.02 else 'good' if offset_diff < 0.05 else 'needs_improvement'
        }
    
    def _compare_follow_through(
        self,
        user_metric: Dict,
        baseline_metric: Dict
    ) -> Dict[str, Any]:
        """Compare follow-through"""
        
        user_extension = user_metric['extension_distance']
        baseline_extension = baseline_metric['extension_distance']
        
        extension_diff = abs(user_extension - baseline_extension)
        similarity = max(0, 1 - (extension_diff / 0.5))
        
        return {
            'similarity': similarity,
            'user_value': user_extension,
            'baseline_value': baseline_extension,
            'difference': extension_diff,
            'status': 'excellent' if extension_diff < 0.05 else 'good' if extension_diff < 0.1 else 'needs_improvement'
        }
    
    def _compare_balance(
        self,
        user_metric: Dict,
        baseline_metric: Dict
    ) -> Dict[str, Any]:
        """Compare balance and stance"""
        
        user_stability = user_metric['stability_score']
        baseline_stability = baseline_metric['stability_score']
        
        stability_diff = abs(user_stability - baseline_stability)
        similarity = max(0, 1 - (stability_diff / 10))
        
        return {
            'similarity': similarity,
            'user_value': user_stability,
            'baseline_value': baseline_stability,
            'difference': stability_diff,
            'status': 'excellent' if stability_diff < 1 else 'good' if stability_diff < 2 else 'needs_improvement'
        }
    
    def _generate_feedback(
        self,
        comparison: Dict[str, Any],
        baseline_player: str
    ) -> Dict[str, Any]:
        """Generate personalized feedback based on comparison"""
        
        strengths = []
        improvements = []
        feedback = []
        
        metrics = comparison['metric_comparisons']
        
        # Release angle feedback
        if metrics['release_angle']['status'] == 'excellent':
            strengths.append(f"Release angle matches {baseline_player}'s form closely")
            feedback.append(f"Your release angle ({metrics['release_angle']['user_value']:.1f}°) is very similar to {baseline_player}'s ({metrics['release_angle']['baseline_value']:.1f}°). Keep maintaining this form!")
        elif metrics['release_angle']['status'] == 'needs_improvement':
            improvements.append("Release angle consistency")
            diff = metrics['release_angle']['difference']
            direction = "higher" if metrics['release_angle']['user_value'] > metrics['release_angle']['baseline_value'] else "lower"
            feedback.append(f"Your release angle is {diff:.1f}° {direction} than {baseline_player}'s. Try to adjust your release point slightly.")
        else:
            feedback.append(f"Your release angle is close to {baseline_player}'s. Focus on consistency.")
        
        # Elbow alignment feedback
        if metrics['elbow_alignment']['status'] == 'excellent':
            strengths.append("Excellent elbow positioning")
            feedback.append(f"Your elbow alignment matches {baseline_player}'s technique!")
        elif metrics['elbow_alignment']['status'] == 'needs_improvement':
            improvements.append("Elbow alignment under the ball")
            feedback.append(f"{baseline_player} keeps their elbow more directly under the ball. Focus on aligning your shooting elbow vertically.")
        
        # Follow-through feedback
        if metrics['follow_through']['status'] == 'excellent':
            strengths.append("Strong follow-through like " + baseline_player)
        elif metrics['follow_through']['status'] == 'needs_improvement':
            improvements.append("Follow-through extension")
            feedback.append(f"{baseline_player}'s follow-through extends {metrics['follow_through']['difference']:.2f} more. Practice holding your follow-through longer.")
        else:
            feedback.append("Good follow-through technique. Keep practicing!")
        
        # Balance feedback
        if metrics['balance']['status'] == 'excellent':
            strengths.append("Stable base similar to " + baseline_player)
        elif metrics['balance']['status'] == 'needs_improvement':
            improvements.append("Stance stability")
            feedback.append(f"Work on maintaining a more stable base like {baseline_player}. Keep your feet shoulder-width apart throughout the shot.")
        
        # If no specific improvements, add general encouragement
        if not improvements:
            improvements.append("Overall consistency")
            feedback.append(f"Your form is very close to {baseline_player}'s! Focus on maintaining this level across all shots.")
        
        comparison['strengths'] = strengths
        comparison['areas_for_improvement'] = improvements
        comparison['specific_feedback'] = feedback
        
        return comparison
