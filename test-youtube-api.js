// Simple Node.js script to test YouTube API
const YOUTUBE_API_KEY = 'AIzaSyCOhPnUz793R1XZE_Uf73ORINAiWWJ-f4M';
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

async function testYouTubeAPI() {
  console.log('Testing YouTube API...');
  console.log('API Key:', YOUTUBE_API_KEY.substring(0, 10) + '...' + YOUTUBE_API_KEY.substring(YOUTUBE_API_KEY.length - 5));
  
  try {
    // Test 1: Simple search
    console.log('\n--- Test 1: Simple Search ---');
    const testUrl = `${YOUTUBE_API_BASE_URL}/search?part=snippet&q=basketball&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
    console.log('URL:', testUrl);
    
    const response = await fetch(testUrl);
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error Response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed Error:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.error('Could not parse error as JSON');
      }
      return;
    }
    
    const data = await response.json();
    console.log('Success! Found', data.items?.length || 0, 'videos');
    console.log('Quota Info:', data.pageInfo);
    
    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      console.log('First video:', {
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        videoId: video.id.videoId
      });
    }
    
  } catch (error) {
    console.error('Fetch Error:', error.message);
  }
  
  try {
    // Test 2: Videos endpoint (different quota usage)
    console.log('\n--- Test 2: Videos Endpoint ---');
    const videosUrl = `${YOUTUBE_API_BASE_URL}/videos?part=snippet&chart=mostPopular&videoCategoryId=17&maxResults=1&key=${YOUTUBE_API_KEY}`;
    console.log('URL:', videosUrl);
    
    const response2 = await fetch(videosUrl);
    console.log('Response Status:', response2.status);
    
    if (!response2.ok) {
      const errorText = await response2.text();
      console.error('Videos Error Response:', errorText);
      return;
    }
    
    const data2 = await response2.json();
    console.log('Videos Success! Found', data2.items?.length || 0, 'videos');
    
  } catch (error) {
    console.error('Videos Fetch Error:', error.message);
  }
}

// Use fetch polyfill for Node.js
global.fetch = require('node-fetch');

testYouTubeAPI();
