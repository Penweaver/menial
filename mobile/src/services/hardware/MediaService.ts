/**
 * Menial Mobile - Hardware Media Service
 * 
 * Manages device camera capture, photo library selection, image optimization,
 * and permissions for arrival check-ins, completion proofs, and identity verification.
 * Adheres to low-bandwidth performance optimization (§51).
 */

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface CapturedMediaResult {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
  fileName?: string;
  mimeType?: string;
}

export class MediaService {
  /**
   * Requests runtime camera permission.
   */
  public static async requestCameraPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.warn('MediaService.requestCameraPermissions error:', err);
      return false;
    }
  }

  /**
   * Requests runtime photo gallery permission.
   */
  public static async requestGalleryPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.warn('MediaService.requestGalleryPermissions error:', err);
      return false;
    }
  }

  /**
   * Launches native camera to capture on-site photographic proof.
   * Compresses to 0.75 quality to conserve mobile data (§51).
   */
  public static async capturePhoto(options?: {
    quality?: number;
    allowsEditing?: boolean;
    aspect?: [number, number];
  }): Promise<CapturedMediaResult | null> {
    try {
      const hasPermission = await this.requestCameraPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow Menial camera access to snap job arrival and completion proofs.'
        );
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: options?.allowsEditing ?? false,
        aspect: options?.aspect ?? [4, 3],
        quality: options?.quality ?? 0.75, // Optimized for Nigerian network bandwidth (§51)
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        fileName: asset.fileName || `proof_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      };
    } catch (err) {
      console.warn('MediaService.capturePhoto error:', err);
      Alert.alert('Camera Error', 'Unable to capture photo. Please try again.');
      return null;
    }
  }

  /**
   * Launches native photo library picker.
   */
  public static async pickFromGallery(options?: {
    quality?: number;
    allowsEditing?: boolean;
    aspect?: [number, number];
  }): Promise<CapturedMediaResult | null> {
    try {
      const hasPermission = await this.requestGalleryPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Photos Permission Required',
          'Please allow Menial access to select photos from your device library.'
        );
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: options?.allowsEditing ?? false,
        aspect: options?.aspect ?? [4, 3],
        quality: options?.quality ?? 0.75,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        fileName: asset.fileName || `photo_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      };
    } catch (err) {
      console.warn('MediaService.pickFromGallery error:', err);
      Alert.alert('Gallery Error', 'Unable to select image. Please try again.');
      return null;
    }
  }

  /**
   * Displays an accessible action sheet dialog allowing user to choose between Camera or Gallery.
   * Supports both callback and Promise-based invocation.
   */
  public static promptMediaPicker(
    optionsOrTitle?: string | { title?: string; message?: string },
    onSuccess?: (result: CapturedMediaResult) => void
  ): Promise<CapturedMediaResult | null> {
    const dialogTitle =
      typeof optionsOrTitle === 'string'
        ? optionsOrTitle
        : optionsOrTitle?.title || 'Select Image Source';

    const dialogMessage =
      typeof optionsOrTitle === 'object' && optionsOrTitle?.message
        ? optionsOrTitle.message
        : 'Select how you would like to submit photographic proof:';

    return new Promise<CapturedMediaResult | null>((resolve) => {
      Alert.alert(
        dialogTitle,
        dialogMessage,
        [
          {
            text: '📷 Launch Camera',
            onPress: async () => {
              const photo = await this.capturePhoto();
              if (photo && onSuccess) onSuccess(photo);
              resolve(photo);
            },
          },
          {
            text: '🖼️ Choose from Gallery',
            onPress: async () => {
              const photo = await this.pickFromGallery();
              if (photo && onSuccess) onSuccess(photo);
              resolve(photo);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ]
      );
    });
  }
}
