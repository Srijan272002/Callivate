import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationData, Task } from '../types';
import { StorageService } from './storage';
import { supabaseClient } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}

export interface ScheduledNotification {
  id: string;
  taskId: string;
  type: 'reminder' | 'follow-up' | 'streak-break' | 'motivation';
  scheduledTime: Date;
  title: string;
  body: string;
  data?: any;
}

export interface NotificationSettings {
  notification_start_hour: number;
  notification_end_hour: number;
  avoid_quiet_hours: boolean;
  follow_up_delay_minutes: number;
  batch_notifications: boolean;
  smart_timing_enabled: boolean;
  motivation_notifications: boolean;
  streak_notifications: boolean;
}

export interface NotificationAnalytics {
  period_days: number;
  total_notifications: number;
  successful_deliveries: number;
  failed_deliveries: number;
  delivery_rate_percent: number;
  type_breakdown: Record<string, { sent: number; failed: number }>;
  cost_savings: {
    expo_notifications_used: number;
    estimated_cost_savings: number;
    provider: string;
  };
}

export class AdvancedNotificationService {
  private static readonly STORAGE_KEYS = {
    PERMISSION_GRANTED: 'notification_permission_granted',
    DEVICE_TOKEN: 'expo_device_token',
    NOTIFICATION_SETTINGS: 'notification_settings',
    USER_ID: 'user_id',
  };

  private static deviceToken: string | null = null;
  private static isInitialized = false;

  /**
   * Initialize the advanced notification service
   */
  static async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return;

      // Setup notification listeners
      this.setupNotificationListeners();
      
      // Register for push token if permissions granted
      const hasPermission = await this.hasPermission();
      if (hasPermission) {
        await this.registerForPushNotifications();
      }

      this.isInitialized = true;
      console.log('🔔 Advanced Notification service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize advanced notification service:', error);
    }
  }

  /**
   * Request notification permissions and register device token
   */
  static async requestPermissions(): Promise<NotificationPermissionStatus> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      let finalStatus = existingStatus;
      let canAskAgain = true;

      if (existingStatus !== 'granted') {
        const { status, canAskAgain: canAsk } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        canAskAgain = canAsk;
      }

      const granted = finalStatus === 'granted';
      
      await StorageService.setItem(
        this.STORAGE_KEYS.PERMISSION_GRANTED,
        granted.toString()
      );

      // Register for push notifications if granted
      if (granted) {
        await this.registerForPushNotifications();
      }

      console.log(`🔔 Notification permission: ${finalStatus}`);

      return {
        granted,
        canAskAgain,
        status: finalStatus,
      };
    } catch (error) {
      console.error('❌ Failed to request notification permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied' as Notifications.PermissionStatus,
      };
    }
  }

  /**
   * Register device for push notifications with backend
   */
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!this.deviceToken) {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        this.deviceToken = tokenData.data;
        await StorageService.setItem(this.STORAGE_KEYS.DEVICE_TOKEN, this.deviceToken);
      }

      // Register with backend
      const userId = await StorageService.getItem(this.STORAGE_KEYS.USER_ID);
      if (userId && this.deviceToken) {
        const response = await supabaseClient.functions.invoke('register-device-token', {
          body: {
            user_id: userId,
            device_token: this.deviceToken,
            device_type: Platform.OS as 'ios' | 'android',
            device_name: `${Platform.OS} Device`,
          },
        });

        if (response.error) {
          console.error('Failed to register device token:', response.error);
        } else {
          console.log('✅ Device token registered with backend');
        }
      }

      return this.deviceToken;
    } catch (error) {
      console.error('❌ Failed to register for push notifications:', error);
      return null;
    }
  }

  /**
   * Check if we have notification permissions
   */
  static async hasPermission(): Promise<boolean> {
    try {
      const stored = await StorageService.getItem(this.STORAGE_KEYS.PERMISSION_GRANTED);
      if (stored === 'true') return true;

      const { status } = await Notifications.getPermissionsAsync();
      const granted = status === 'granted';
      
      await StorageService.setItem(
        this.STORAGE_KEYS.PERMISSION_GRANTED,
        granted.toString()
      );

      return granted;
    } catch (error) {
      console.error('❌ Error checking notification permission:', error);
      return false;
    }
  }

  /**
   * Schedule a task reminder with smart timing
   */
  static async scheduleTaskReminder(task: Task): Promise<string | null> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) {
        console.warn('⚠️ No notification permission, cannot schedule reminder');
        return null;
      }

      const userId = await StorageService.getItem(this.STORAGE_KEYS.USER_ID);
      if (!userId) return null;

      // Send to backend for smart timing processing
      const response = await supabaseClient.functions.invoke('send-notification', {
        body: {
          user_id: userId,
          task_execution_id: task.id,
          notification_type: 'task_reminder',
          title: task.title,
          body: `Time for: ${task.title}`,
          device_token: this.deviceToken,
          scheduled_time: task.scheduledTime,
        },
      });

      if (response.error) {
        console.error('Failed to schedule smart reminder:', response.error);
        return null;
      }

      console.log(`🔔 Smart reminder scheduled for task "${task.title}"`);
      return response.data?.scheduled_id || 'immediate';
    } catch (error) {
      console.error('❌ Failed to schedule task reminder:', error);
      return null;
    }
  }

  /**
   * Send streak notification with real-time updates
   */
  static async sendStreakNotification(streakCount: number, streakType: 'milestone' | 'break' = 'milestone'): Promise<void> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) return;

      const userId = await StorageService.getItem(this.STORAGE_KEYS.USER_ID);
      if (!userId) return;

      // Send via backend for real-time Supabase integration
      const response = await supabaseClient.functions.invoke('send-streak-notification', {
        body: {
          user_id: userId,
          streak_count: streakCount,
          streak_type: streakType,
          device_token: this.deviceToken,
        },
      });

      if (response.error) {
        console.error('Failed to send streak notification:', response.error);
      } else {
        console.log(`🔥 Streak notification sent: ${streakCount} days (${streakType})`);
      }
    } catch (error) {
      console.error('❌ Failed to send streak notification:', error);
    }
  }

  /**
   * Get notification analytics from backend
   */
  static async getNotificationAnalytics(days: number = 30): Promise<NotificationAnalytics | null> {
    try {
      const userId = await StorageService.getItem(this.STORAGE_KEYS.USER_ID);
      if (!userId) return null;

      const response = await supabaseClient.functions.invoke('get-notification-analytics', {
        body: { user_id: userId, days },
      });

      if (response.error) {
        console.error('Failed to get notification analytics:', response.error);
        return null;
      }

      return response.data as NotificationAnalytics;
    } catch (error) {
      console.error('❌ Failed to get notification analytics:', error);
      return null;
    }
  }

  /**
   * Get user's notification settings
   */
  static async getNotificationSettings(): Promise<NotificationSettings | null> {
    try {
      const userId = await StorageService.getItem(this.STORAGE_KEYS.USER_ID);
      if (!userId) return null;

      const response = await supabaseClient.functions.invoke('get-notification-settings', {
        body: { user_id: userId },
      });

      if (response.error) {
        console.error('Failed to get notification settings:', response.error);
        return null;
      }

      return response.data as NotificationSettings;
    } catch (error) {
      console.error('❌ Failed to get notification settings:', error);
      return null;
    }
  }

  /**
   * Update user's notification settings
   */
  static async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<boolean> {
    try {
      const userId = await StorageService.getItem(this.STORAGE_KEYS.USER_ID);
      if (!userId) return false;

      const response = await supabaseClient.functions.invoke('update-notification-settings', {
        body: { user_id: userId, settings },
      });

      if (response.error) {
        console.error('Failed to update notification settings:', response.error);
        return false;
      }

      console.log('✅ Notification settings updated');
      return true;
    } catch (error) {
      console.error('❌ Failed to update notification settings:', error);
      return false;
    }
  }

  /**
   * Get scheduled notifications
   */
  static async getScheduledNotifications(): Promise<any[]> {
    try {
      const userId = await StorageService.getItem(this.STORAGE_KEYS.USER_ID);
      if (!userId) return [];

      const response = await supabaseClient.functions.invoke('get-scheduled-notifications', {
        body: { user_id: userId },
      });

      if (response.error) {
        console.error('Failed to get scheduled notifications:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('❌ Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Cancel a scheduled notification
   */
  static async cancelScheduledNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await supabaseClient.functions.invoke('cancel-scheduled-notification', {
        body: { notification_id: notificationId },
      });

      if (response.error) {
        console.error('Failed to cancel scheduled notification:', response.error);
        return false;
      }

      console.log(`🗑️ Cancelled scheduled notification: ${notificationId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to cancel scheduled notification:', error);
      return false;
    }
  }

  /**
   * Schedule daily motivation notifications
   */
  static async scheduleDailyMotivation(): Promise<boolean> {
    try {
      const userId = await StorageService.getItem(this.STORAGE_KEYS.USER_ID);
      if (!userId) return false;

      // Get user's timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const response = await supabaseClient.functions.invoke('schedule-daily-motivation', {
        body: {
          timezone_data: {
            [timezone]: [userId],
          },
        },
      });

      if (response.error) {
        console.error('Failed to schedule daily motivation:', response.error);
        return false;
      }

      console.log('✅ Daily motivation notifications scheduled');
      return true;
    } catch (error) {
      console.error('❌ Failed to schedule daily motivation:', error);
      return false;
    }
  }

  /**
   * Setup notification listeners
   */
  private static setupNotificationListeners(): void {
    // Listen for notifications received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received in foreground:', notification);
      
      // Track notification receipt
      this.trackNotificationInteraction('received', notification);
    });

    // Listen for user interactions with notifications
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 User interacted with notification:', response);
      
      // Track notification interaction
      this.trackNotificationInteraction('clicked', response.notification);
      
      // Handle notification response
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle notification tap/interaction
   */
  private static handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data as NotificationData & { action?: string };
    
    console.log('🎯 Handling notification response:', data);

    // Here you would navigate to appropriate screens based on the action
    // This would be connected to your navigation system
    switch (data.action) {
      case 'open_task':
        // Navigate to task detail
        console.log('Navigate to task:', data.taskId);
        break;
      case 'mark_complete':
        // Open task completion modal
        console.log('Mark task complete:', data.taskId);
        break;
      case 'open_calendar':
        // Navigate to calendar
        console.log('Navigate to calendar');
        break;
      case 'open_dashboard':
        // Navigate to dashboard
        console.log('Navigate to dashboard');
        break;
      default:
        console.log('Unknown notification action:', data.action);
    }
  }

  /**
   * Track notification interaction for analytics
   */
  private static async trackNotificationInteraction(
    type: 'received' | 'clicked',
    notification: Notifications.Notification
  ): Promise<void> {
    try {
      const userId = await StorageService.getItem(this.STORAGE_KEYS.USER_ID);
      if (!userId) return;

      // Track interaction with backend for analytics
      await supabaseClient.from('notification_logs').update({
        delivered_at: new Date().toISOString(),
        delivery_status: type === 'clicked' ? 'delivered' : 'sent',
      }).eq('user_id', userId)
        .eq('title', notification.request.content.title)
        .is('delivered_at', null);

    } catch (error) {
      console.error('❌ Failed to track notification interaction:', error);
    }
  }

  /**
   * Get notification badge count
   */
  static async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('❌ Failed to get badge count:', error);
      return 0;
    }
  }

  /**
   * Set notification badge count
   */
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('❌ Failed to set badge count:', error);
    }
  }

  /**
   * Clear notification badge
   */
  static async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('❌ Failed to clear badge:', error);
    }
  }

  /**
   * Set user ID for backend integration
   */
  static async setUserId(userId: string): Promise<void> {
    await StorageService.setItem(this.STORAGE_KEYS.USER_ID, userId);
    
    // Re-register device token with new user ID
    if (this.deviceToken) {
      await this.registerForPushNotifications();
    }
  }

  /**
   * Clear user data on logout
   */
  static async clearUserData(): Promise<void> {
    await StorageService.removeItem(this.STORAGE_KEYS.USER_ID);
    await StorageService.removeItem(this.STORAGE_KEYS.DEVICE_TOKEN);
    this.deviceToken = null;
  }
}

// For backward compatibility
export const NotificationService = AdvancedNotificationService; 