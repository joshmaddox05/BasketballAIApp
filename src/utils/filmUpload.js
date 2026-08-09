// filmUpload.js - Upload a video to Firebase Storage via the REST API.
// Mirrors profileImage.js (expo-file-system is reliable in Expo where the Storage
// SDK upload can be flaky), but streams progress via createUploadTask so the UI can
// show a real progress bar. Used for SimCoach film and CoachMarket drill videos.
import * as FileSystem from 'expo-file-system/legacy';
import { auth } from '../config/firebaseConfig';

const BUCKET = 'basketball-ai-app-db000.firebasestorage.app';

/**
 * Upload a local video to users/{uid}/{folder}/ and return its download URL + path.
 * @param {string} uid - The owner the video belongs to.
 * @param {string} videoUri - Local file URI from the video picker.
 * @param {string} folder - Storage subfolder (e.g. 'films', 'drills').
 * @param {(pct:number)=>void} [onProgress] - Called with 0-100 as the upload streams.
 * @returns {Promise<{videoUrl: string, storagePath: string}>}
 */
export const uploadVideo = async (uid, videoUri, folder, onProgress) => {
  const timestamp = Date.now();
  const storagePath = `users/${uid}/${folder}/${folder.replace(/s$/, '')}_${timestamp}.mp4`;

  const idToken = await auth.currentUser.getIdToken();
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;

  const options = {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'video/mp4',
    },
  };

  const task = FileSystem.createUploadTask(uploadUrl, videoUri, options, (progress) => {
    if (onProgress && progress.totalBytesExpectedToSend > 0) {
      const pct = Math.round((progress.totalBytesSent / progress.totalBytesExpectedToSend) * 100);
      onProgress(Math.min(pct, 100));
    }
  });

  const uploadResult = await task.uploadAsync();

  if (!uploadResult || uploadResult.status !== 200) {
    throw new Error(`Upload failed: ${uploadResult?.status}`);
  }

  const responseData = JSON.parse(uploadResult.body);
  const videoUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media&token=${responseData.downloadTokens}`;
  return { videoUrl, storagePath };
};

/** Upload SimCoach game film → users/{uid}/films/. */
export const uploadFilm = (uid, videoUri, onProgress) => uploadVideo(uid, videoUri, 'films', onProgress);

/** Upload a CoachMarket drill video → users/{uid}/drills/. */
export const uploadDrillVideo = (uid, videoUri, onProgress) => uploadVideo(uid, videoUri, 'drills', onProgress);
