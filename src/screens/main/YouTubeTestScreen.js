// YouTubeTestScreen.js - Test screen for YouTube API
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YouTubeService from '../../services/youtubeService';

const YouTubeTestScreen = ({ navigation }) => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [apiKeyStatus, setApiKeyStatus] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);

  // Get diagnostics on mount
  React.useEffect(() => {
    const diag = YouTubeService.getDiagnostics();
    setDiagnostics(diag);
  }, []);

  const testApiKey = async () => {
    setTesting(true);
    setApiKeyStatus(null);
    setTestResults(null);
    
    try {
      console.log('Starting API key test...');
      const result = await YouTubeService.testApiKey();
      setApiKeyStatus(result);
      
      if (result.success) {
        Alert.alert('Success!', 'YouTube API key is working correctly');
      } else {
        Alert.alert('API Error', `Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Test error:', error);
      setApiKeyStatus({ success: false, error: error.message });
      Alert.alert('Test Failed', error.message);
    } finally {
      setTesting(false);
    }
  };

  const testVideoSearch = async () => {
    setTesting(true);
    setTestResults(null);
    
    try {
      console.log('Testing video search...');
      const videos = await YouTubeService.searchVideosByCategory('shooting', 5);
      setTestResults(videos);
      
      if (videos.length > 0) {
        Alert.alert('Success!', `Found ${videos.length} videos`);
      } else {
        Alert.alert('No Results', 'No videos found, but API call succeeded');
      }
    } catch (error) {
      console.error('Search test error:', error);
      Alert.alert('Search Failed', error.message);
    } finally {
      setTesting(false);
    }
  };

  const testPopularVideos = async () => {
    setTesting(true);
    setTestResults(null);
    
    try {
      console.log('Testing popular videos...');
      const videos = await YouTubeService.getPopularTrainingVideos(5);
      setTestResults(videos);
      
      if (videos.length > 0) {
        Alert.alert('Success!', `Found ${videos.length} popular videos`);
      } else {
        Alert.alert('No Results', 'No popular videos found, but API call succeeded');
      }
    } catch (error) {
      console.error('Popular videos test error:', error);
      Alert.alert('Test Failed', error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>YouTube API Test</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container}>
        {/* API Key Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Key Status</Text>
          <Text style={styles.sectionDescription}>
            Test if your YouTube API key is properly configured
          </Text>
          
          <TouchableOpacity
            style={[styles.testButton, styles.primaryButton]}
            onPress={testApiKey}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="key" size={20} color="#FFF" />
            )}
            <Text style={styles.buttonText}>Test API Key</Text>
          </TouchableOpacity>

          {apiKeyStatus && (
            <View style={[
              styles.statusCard,
              apiKeyStatus.success ? styles.successCard : styles.errorCard
            ]}>
              <Ionicons 
                name={apiKeyStatus.success ? "checkmark-circle" : "close-circle"} 
                size={24} 
                color={apiKeyStatus.success ? "#4CAF50" : "#F44336"} 
              />
              <View style={styles.statusContent}>
                <Text style={styles.statusTitle}>
                  {apiKeyStatus.success ? "API Key Valid" : "API Key Invalid"}
                </Text>
                <Text style={styles.statusMessage}>
                  {apiKeyStatus.success 
                    ? "YouTube API is accessible" 
                    : `Error: ${apiKeyStatus.error}`
                  }
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Diagnostics */}
        {diagnostics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diagnostics</Text>
            <View style={styles.diagnosticsCard}>
              <View style={styles.diagnosticRow}>
                <Text style={styles.diagnosticLabel}>API Key:</Text>
                <Text style={styles.diagnosticValue}>{diagnostics.apiKey.key}</Text>
              </View>
              <View style={styles.diagnosticRow}>
                <Text style={styles.diagnosticLabel}>Key Valid Format:</Text>
                <Text style={[styles.diagnosticValue, diagnostics.apiKey.isValid ? styles.successText : styles.errorText]}>
                  {diagnostics.apiKey.isValid ? 'Yes' : 'No'}
                </Text>
              </View>
              <View style={styles.diagnosticRow}>
                <Text style={styles.diagnosticLabel}>Key Length:</Text>
                <Text style={styles.diagnosticValue}>{diagnostics.apiKey.keyLength} chars</Text>
              </View>
              <View style={styles.diagnosticRow}>
                <Text style={styles.diagnosticLabel}>Base URL:</Text>
                <Text style={styles.diagnosticValue}>{diagnostics.baseUrl}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Video Search Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Video Search Tests</Text>
          <Text style={styles.sectionDescription}>
            Test different search functionalities
          </Text>
          
          <TouchableOpacity
            style={[styles.testButton, styles.secondaryButton]}
            onPress={testVideoSearch}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#FF6B00" />
            ) : (
              <Ionicons name="search" size={20} color="#FF6B00" />
            )}
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Test Category Search
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.secondaryButton]}
            onPress={testPopularVideos}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#FF6B00" />
            ) : (
              <Ionicons name="trending-up" size={20} color="#FF6B00" />
            )}
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Test Popular Videos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        {testResults && testResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Results</Text>
            <Text style={styles.resultsCount}>
              Found {testResults.length} videos
            </Text>
            
            {testResults.slice(0, 3).map((video, index) => (
              <View key={index} style={styles.videoResult}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {video.title}
                </Text>
                <Text style={styles.videoChannel}>
                  {video.channelTitle}
                </Text>
                <Text style={styles.videoMeta}>
                  {video.duration} • {video.viewCount} views
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Troubleshooting Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Troubleshooting</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Common 400 Error Causes:</Text>
            <Text style={styles.tipText}>
              • Invalid API key{'\n'}
              • YouTube Data API v3 not enabled{'\n'}
              • Quota exceeded{'\n'}
              • Invalid search parameters{'\n'}
              • API key restrictions
            </Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>API Key Configuration:</Text>
            <Text style={styles.tipText}>
              1. Go to Google Cloud Console{'\n'}
              2. Enable YouTube Data API v3{'\n'}
              3. Create/verify API key{'\n'}
              4. Check quota limits{'\n'}
              5. Remove unnecessary restrictions
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#FF6B00',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF6B00',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#FFF',
  },
  secondaryButtonText: {
    color: '#FF6B00',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  successCard: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  statusContent: {
    flex: 1,
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B00',
    marginBottom: 12,
  },
  videoResult: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B00',
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  videoChannel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  videoMeta: {
    fontSize: 12,
    color: '#999',
  },
  tipCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  diagnosticsCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  diagnosticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  diagnosticLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  diagnosticValue: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  successText: {
    color: '#4CAF50',
  },
  errorText: {
    color: '#F44336',
  },
});

export default YouTubeTestScreen;
