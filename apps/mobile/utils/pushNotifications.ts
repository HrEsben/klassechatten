import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationPermission {
  granted: boolean;
  canAskAgain: boolean;
  platform: 'ios' | 'android' | 'web';
}

/**
 * Request push notification permissions
 */
export async function requestPushPermissions(): Promise<PushNotificationPermission> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return {
      granted: false,
      canAskAgain: false,
      platform: Platform.OS as any,
    };
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push notification permissions');
    return {
      granted: false,
      canAskAgain: existingStatus === 'undetermined',
      platform: Platform.OS as any,
    };
  }

  // Configure notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }

  return {
    granted: true,
    canAskAgain: false,
    platform: Platform.OS as any,
  };
}

/**
 * Get Expo Push Token
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Expo push tokens only work on physical devices');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.error('Project ID not found in app.json');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log('Expo Push Token:', token.data);
    return token.data;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
}

/**
 * Register push token with Supabase
 */
export async function registerPushToken(
  userId: string,
  token: string,
  deviceId?: string
): Promise<boolean> {
  try {
    const deviceInfo = {
      device_id: deviceId || Device.osInternalBuildId || Device.modelId || 'unknown',
      device_name: Device.modelName || Device.deviceName || 'Unknown Device',
      app_version: Constants.expoConfig?.version || 'unknown',
    };

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
        provider: 'expo',
        ...deviceInfo,
        is_valid: true,
        last_used_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,device_id,platform',
      }
    );

    if (error) {
      console.error('Error registering push token:', error);
      return false;
    }

    console.log('Push token registered successfully');
    return true;
  } catch (error) {
    console.error('Error registering push token:', error);
    return false;
  }
}

/**
 * Unregister push token
 */
export async function unregisterPushToken(token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('token', token);

    if (error) {
      console.error('Error unregistering push token:', error);
      return false;
    }

    console.log('Push token unregistered successfully');
    return true;
  } catch (error) {
    console.error('Error unregistering push token:', error);
    return false;
  }
}

/**
 * Handle notification received while app is in foreground
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Handle notification tapped by user
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get last notification response (for cold start)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Schedule local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: null, // Show immediately
  });

  return id;
}

/**
 * Parse deep link from notification data
 */
export function parseDeepLink(data: any): {
  screen: string;
  params?: Record<string, string>;
} | null {
  if (!data) return null;

  // Extract navigation info from notification data
  const { room_id, class_id, message_id, type } = data;

  if (room_id && class_id) {
    return {
      screen: 'chat',
      params: {
        classId: class_id,
        roomId: room_id,
        messageId: message_id,
      },
    };
  }

  // Add more deep link patterns as needed
  return null;
}

/**
 * Initialize push notifications
 * Call this once when the app starts
 */
export async function initializePushNotifications(userId: string): Promise<{
  success: boolean;
  token: string | null;
  error?: string;
}> {
  try {
    // Request permissions
    const permission = await requestPushPermissions();
    
    if (!permission.granted) {
      return {
        success: false,
        token: null,
        error: 'Permission not granted',
      };
    }

    // Get Expo push token
    const token = await getExpoPushToken();
    
    if (!token) {
      return {
        success: false,
        token: null,
        error: 'Failed to get push token',
      };
    }

    // Register with backend
    const registered = await registerPushToken(userId, token);
    
    if (!registered) {
      return {
        success: false,
        token,
        error: 'Failed to register token',
      };
    }

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return {
      success: false,
      token: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
