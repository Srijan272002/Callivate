import { Task } from '../types';
import { CallingService } from './callingService';
import { NotificationService } from './notifications';
import { StorageService } from './storage';

export interface TaskExecutionResult {
  success: boolean;
  method: 'call' | 'notification' | 'silent';
  message: string;
  callId?: string;
  notificationId?: string;
  error?: string;
}

export interface UserProfile {
  id: string;
  phoneNumber?: string;
  callingEnabled: boolean;
  quietHours: {
    start: string; // "22:00"
    end: string;   // "07:00"
  };
  timezone: string;
}

export class TaskExecutionService {
  private static readonly STORAGE_KEYS = {
    USER_PROFILE: 'user_profile',
    EXECUTION_HISTORY: 'execution_history',
    RETRY_QUEUE: 'execution_retry_queue',
  };

  /**
   * Execute a scheduled task when timer expires
   */
  static async executeScheduledTask(task: Task): Promise<TaskExecutionResult> {
    try {
      console.log(`🔔 Executing scheduled task: ${task.title}`);

      // Get user profile for execution preferences
      const userProfile = await this.getUserProfile();
      
      // Check if task is in silent mode
      if (task.isSilentMode) {
        return {
          success: true,
          method: 'silent',
          message: 'Task scheduled in silent mode - no notification sent'
        };
      }

      // Check quiet hours
      if (this.isQuietHours(userProfile)) {
        console.log('⏰ Currently in quiet hours, scheduling for later');
        return await this.scheduleForLaterExecution(task, userProfile);
      }

      // Attempt phone call first if enabled and phone number available
      if (userProfile.callingEnabled && userProfile.phoneNumber) {
        console.log('📞 Attempting to schedule AI call for task');
        
        const callResult = await CallingService.scheduleTaskCall(
          {
            id: task.id,
            title: task.title,
            scheduledTime: task.scheduledTime
          },
          userProfile.phoneNumber,
          task.voiceId
        );

        if (callResult.success) {
          // Log successful call scheduling
          await this.logExecution(task.id, 'call', true, callResult.message);
          
          return {
            success: true,
            method: 'call',
            message: callResult.message,
            callId: callResult.callId
          };
        } else {
          console.log('📞 Call scheduling failed, falling back to notification');
          console.log('Reason:', callResult.error);
          
          // Log failed call attempt
          await this.logExecution(task.id, 'call', false, callResult.error || 'Unknown error');
        }
      }

      // Fallback to notification
      console.log('🔔 Sending push notification as fallback');
      
      try {
        await NotificationService.scheduleTaskReminder(task);
        
        await this.logExecution(task.id, 'notification', true, 'Notification scheduled successfully');
        
        return {
          success: true,
          method: 'notification',
          message: 'Push notification sent successfully'
        };
        
      } catch (notificationError) {
        console.error('❌ Both call and notification failed:', notificationError);
        
        await this.logExecution(task.id, 'notification', false, 
          notificationError instanceof Error ? notificationError.message : 'Unknown error');
        
        // Add to retry queue
        await this.addToRetryQueue(task);
        
        return {
          success: false,
          method: 'notification',
          message: 'Failed to send notification',
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error'
        };
      }

    } catch (error) {
      console.error('❌ Critical error in task execution:', error);
      
      await this.logExecution(task.id, 'notification', false, 
        error instanceof Error ? error.message : 'Critical execution error');
      
      return {
        success: false,
        method: 'notification',
        message: 'Critical error in task execution',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle call completion callback from backend
   */
  static async handleCallCompletion(
    taskId: string, 
    callResult: {
      completed: boolean;
      userResponse?: string;
      confidence?: number;
    }
  ): Promise<void> {
    try {
      console.log(`📞 Call completed for task ${taskId}:`, callResult);
      
      // Update task completion status based on call result
      if (callResult.completed) {
        // Mark task as completed
        await this.markTaskCompleted(taskId, 'call', callResult);
      } else {
        // Send follow-up notification
        await this.sendFollowUpNotification(taskId, callResult);
      }

      // Log the call completion
      await this.logExecution(taskId, 'call_completion', true, 
        `User response: ${callResult.userResponse || 'No response'}, Confidence: ${callResult.confidence || 0}`);

    } catch (error) {
      console.error('Error handling call completion:', error);
    }
  }

  /**
   * Get user profile for task execution
   */
  static async getUserProfile(): Promise<UserProfile> {
    try {
      const stored = await StorageService.getItem(this.STORAGE_KEYS.USER_PROFILE);
      
      if (stored) {
        return JSON.parse(stored);
      }

      // Default profile
      const defaultProfile: UserProfile = {
        id: 'current_user',
        callingEnabled: true,
        quietHours: {
          start: '22:00',
          end: '07:00'
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      await this.updateUserProfile(defaultProfile);
      return defaultProfile;

    } catch (error) {
      console.error('Error getting user profile:', error);
      
      // Return safe default
      return {
        id: 'current_user',
        callingEnabled: false, // Disable calling on error for safety
        quietHours: {
          start: '22:00',
          end: '07:00'
        },
        timezone: 'UTC'
      };
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(profile: Partial<UserProfile>): Promise<void> {
    try {
      const current = await this.getUserProfile();
      const updated = { ...current, ...profile };
      
      await StorageService.setItem(this.STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
      console.log('✅ User profile updated');
      
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private static isQuietHours(profile: UserProfile): boolean {
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: profile.timezone 
      });
      
      const { start, end } = profile.quietHours;
      
      // Handle overnight quiet hours (e.g., 22:00 to 07:00)
      if (start > end) {
        return currentTime >= start || currentTime <= end;
      } else {
        return currentTime >= start && currentTime <= end;
      }
      
    } catch (error) {
      console.error('Error checking quiet hours:', error);
      return false; // Default to not quiet hours on error
    }
  }

  /**
   * Schedule task for execution after quiet hours
   */
  private static async scheduleForLaterExecution(
    task: Task, 
    profile: UserProfile
  ): Promise<TaskExecutionResult> {
    try {
      // Calculate next execution time (after quiet hours end)
      const nextExecution = this.calculateNextExecutionTime(profile);
      
      // Schedule notification for after quiet hours
      const delayedTask = { 
        ...task, 
        scheduledTime: nextExecution.toISOString() 
      };
      
      await NotificationService.scheduleTaskReminder(delayedTask);
      
      await this.logExecution(task.id, 'delayed', true, 
        `Delayed due to quiet hours until ${nextExecution.toLocaleTimeString()}`);
      
      return {
        success: true,
        method: 'notification',
        message: `Scheduled for ${nextExecution.toLocaleTimeString()} (after quiet hours)`
      };
      
    } catch (error) {
      console.error('Error scheduling for later execution:', error);
      
      return {
        success: false,
        method: 'notification',
        message: 'Failed to schedule for later',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate next execution time after quiet hours
   */
  private static calculateNextExecutionTime(profile: UserProfile): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Set to end of quiet hours
    const [endHour, endMinute] = profile.quietHours.end.split(':').map(Number);
    
    const nextExecution = new Date(now);
    nextExecution.setHours(endHour, endMinute, 0, 0);
    
    // If end time is today but has passed, schedule for tomorrow
    if (nextExecution <= now) {
      nextExecution.setDate(nextExecution.getDate() + 1);
    }
    
    return nextExecution;
  }

  /**
   * Mark task as completed
   */
  private static async markTaskCompleted(
    taskId: string, 
    method: string, 
    result: any
  ): Promise<void> {
    try {
      // This would integrate with TaskService to mark completion
      console.log(`✅ Task ${taskId} marked as completed via ${method}`);
      
      // Could emit event or call TaskService.completeTask(taskId)
      // For now, just log the completion
      
    } catch (error) {
      console.error('Error marking task completed:', error);
    }
  }

  /**
   * Send follow-up notification when call indicates task not completed
   */
  private static async sendFollowUpNotification(
    taskId: string, 
    callResult: any
  ): Promise<void> {
    try {
      // Send a follow-up notification
      await NotificationService.sendOfflineFallbackNotification({ id: taskId } as Task);
      
      console.log(`🔔 Follow-up notification sent for incomplete task ${taskId}`);
      
    } catch (error) {
      console.error('Error sending follow-up notification:', error);
    }
  }

  /**
   * Log execution attempt
   */
  private static async logExecution(
    taskId: string,
    method: string,
    success: boolean,
    message: string
  ): Promise<void> {
    try {
      const log = {
        taskId,
        method,
        success,
        message,
        timestamp: new Date().toISOString()
      };

      const stored = await StorageService.getItem(this.STORAGE_KEYS.EXECUTION_HISTORY);
      const history = stored ? JSON.parse(stored) : [];
      
      history.unshift(log);
      
      // Keep only last 100 execution logs
      if (history.length > 100) {
        history.splice(100);
      }
      
      await StorageService.setItem(this.STORAGE_KEYS.EXECUTION_HISTORY, JSON.stringify(history));
      
    } catch (error) {
      console.error('Error logging execution:', error);
    }
  }

  /**
   * Add task to retry queue for failed executions
   */
  private static async addToRetryQueue(task: Task): Promise<void> {
    try {
      const stored = await StorageService.getItem(this.STORAGE_KEYS.RETRY_QUEUE);
      const queue = stored ? JSON.parse(stored) : [];
      
      queue.push({
        task,
        retryCount: 0,
        maxRetries: 3,
        nextRetry: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        addedAt: new Date().toISOString()
      });
      
      await StorageService.setItem(this.STORAGE_KEYS.RETRY_QUEUE, JSON.stringify(queue));
      
      console.log(`🔄 Added task ${task.id} to retry queue`);
      
    } catch (error) {
      console.error('Error adding to retry queue:', error);
    }
  }

  /**
   * Process retry queue for failed task executions
   */
  static async processRetryQueue(): Promise<void> {
    try {
      const stored = await StorageService.getItem(this.STORAGE_KEYS.RETRY_QUEUE);
      if (!stored) return;
      
      const queue = JSON.parse(stored);
      const now = new Date();
      const remaining = [];
      
      for (const item of queue) {
        if (new Date(item.nextRetry) <= now && item.retryCount < item.maxRetries) {
          console.log(`🔄 Retrying task execution: ${item.task.title}`);
          
          const result = await this.executeScheduledTask(item.task);
          
          if (!result.success) {
            // Increment retry count and schedule next retry
            item.retryCount++;
            item.nextRetry = new Date(Date.now() + Math.pow(2, item.retryCount) * 5 * 60 * 1000).toISOString();
            remaining.push(item);
          }
          // If successful, don't add back to queue
          
        } else if (item.retryCount < item.maxRetries) {
          // Not ready for retry yet
          remaining.push(item);
        }
        // If max retries exceeded, don't add back to queue (effectively removing it)
      }
      
      await StorageService.setItem(this.STORAGE_KEYS.RETRY_QUEUE, JSON.stringify(remaining));
      
    } catch (error) {
      console.error('Error processing retry queue:', error);
    }
  }

  /**
   * Get execution history for debugging/analytics
   */
  static async getExecutionHistory(limit: number = 50): Promise<any[]> {
    try {
      const stored = await StorageService.getItem(this.STORAGE_KEYS.EXECUTION_HISTORY);
      const history = stored ? JSON.parse(stored) : [];
      
      return history.slice(0, limit);
      
    } catch (error) {
      console.error('Error getting execution history:', error);
      return [];
    }
  }
} 