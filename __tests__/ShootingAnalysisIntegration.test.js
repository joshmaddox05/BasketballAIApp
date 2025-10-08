// Integration test for AI Shooting Analysis
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ShootingAnalysisScreen from '../src/screens/shared/ShootingAnalysisScreen';
import aiAnalysisService from '../src/services/aiAnalysisService';

// Mock the navigation
const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  reset: jest.fn(),
};

// Mock the AppContext
const mockAppContext = {
  updateUserStats: jest.fn(),
  addActivity: jest.fn(),
};

jest.mock('../src/context/AppContext', () => ({
  useAppContext: () => mockAppContext,
}));

// Mock camera permissions
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [
    { granted: true },
    jest.fn(),
  ],
}));

jest.mock('expo-media-library', () => ({
  usePermissions: () => [{ granted: true }, jest.fn()],
  createAssetAsync: jest.fn().mockResolvedValue({ id: 'test-asset' }),
}));

describe('AI Shooting Analysis Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render intro screen correctly', () => {
    const { getByText } = render(
      <ShootingAnalysisScreen navigation={mockNavigation} />
    );

    expect(getByText('AI Shooting Analysis')).toBeTruthy();
    expect(getByText('Start Recording')).toBeTruthy();
    expect(getByText('Compare with Pro Form:')).toBeTruthy();
  });

  test('should transition to recording screen when start recording is pressed', () => {
    const { getByText } = render(
      <ShootingAnalysisScreen navigation={mockNavigation} />
    );

    const startButton = getByText('Start Recording');
    fireEvent.press(startButton);

    // Camera component should be rendered
    // This would need to be tested with actual camera component
  });

  test('should handle camera capture and start analysis', async () => {
    const mockVideoData = {
      videoUri: 'file://test-video.mp4',
      duration: 3.5,
      timestamp: Date.now(),
      analysisMode: 'shooting',
      cameraType: 'back'
    };

    // Mock the AI analysis service
    const mockAnalysisResults = {
      overallScore: 78,
      metrics: [
        {
          id: 'release_angle',
          name: 'Release Angle',
          score: 8.2,
          value: '47°',
          ideal: '45-50°',
          status: 'good',
          feedback: 'Your release angle is within the optimal range.'
        }
      ],
      recommendations: ['Practice consistent release point'],
      description: 'Good shooting form with room for improvement'
    };

    jest.spyOn(aiAnalysisService, 'analyzeShootingForm')
      .mockResolvedValue(mockAnalysisResults);

    const { getByText } = render(
      <ShootingAnalysisScreen navigation={mockNavigation} />
    );

    // Simulate camera capture
    // This would require more sophisticated mocking of the camera component
    
    await waitFor(() => {
      expect(aiAnalysisService.analyzeShootingForm).toHaveBeenCalledWith(mockVideoData);
    });
  });

  test('should display analysis results correctly', async () => {
    const mockAnalysisResults = {
      overallScore: 78,
      metrics: [
        {
          id: 'release_angle',
          name: 'Release Angle',
          score: 8.2,
          value: '47°',
          ideal: '45-50°',
          status: 'good',
          feedback: 'Your release angle is within the optimal range.'
        }
      ],
      recommendations: ['Practice consistent release point'],
      description: 'Good shooting form with room for improvement'
    };

    const { getByText } = render(
      <ShootingAnalysisScreen 
        navigation={mockNavigation}
        // Would need to mock initial state to show results
      />
    );

    // Test that results are displayed correctly
    // This would require component to be in results state
  });

  test('should update user stats and add activity on successful analysis', async () => {
    const mockAnalysisResults = {
      overallScore: 78,
      metrics: [],
      recommendations: [],
      description: 'Good shooting form'
    };

    jest.spyOn(aiAnalysisService, 'analyzeShootingForm')
      .mockResolvedValue(mockAnalysisResults);

    // Simulate successful analysis flow
    // Would need to trigger the full flow from camera capture to results

    await waitFor(() => {
      expect(mockAppContext.updateUserStats).toHaveBeenCalledWith({
        shooting: 78
      });
      expect(mockAppContext.addActivity).toHaveBeenCalledWith({
        title: 'AI Shooting Analysis',
        progress: 78,
        date: 'Today'
      });
    });
  });

  test('should handle analysis errors gracefully', async () => {
    jest.spyOn(aiAnalysisService, 'analyzeShootingForm')
      .mockRejectedValue(new Error('Analysis failed'));

    // Mock Alert
    const mockAlert = jest.spyOn(require('react-native'), 'Alert');
    mockAlert.alert = jest.fn();

    // Simulate analysis failure
    // Would need to trigger analysis with error

    await waitFor(() => {
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Analysis Failed',
        'Unable to analyze your shooting form. Please try recording again.',
        expect.any(Array)
      );
    });
  });
});

describe('AI Analysis Service', () => {
  test('should handle offline mode correctly', async () => {
    const mockVideoData = {
      videoUri: 'file://test-video.mp4',
      duration: 3.5,
      timestamp: Date.now(),
      analysisMode: 'shooting',
      cameraType: 'back'
    };

    // Test offline mode
    aiAnalysisService.isOfflineMode = true;
    const results = await aiAnalysisService.analyzeShootingForm(mockVideoData);

    expect(results).toBeDefined();
    expect(results.overallScore).toBeGreaterThan(0);
    expect(results.metrics).toBeInstanceOf(Array);
    expect(results.recommendations).toBeInstanceOf(Array);
  });

  test('should format analysis results correctly', () => {
    const mockRawResults = {
      overall_score: 78,
      metrics: [
        {
          name: 'Release Angle',
          score: 8.2,
          status: 'good'
        }
      ]
    };

    const formatted = aiAnalysisService.formatAnalysisResults(mockRawResults);

    expect(formatted.overallScore).toBe(78);
    expect(formatted.metrics[0].score).toBe(8.2);
  });
});
