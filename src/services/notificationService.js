// notificationService.js - Push notification service for Expo
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { db } from '../config/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and get Expo push token
 * @returns {Promise<string|null>} Expo push token or null if failed
 */
export const registerForPushNotificationsAsync = async () => {
  // Must be on physical device for push notifications
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Set up Android notification channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8A1C22',
    });

    // Create separate channel for daily reminders
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Daily Reminders',
      description: 'Daily challenge and workout reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8A1C22',
    });
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get Expo push token
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId
    ?? Constants?.easConfig?.projectId;

  if (!projectId) {
    console.error('Project ID not found for push notifications');
    return null;
  }

  try {
    const pushTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('Expo Push Token:', pushTokenData.data);
    return pushTokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/**
 * Save push token to Firestore for the user
 * @param {string} uid - User ID
 * @param {string} pushToken - Expo push token
 */
export const savePushToken = async (uid, pushToken) => {
  if (!uid || !pushToken) return;

  try {
    await updateDoc(doc(db, 'users', uid), {
      pushToken: pushToken,
      pushTokenUpdatedAt: serverTimestamp(),
      devicePlatform: Platform.OS,
    });
    console.log('Push token saved to Firestore');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
};

/**
 * Update last app open timestamp in Firestore
 * Used to determine if user should receive push notifications
 * @param {string} uid - User ID
 */
export const updateLastAppOpen = async (uid) => {
  if (!uid) return;

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    await updateDoc(doc(db, 'users', uid), {
      lastAppOpenAt: serverTimestamp(),
      lastAppOpenDate: today,
    });
    console.log('Last app open updated:', today);
  } catch (error) {
    console.error('Error updating last app open:', error);
  }
};

/**
 * Update notification preferences for user
 * @param {string} uid - User ID
 * @param {boolean} enabled - Whether notifications are enabled
 */
export const updateNotificationPreference = async (uid, enabled) => {
  if (!uid) return;

  try {
    await updateDoc(doc(db, 'users', uid), {
      'notificationSettings.enabled': enabled,
      'notificationSettings.updatedAt': serverTimestamp(),
    });
    console.log('Notification preference updated:', enabled);
  } catch (error) {
    console.error('Error updating notification preference:', error);
  }
};

/**
 * Add listener for notifications received while app is in foreground
 * @param {Function} callback - Callback function when notification received
 * @returns {Object} Subscription to remove when done
 */
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Add listener for notification responses (when user taps notification)
 * @param {Function} callback - Callback function when notification tapped
 * @returns {Object} Subscription to remove when done
 */
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Get current notification permission status
 * @returns {Promise<string>} Permission status ('granted', 'denied', 'undetermined')
 */
export const getNotificationPermissionStatus = async () => {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
};

/**
 * Get the last notification response (for handling app opened via notification)
 * @returns {Promise<Object|null>} Last notification response or null
 */
export const getLastNotificationResponse = async () => {
  return await Notifications.getLastNotificationResponseAsync();
};
