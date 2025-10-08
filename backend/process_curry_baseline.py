"""
Script to process the Stephen Curry baseline video and create the baseline JSON file.
"""
import sys
import os
import json
import numpy as np
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from services.baseline_analyzer import BaselineAnalyzer

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

def main():
    print("=" * 60)
    print("Stephen Curry Baseline Video Processor")
    print("=" * 60)
    
    # Initialize the baseline analyzer
    analyzer = BaselineAnalyzer()
    
    # Define paths
    video_path = Path(__file__).parent / "baselines" / "StephCurryShot.mp4"
    baseline_dir = Path(__file__).parent / "baselines"
    
    # Check if video exists
    if not video_path.exists():
        print(f"❌ Error: Video not found at {video_path}")
        print(f"Please ensure StephCurryShot.mp4 is in the baselines/ directory")
        return
    
    print(f"\n📹 Video found: {video_path}")
    print(f"📁 Baseline will be saved to: {baseline_dir}")
    
    # Process the video
    print("\n🔄 Processing video... This may take a moment...")
    print("   - Extracting pose landmarks")
    print("   - Detecting shooting phases")
    print("   - Calculating metrics")
    
    try:
        baseline_data = analyzer.analyze_pro_video(
            video_path=str(video_path),
            player_name="Stephen Curry"
        )
        
        if baseline_data:
            print("\n✅ Baseline created successfully!")
            print("\n📊 Baseline Metrics:")
            print("-" * 60)
            
            metrics = baseline_data.get('metrics', {})
            
            # Release Angle
            if 'release_angle' in metrics:
                print(f"\n🎯 Release Angle:")
                print(f"   Trajectory: {metrics['release_angle'].get('trajectory_angle', 0):.1f}°")
                print(f"   Elbow: {metrics['release_angle'].get('elbow_angle', 0):.1f}°")
            
            # Elbow Alignment
            if 'elbow_alignment' in metrics:
                print(f"\n💪 Elbow Alignment:")
                print(f"   Lateral Offset: {metrics['elbow_alignment'].get('lateral_offset', 0):.3f}")
                print(f"   Consistency: {metrics['elbow_alignment'].get('consistency', 0):.3f}")
            
            # Follow Through
            if 'follow_through' in metrics:
                print(f"\n👋 Follow Through:")
                print(f"   Extension: {metrics['follow_through'].get('extension_distance', 0):.3f}")
                print(f"   Wrist Snap: {metrics['follow_through'].get('wrist_snap_angle', 0):.1f}°")
            
            # Balance
            if 'balance' in metrics:
                print(f"\n⚖️  Balance:")
                print(f"   Stance Width: {metrics['balance'].get('stance_width', 0):.3f}")
                print(f"   Stability: {metrics['balance'].get('stability_score', 0):.3f}")
                print(f"   Center Movement: {metrics['balance'].get('center_of_mass_movement', 0):.3f}")
            
            # Arc Trajectory
            if 'arc_trajectory' in metrics:
                print(f"\n🌈 Arc Trajectory:")
                print(f"   Arc Height: {metrics['arc_trajectory'].get('arc_height', 0):.3f}")
                print(f"   Apex Angle: {metrics['arc_trajectory'].get('apex_angle', 0):.1f}°")
            
            print("\n" + "-" * 60)
            print(f"📝 Frames Analyzed: {baseline_data.get('frame_count', 0)}")
            print(f"⏱️  Duration: {baseline_data.get('duration', 0):.2f}s")
            
            # Save the baseline
            baseline_file = baseline_dir / "stephen_curry_form_shot.json"
            with open(baseline_file, 'w') as f:
                json.dump(baseline_data, f, indent=2, cls=NumpyEncoder)
            
            print(f"\n💾 Baseline saved to: {baseline_file}")
            print("\n" + "=" * 60)
            print("✨ Setup Complete!")
            print("=" * 60)
            print("\nYou can now use this baseline in the app by specifying:")
            print('   baseline_name: "stephen_curry_form_shot"')
            print("\nThe backend will compare user shots to Stephen Curry's form!")
            
        else:
            print("\n❌ Error: Failed to create baseline")
            print("The video may not contain detectable basketball shooting motion.")
            
    except Exception as e:
        print(f"\n❌ Error processing video: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
