// Notification System Types
// Shared types for cross-platform notifications

export type NotificationType = 
  | 'new_message'
  | 'mention'
  | 'reaction'
  | 'system'
  | 'moderation';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'retry';

export type PushProvider = 'expo' | 'apns' | 'fcm' | 'web-push';

export type Platform = 'ios' | 'android' | 'web';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  room_id: string | null;
  message_id: string | null;
  class_id: string | null;
  data: NotificationData;
  read: boolean;
  read_at: string | null;
  delivered: boolean;
  delivered_at: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationData {
  sender_id?: string;
  sender_name?: string;
  room_name?: string;
  class_name?: string;
  message_preview?: string;
  emoji?: string;
  reactor_id?: string;
  reactor_name?: string;
  moderation_status?: string;
  moderation_reason?: string;
  [key: string]: any; // Allow additional custom fields
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: Platform;
  provider: PushProvider;
  device_id: string | null;
  device_name: string | null;
  app_version: string | null;
  is_valid: boolean;
  last_used_at: string;
  invalid_at: string | null;
  error_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  in_app_enabled: boolean;
  notify_new_messages: boolean;
  notify_mentions: boolean;
  notify_reactions: boolean;
  notify_system: boolean;
  notify_moderation: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null; // HH:MM format
  quiet_hours_end: string | null; // HH:MM format
  max_notifications_per_hour: number;
  muted_rooms: string[]; // Array of room IDs
  muted_classes: string[]; // Array of class IDs
  created_at: string;
  updated_at: string;
}

export interface NotificationDeliveryLog {
  id: string;
  notification_id: string;
  push_token_id: string | null;
  status: NotificationStatus;
  provider: string;
  provider_response: any;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
}

// ============================================================
// Payload Types for Push Notifications
// ============================================================

export interface ExpoPushMessage {
  to: string | string[];
  sound?: 'default' | null;
  title?: string;
  subtitle?: string;
  body?: string;
  data?: any;
  ttl?: number;
  expiration?: number;
  priority?: 'default' | 'normal' | 'high';
  badge?: number;
  channelId?: string;
  categoryId?: string;
  mutableContent?: boolean;
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: any;
}

export interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: any;
}

export interface APNsPayload {
  aps: {
    alert?: {
      title?: string;
      subtitle?: string;
      body?: string;
    } | string;
    badge?: number;
    sound?: string;
    'content-available'?: number;
    'mutable-content'?: number;
    category?: string;
    'thread-id'?: string;
  };
  [key: string]: any; // Custom data
}

export interface FCMPayload {
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
    sound?: string;
    badge?: string;
    tag?: string;
    color?: string;
    click_action?: string;
  };
  data?: {
    [key: string]: string;
  };
  android?: {
    priority?: 'normal' | 'high';
    ttl?: string;
    notification?: {
      icon?: string;
      color?: string;
      sound?: string;
      tag?: string;
      click_action?: string;
      channel_id?: string;
    };
  };
  apns?: {
    payload?: APNsPayload;
    headers?: {
      [key: string]: string;
    };
  };
}

// ============================================================
// Request/Response Types
// ============================================================

export interface SendNotificationRequest {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  room_id?: string;
  message_id?: string;
  class_id?: string;
  data?: NotificationData;
}

export interface SendNotificationResponse {
  notification_id: string;
  in_app_created: boolean;
  push_sent: boolean;
  push_token_count: number;
  delivery_ids: string[];
  errors?: string[];
}

export interface RegisterPushTokenRequest {
  token: string;
  platform: Platform;
  provider: PushProvider;
  device_id?: string;
  device_name?: string;
  app_version?: string;
}

export interface RegisterPushTokenResponse {
  success: boolean;
  token_id: string;
}

export interface UpdatePreferencesRequest {
  push_enabled?: boolean;
  in_app_enabled?: boolean;
  notify_new_messages?: boolean;
  notify_mentions?: boolean;
  notify_reactions?: boolean;
  notify_system?: boolean;
  notify_moderation?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  max_notifications_per_hour?: number;
  muted_rooms?: string[];
  muted_classes?: string[];
}

// ============================================================
// Utility Types
// ============================================================

export interface NotificationGroup {
  date: string; // ISO date string (YYYY-MM-DD)
  notifications: Notification[];
}

export interface UnreadCount {
  total: number;
  by_type: Record<NotificationType, number>;
}

export interface DeepLinkData {
  screen: 'chat' | 'profile' | 'settings';
  room_id?: string;
  class_id?: string;
  message_id?: string;
  user_id?: string;
}

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  platform: Platform;
}

// ============================================================
// Hook Return Types
// ============================================================

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: Error | null;
  updatePreferences: (updates: UpdatePreferencesRequest) => Promise<void>;
  toggleMuteRoom: (roomId: string) => Promise<void>;
  toggleMuteClass: (classId: string) => Promise<void>;
}

export interface UsePushNotificationsReturn {
  expoPushToken: string | null;
  isRegistered: boolean;
  isLoading: boolean;
  error: Error | null;
  permissionStatus: NotificationPermissionStatus | null;
  requestPermission: () => Promise<boolean>;
  registerToken: () => Promise<void>;
  unregisterToken: () => Promise<void>;
}
