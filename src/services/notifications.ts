import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { StorageService } from './storage';
import { Task, NotificationData } from '../types';

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

export class NotificationService {
  private static readonly STORAGE_KEYS = {
    PERMISSION_GRANTED: 'notification_permission_granted',
    SCHEDULED_NOTIFICATIONS: 'scheduled_notifications',
    NOTIFICATION_SETTINGS: 'notification_settings',
  };

  /**
   * Initialize the notification service
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🔔 Notification service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
    }
  }

  /**
   * Request notification permissions from the user
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
   * Schedule a task reminder notification
   */
  static async scheduleTaskReminder(task: Task): Promise<string | null> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) {
        console.warn('⚠️ No notification permission, cannot schedule reminder');
        return null;
      }

      const scheduledTime = new Date(task.scheduledTime);
      const now = new Date();

      if (scheduledTime <= now) {
        console.warn('⚠️ Cannot schedule notification for past time');
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Task Reminder',
          body: `Time for: ${task.title}`,
          data: {
            taskId: task.id,
            type: 'reminder',
            action: 'open_task',
          },
          sound: 'default',
        },
        trigger: null, // Immediate notification for now
      });

      console.log(`🔔 Scheduled reminder for task "${task.title}"`);
      return notificationId;
    } catch (error) {
      console.error('❌ Failed to schedule task reminder:', error);
      return null;
    }
  }

  /**
   * Schedule a follow-up notification
   */
  static async scheduleFollowUpNotification(task: Task, delayMinutes: number = 15): Promise<string | null> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) {
        console.warn('⚠️ No notification permission, cannot schedule follow-up');
        return null;
      }

      const scheduledTime = new Date();
      scheduledTime.setMinutes(scheduledTime.getMinutes() + delayMinutes);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔄 Follow-up Reminder',
          body: `Did you complete: ${task.title}?`,
          data: {
            taskId: task.id,
            type: 'follow-up',
            action: 'mark_complete',
          } as NotificationData,
          sound: 'default',
        },
        trigger: null, // TODO: Implement proper date scheduling
      });

      await this.storeScheduledNotification({
        id: notificationId,
        taskId: task.id,
        type: 'follow-up',
        scheduledTime,
        title: '🔄 Follow-up Reminder',
        body: `Did you complete: ${task.title}?`,
        data: { taskId: task.id, type: 'follow-up' },
      });

      console.log(`🔄 Scheduled follow-up for task "${task.title}" in ${delayMinutes} minutes`);
      return notificationId;
    } catch (error) {
      console.error('❌ Failed to schedule follow-up notification:', error);
      return null;
    }
  }

  /**
   * Send streak break notification
   */
  static async sendStreakBreakNotification(streakCount: number): Promise<void> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💔 Streak Broken',
          body: `Your ${streakCount}-day streak has ended. Don't give up - start fresh tomorrow!`,
          data: {
            type: 'streak-break',
            action: 'open_calendar',
            streakCount,
          },
          sound: 'default',
        },
        trigger: null,
      });

      console.log(`💔 Sent streak break notification (${streakCount} days)`);
    } catch (error) {
      console.error('❌ Failed to send streak break notification:', error);
    }
  }

  /**
   * Send daily motivation notification
   */
  static async sendMotivationNotification(): Promise<void> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) return;

      const motivationalMessages = [
        'Ready to crush your goals today? 💪',
        'Your future self will thank you! 🌟',
        'Small steps lead to big changes 🚀',
        'Consistency is the key to success 🔑',
        'Make today count! ✨',
        'You\'ve got this! 💪',
        'Every task completed is progress 📈',
      ];

      const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌅 Good Morning!',
          body: randomMessage,
          data: {
            type: 'motivation',
            action: 'open_dashboard',
          },
          sound: 'default',
        },
        trigger: null, // Send immediately
      });

      console.log('🌅 Sent daily motivation notification');
    } catch (error) {
      console.error('❌ Failed to send motivation notification:', error);
    }
  }

  /**
   * Schedule daily motivation notifications
   */
  static async scheduleDailyMotivation(hour: number = 8, minute: number = 0): Promise<void> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) return;

      // Cancel existing daily notifications
      await this.cancelNotificationsByType('motivation');

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌅 Good Morning!',
          body: 'Ready to make today amazing? Check your tasks!',
          data: {
            type: 'motivation',
            action: 'open_dashboard',
          },
          sound: 'default',
        },
        trigger: null, // TODO: Implement proper calendar scheduling
      });

      console.log(`🌅 Scheduled daily motivation at ${hour}:${minute.toString().padStart(2, '0')}`);
    } catch (error) {
      console.error('❌ Failed to schedule daily motivation:', error);
    }
  }

  /**
   * Send offline fallback notification
   */
  static async sendOfflineFallbackNotification(task: Task): Promise<void> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📱 Offline Reminder',
          body: `Time for: ${task.title} (Offline mode)`,
          data: {
            taskId: task.id,
            type: 'reminder',
            action: 'mark_complete',
            offline: true,
          } as NotificationData,
          sound: 'default',
        },
        trigger: null,
      });

      console.log(`📱 Sent offline fallback notification for task "${task.title}"`);
    } catch (error) {
      console.error('❌ Failed to send offline fallback notification:', error);
    }
  }

  /**
   * Cancel a specific notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await this.removeScheduledNotification(notificationId);
      console.log(`🗑️ Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error('❌ Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel all notifications for a specific task
   */
  static async cancelTaskNotifications(taskId: string): Promise<void> {
    try {
      // For now, we'll cancel all scheduled notifications
      // In a real implementation, you'd track notification IDs per task
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log(`🗑️ Cancelled notifications for task: ${taskId}`);
    } catch (error) {
      console.error('❌ Failed to cancel task notifications:', error);
    }
  }

  /**
   * Cancel notifications by type
   */
  static async cancelNotificationsByType(type: ScheduledNotification['type']): Promise<void> {
    try {
      const scheduledNotifications = await this.getScheduledNotifications();
      const typeNotifications = scheduledNotifications.filter(n => n.type === type);

      for (const notification of typeNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.id);
        await this.removeScheduledNotification(notification.id);
      }

      console.log(`🗑️ Cancelled ${typeNotifications.length} notifications of type: ${type}`);
    } catch (error) {
      console.error('❌ Failed to cancel notifications by type:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await StorageService.removeItem(this.STORAGE_KEYS.SCHEDULED_NOTIFICATIONS);
      console.log('🗑️ Cancelled all notifications');
    } catch (error) {
      console.error('❌ Failed to cancel all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  static async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    try {
      const stored = await StorageService.getObject<ScheduledNotification[]>(
        this.STORAGE_KEYS.SCHEDULED_NOTIFICATIONS
      );
      return stored || [];
    } catch (error) {
      console.error('❌ Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Store scheduled notification info
   */
  private static async storeScheduledNotification(notification: ScheduledNotification): Promise<void> {
    try {
      const existing = await this.getScheduledNotifications();
      const updated = [...existing, notification];
      await StorageService.setObject(this.STORAGE_KEYS.SCHEDULED_NOTIFICATIONS, updated);
    } catch (error) {
      console.error('❌ Failed to store scheduled notification:', error);
    }
  }

  /**
   * Remove scheduled notification info
   */
  private static async removeScheduledNotification(notificationId: string): Promise<void> {
    try {
      const existing = await this.getScheduledNotifications();
      const updated = existing.filter(n => n.id !== notificationId);
      await StorageService.setObject(this.STORAGE_KEYS.SCHEDULED_NOTIFICATIONS, updated);
    } catch (error) {
      console.error('❌ Failed to remove scheduled notification:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  private static setupNotificationListeners(): void {
    // Listen for notifications received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received in foreground:', notification);
    });

    // Listen for user interactions with notifications
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 User interacted with notification:', response);
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
} 