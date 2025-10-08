import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');
const PLAYER_HEIGHT = (width - 32) * 0.56; // 16:9 aspect ratio

const YouTubePlayerEmbedded = ({ 
  videoId, 
  autoplay = false, 
  controls = true, 
  showInfo = false,
  onPlayerReady,
  onStateChange,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef(null);

  // YouTube embed parameters
  const embedParams = new URLSearchParams({
    enablejsapi: '1',
    origin: '*',
    autoplay: autoplay ? '1' : '0',
    controls: controls ? '1' : '0',
    showinfo: showInfo ? '1' : '0',
    rel: '0', // Don't show related videos
    modestbranding: '1', // Modest YouTube branding
    fs: '1', // Allow fullscreen
    cc_load_policy: '0', // Don't show captions by default
    iv_load_policy: '3', // Hide annotations
    playsinline: '1' // Play inline on iOS
  });

  const embedUrl = `https://www.youtube.com/embed/${videoId}?${embedParams.toString()}`;

  // HTML content for the WebView with YouTube Player API
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          background: #000;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        #player { 
          width: 100%; 
          height: 100vh;
        }
      </style>
    </head>
    <body>
      <div id="player"></div>
      <script src="https://www.youtube.com/iframe_api"></script>
      <script>
        let player;
        
        function onYouTubeIframeAPIReady() {
          player = new YT.Player('player', {
            videoId: '${videoId}',
            playerVars: {
              'autoplay': ${autoplay ? 1 : 0},
              'controls': ${controls ? 1 : 0},
              'showinfo': ${showInfo ? 1 : 0},
              'rel': 0,
              'modestbranding': 1,
              'fs': 1,
              'cc_load_policy': 0,
              'iv_load_policy': 3,
              'playsinline': 1
            },
            events: {
              'onReady': function(event) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'ready',
                  data: { videoId: '${videoId}' }
                }));
              },
              'onStateChange': function(event) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'stateChange',
                  data: { 
                    state: event.data,
                    videoId: '${videoId}'
                  }
                }));
              },
              'onError': function(event) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  data: { 
                    error: event.data,
                    videoId: '${videoId}'
                  }
                }));
              }
            }
          });
        }
        
        // Player control functions
        function playVideo() {
          if (player && player.playVideo) {
            player.playVideo();
          }
        }
        
        function pauseVideo() {
          if (player && player.pauseVideo) {
            player.pauseVideo();
          }
        }
        
        function stopVideo() {
          if (player && player.stopVideo) {
            player.stopVideo();
          }
        }
        
        function seekTo(seconds) {
          if (player && player.seekTo) {
            player.seekTo(seconds, true);
          }
        }
        
        function setVolume(volume) {
          if (player && player.setVolume) {
            player.setVolume(volume);
          }
        }
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'ready':
          setIsLoading(false);
          setHasError(false);
          onPlayerReady?.(data.data);
          break;
          
        case 'stateChange':
          onStateChange?.(data.data);
          break;
          
        case 'error':
          setHasError(true);
          setIsLoading(false);
          onError?.(data.data);
          Alert.alert('Video Error', 'Unable to load video. Please try again.');
          break;
      }
    } catch (error) {
      console.error('YouTube player message error:', error);
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    // Keep loading state until we get the ready message
  };

  const handleError = (error) => {
    console.error('WebView error:', error);
    setHasError(true);
    setIsLoading(false);
    Alert.alert('Player Error', 'Unable to load video player. Please check your internet connection.');
  };

  // Player control methods
  const play = () => {
    webViewRef.current?.postMessage('playVideo()');
  };

  const pause = () => {
    webViewRef.current?.postMessage('pauseVideo()');
  };

  const stop = () => {
    webViewRef.current?.postMessage('stopVideo()');
  };

  const seekTo = (seconds) => {
    webViewRef.current?.postMessage(`seekTo(${seconds})`);
  };

  const setVolume = (volume) => {
    webViewRef.current?.postMessage(`setVolume(${volume})`);
  };

  // Expose control methods to parent component
  React.useImperativeHandle(React.forwardRef(), () => ({
    play,
    pause,
    stop,
    seekTo,
    setVolume
  }));

  if (!videoId) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>No video ID provided</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      )}
      
      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load video</Text>
        </View>
      )}
      
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={[styles.webview, isLoading && styles.hidden]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        onMessage={handleMessage}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        startInLoadingState={false}
        scalesPageToFit={true}
        bounces={false}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width - 32,
    height: PLAYER_HEIGHT,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 1,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 1,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default YouTubePlayerEmbedded;
