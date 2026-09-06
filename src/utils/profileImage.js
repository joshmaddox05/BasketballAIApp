// profileImage.js - Upload a profile image to Firebase Storage via the REST API.
// Uses expo-file-system (reliable in React Native/Expo where the Storage SDK
// upload can be flaky). Returns the public download URL.
import * as FileSystem from 'expo-file-system/legacy';
import { auth } from '../config/firebaseConfig';

const BUCKET = 'basketball-ai-app-db000.firebasestorage.app';

/**
 * Upload a local image to users/{uid}/profile/ and return its download URL.
 * @param {string} uid - The account the image belongs to (may be a linked child).
 * @param {string} imageUri - Local file URI from the image picker.
 * @returns {Promise<string>} download URL
 */
export const uploadProfileImage = async (uid, imageUri) => {
  const timestamp = Date.now();
  const storagePath = `users/${uid}/profile/profile_${timestamp}.jpg`;

  const idToken = await auth.currentUser.getIdToken();
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;

  const uploadResult = await FileSystem.uploadAsync(uploadUrl, imageUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'image/jpeg',
    },
  });

  if (uploadResult.status !== 200) {
    throw new Error(`Upload failed: ${uploadResult.status}`);
  }

  const responseData = JSON.parse(uploadResult.body);
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media&token=${responseData.downloadTokens}`;
};
