/**
 * Menial Mobile - Hardware Notification Service
 * 
 * Manages native push notification permissions, device tokens, and local
 * alerts for worker arrival (§49), escrow funding (§39), and Section 49 Emergency SOS.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure foreground presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface LocalNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: boolean;
}

export class NotificationService {
  /**
   * Requests runtime notification permission.
   */
  public static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('menial-alerts', {
          name: 'Menial Marketplace Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1A4FEE',
        });
      }

      return true;
    } catch (err) {
      console.warn('NotificationService.requestPermissions error:', err);
      return false;
    }
  }

  /**
   * Retrieves the Expo Push Token for remote push notifications (FCM / APNs).
   */
  public static async getPushToken(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data;
    } catch (err) {
      console.warn('NotificationService.getPushToken error:', err);
      return null;
    }
  }

  /**
   * Triggers an immediate local native notification alert.
   * Supports both payload object and title/body arguments.
   */
  public static async sendLocalNotification(
    payloadOrTitle: LocalNotificationPayload | string,
    body?: string,
    data?: Record<string, unknown>
  ): Promise<string | null> {
    try {
      const payload: LocalNotificationPayload =
        typeof payloadOrTitle === 'string'
          ? { title: payloadOrTitle, body: body || '', data }
          : payloadOrTitle;

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: payload.sound !== false,
        },
        trigger: null, // Deliver immediately
      });

      return notificationId;
    } catch (err) {
      console.warn('NotificationService.sendLocalNotification error:', err);
      return null;
    }
  }
}
