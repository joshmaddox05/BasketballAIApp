// storageService.js - Firebase Storage service for file uploads (Expo)
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getMetadata,
  updateMetadata
} from 'firebase/storage';
import { storage } from '../config/firebaseConfig';

/**
 * Upload a file to Firebase Storage
 * @param {string} path - Storage path
 * @param {File|Blob} file - File to upload
 * @param {Object} metadata - File metadata
 * @returns {Promise<string>} Download URL
 */
export const uploadFile = async (path, file, metadata = {}) => {
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Upload a file with progress tracking
 * @param {string} path - Storage path
 * @param {File|Blob} file - File to upload
 * @param {Object} metadata - File metadata
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} Download URL
 */
export const uploadFileWithProgress = async (path, file, metadata = {}, onProgress = null) => {
  try {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    if (onProgress) {
      uploadTask.on('state_changed', (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      });
    }

    await uploadTask;
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file with progress:', error);
    throw error;
  }
};

/**
 * Upload user profile image
 * @param {string} uid - User ID
 * @param {File|Blob} imageFile - Image file
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} Download URL
 */
export const uploadProfileImage = async (uid, imageFile, onProgress = null) => {
  try {
    const timestamp = Date.now();
    const fileName = `profile_${timestamp}.jpg`;
    const path = `users/${uid}/profile/${fileName}`;
    
    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedBy: uid,
        type: 'profile_image'
      }
    };

    const downloadURL = await uploadFileWithProgress(path, imageFile, metadata, onProgress);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
};

/**
 * Upload activity image
 * @param {string} uid - User ID
 * @param {string} activityId - Activity ID
 * @param {File|Blob} imageFile - Image file
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} Download URL
 */
export const uploadActivityImage = async (uid, activityId, imageFile, onProgress = null) => {
  try {
    const timestamp = Date.now();
    const fileName = `activity_${activityId}_${timestamp}.jpg`;
    const path = `users/${uid}/activities/${fileName}`;
    
    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedBy: uid,
        activityId: activityId,
        type: 'activity_image'
      }
    };

    const downloadURL = await uploadFileWithProgress(path, imageFile, metadata, onProgress);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading activity image:', error);
    throw error;
  }
};

/**
 * Upload workout video (for custom workouts)
 * @param {string} workoutId - Workout ID
 * @param {File|Blob} videoFile - Video file
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<string>} Download URL
 */
export const uploadWorkoutVideo = async (workoutId, videoFile, onProgress = null) => {
  try {
    const timestamp = Date.now();
    const fileName = `workout_${workoutId}_${timestamp}.mp4`;
    const path = `workouts/${workoutId}/videos/${fileName}`;
    
    const metadata = {
      contentType: 'video/mp4',
      customMetadata: {
        workoutId: workoutId,
        type: 'workout_video'
      }
    };

    const downloadURL = await uploadFileWithProgress(path, videoFile, metadata, onProgress);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading workout video:', error);
    throw error;
  }
};

/**
 * Delete a file from Firebase Storage
 * @param {string} path - Storage path
 * @returns {Promise<void>}
 */
export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

/**
 * Delete user profile image
 * @param {string} uid - User ID
 * @param {string} fileName - File name
 * @returns {Promise<void>}
 */
export const deleteProfileImage = async (uid, fileName) => {
  try {
    const path = `users/${uid}/profile/${fileName}`;
    await deleteFile(path);
  } catch (error) {
    console.error('Error deleting profile image:', error);
    throw error;
  }
};

/**
 * Delete activity image
 * @param {string} uid - User ID
 * @param {string} fileName - File name
 * @returns {Promise<void>}
 */
export const deleteActivityImage = async (uid, fileName) => {
  try {
    const path = `users/${uid}/activities/${fileName}`;
    await deleteFile(path);
  } catch (error) {
    console.error('Error deleting activity image:', error);
    throw error;
  }
};

/**
 * Get file metadata
 * @param {string} path - Storage path
 * @returns {Promise<Object>} File metadata
 */
export const getFileMetadata = async (path) => {
  try {
    const storageRef = ref(storage, path);
    const metadata = await getMetadata(storageRef);
    return metadata;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw error;
  }
};

/**
 * Update file metadata
 * @param {string} path - Storage path
 * @param {Object} metadata - New metadata
 * @returns {Promise<void>}
 */
export const updateFileMetadata = async (path, metadata) => {
  try {
    const storageRef = ref(storage, path);
    await updateMetadata(storageRef, metadata);
  } catch (error) {
    console.error('Error updating file metadata:', error);
    throw error;
  }
};

/**
 * Get download URL for a file
 * @param {string} path - Storage path
 * @returns {Promise<string>} Download URL
 */
export const getFileDownloadURL = async (path) => {
  try {
    const storageRef = ref(storage, path);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw error;
  }
};

/**
 * Validate file before upload
 * @param {Object} fileInfo - File information
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateFile = (fileInfo, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4']
  } = options;

  const result = {
    isValid: true,
    errors: []
  };

  // Check file size (if available)
  if (fileInfo.size && fileInfo.size > maxSize) {
    result.isValid = false;
    result.errors.push(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
  }

  // Check file type (if available)
  if (fileInfo.type && !allowedTypes.includes(fileInfo.type)) {
    result.isValid = false;
    result.errors.push(`File type ${fileInfo.type} is not allowed`);
  }

  // Check file extension (if available)
  if (fileInfo.name) {
    const extension = fileInfo.name.toLowerCase().substring(fileInfo.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
      result.isValid = false;
      result.errors.push(`File extension ${extension} is not allowed`);
    }
  }

  return result;
};

/**
 * Generate unique file name
 * @param {string} originalName - Original file name
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique file name
 */
export const generateUniqueFileName = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.substring(originalName.lastIndexOf('.'));
  const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
  
  return `${prefix}${baseName}_${timestamp}_${randomString}${extension}`;
};

/**
 * Get storage usage for a user
 * @param {string} uid - User ID
 * @returns {Promise<Object>} Storage usage information
 */
export const getUserStorageUsage = async (uid) => {
  try {
    // This would require listing all files in user's storage path
    // For now, return placeholder data
    return {
      totalFiles: 0,
      totalSize: 0,
      profileImages: 0,
      activityImages: 0,
      videos: 0
    };
  } catch (error) {
    console.error('Error getting user storage usage:', error);
    throw error;
  }
};