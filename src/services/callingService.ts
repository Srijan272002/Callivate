import { StorageService } from './storage';
import { supabase } from './supabase';

export interface CallScheduleRequest {
  taskId: string;
  taskTitle: string;
  userPhone: string;
  preferredTime?: Date;
  voiceId?: string;
  isSilentMode?: boolean;
}

export interface CallResult {
  success: boolean;
  callId?: string;
  callSid?: string;
  message: string;
  scheduledTime?: string;
  error?: string;
  fallback?: {
    method: string;
    message: string;
    userCost: number;
  };
  costInfo?: {
    estimatedCost: number;
    userCost: number;
    costCoveredBy: string;
  };
}

export interface CallStatus {
  callId: string;
  callSid?: string;
  databaseStatus: {
    status: string;
    taskTitle: string;
    scheduledTime?: string;
    taskCompleted?: boolean;
    userResponse?: string;
    aiConfidence?: number;
    createdAt: string;
  };
  twilioStatus?: any;
  aiAnalysis: {
    scriptGenerated: boolean;
    responseProcessed: boolean;
    confidenceScore: number;
  };
}

export class CallingService {
  private static readonly STORAGE_KEYS = {
    USER_PHONE: 'user_phone_number',
    CALLING_ENABLED: 'calling_feature_enabled',
    CALL_HISTORY: 'call_history_cache',
  };

  /**
   * Schedule an AI voice call for task reminder
   */
  static async scheduleTaskCall(
    task: { id: string; title: string; scheduledTime: string },
    userPhone: string,
    voiceId?: string
  ): Promise<CallResult> {
    try {
      // Check if calling is enabled
      const callingEnabled = await this.isCallingEnabled();
      if (!callingEnabled) {
        return {
          success: false,
          message: 'Calling feature is disabled',
          error: 'Calling disabled',
          fallback: {
            method: 'push_notification',
            message: 'Will send push notification instead',
            userCost: 0.0
          }
        };
      }

      // Validate phone number format
      const formattedPhone = this.formatPhoneNumber(userPhone);
      if (!formattedPhone) {
        return {
          success: false,
          message: 'Invalid phone number format',
          error: 'Invalid phone number',
          fallback: {
            method: 'push_notification',
            message: 'Please update your phone number in settings',
            userCost: 0.0
          }
        };
      }

      // Schedule call via backend API
      const { data, error } = await supabase.functions.invoke('schedule-call', {
        body: {
          task_id: task.id,
          task_title: task.title,
          user_phone: formattedPhone,
          preferred_time: task.scheduledTime,
          voice_id: voiceId
        }
      });

      if (error) {
        console.error('Failed to schedule call:', error);
        return {
          success: false,
          message: 'Failed to schedule call',
          error: error.message,
          fallback: {
            method: 'push_notification',
            message: 'Will send push notification instead',
            userCost: 0.0
          }
        };
      }

      // Cache call information locally
      await this.cacheCallInfo(task.id, data.call_data);

      return {
        success: true,
        callId: data.call_data?.call_id,
        callSid: data.call_data?.call_sid,
        message: data.message || 'Call scheduled successfully',
        scheduledTime: data.call_data?.scheduled_time,
        costInfo: {
          estimatedCost: data.cost_info?.estimated_cost || 0.0085,
          userCost: 0.0,
          costCoveredBy: 'Callivate - completely free for users!'
        }
      };

    } catch (error) {
      console.error('Error scheduling call:', error);
      return {
        success: false,
        message: 'Unexpected error scheduling call',
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: {
          method: 'push_notification',
          message: 'Will send push notification instead',
          userCost: 0.0
        }
      };
    }
  }

  /**
   * Check the status of a scheduled call
   */
  static async getCallStatus(callId: string): Promise<CallStatus | null> {
    try {
      const { data, error } = await supabase.functions.invoke('get-call-status', {
        body: { call_id: callId }
      });

      if (error) {
        console.error('Failed to get call status:', error);
        return null;
      }

      return {
        callId: data.call_id,
        callSid: data.call_sid,
        databaseStatus: data.database_status,
        twilioStatus: data.twilio_status,
        aiAnalysis: data.ai_analysis
      };

    } catch (error) {
      console.error('Error getting call status:', error);
      return null;
    }
  }

  /**
   * Get call history for the user
   */
  static async getCallHistory(days: number = 30): Promise<any[]> {
    try {
      const { data, error } = await supabase.functions.invoke('get-call-analytics', {
        body: { days }
      });

      if (error) {
        console.error('Failed to get call history:', error);
        return [];
      }

      return data.call_history || [];

    } catch (error) {
      console.error('Error getting call history:', error);
      return [];
    }
  }

  /**
   * Enable or disable calling feature for user
   */
  static async setCallingEnabled(enabled: boolean): Promise<void> {
    try {
      await StorageService.setItem(this.STORAGE_KEYS.CALLING_ENABLED, enabled.toString());
      console.log(`🔔 Calling feature ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error setting calling enabled status:', error);
    }
  }

  /**
   * Check if calling feature is enabled
   */
  static async isCallingEnabled(): Promise<boolean> {
    try {
      const enabled = await StorageService.getItem(this.STORAGE_KEYS.CALLING_ENABLED);
      return enabled === 'true' || enabled === null; // Default to enabled
    } catch (error) {
      console.error('Error checking calling enabled status:', error);
      return true; // Default to enabled on error
    }
  }

  /**
   * Save user's phone number
   */
  static async saveUserPhone(phoneNumber: string): Promise<void> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (formattedPhone) {
        await StorageService.setItem(this.STORAGE_KEYS.USER_PHONE, formattedPhone);
        console.log('📞 User phone number saved');
      } else {
        throw new Error('Invalid phone number format');
      }
    } catch (error) {
      console.error('Error saving user phone:', error);
      throw error;
    }
  }

  /**
   * Get user's saved phone number
   */
  static async getUserPhone(): Promise<string | null> {
    try {
      return await StorageService.getItem(this.STORAGE_KEYS.USER_PHONE);
    } catch (error) {
      console.error('Error getting user phone:', error);
      return null;
    }
  }

  /**
   * Remove user's phone number (for privacy)
   */
  static async removeUserPhone(): Promise<void> {
    try {
      await StorageService.removeItem(this.STORAGE_KEYS.USER_PHONE);
      console.log('📞 User phone number removed');
    } catch (error) {
      console.error('Error removing user phone:', error);
    }
  }

  /**
   * Test call functionality
   */
  static async testCall(userPhone: string): Promise<CallResult> {
    try {
      const testTask = {
        id: `test_${Date.now()}`,
        title: 'Test Call - Please answer and say hello!',
        scheduledTime: new Date().toISOString()
      };

      return await this.scheduleTaskCall(testTask, userPhone);

    } catch (error) {
      console.error('Error testing call:', error);
      return {
        success: false,
        message: 'Failed to test call',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Format phone number to E.164 format
   */
  private static formatPhoneNumber(phoneNumber: string): string | null {
    try {
      // Remove all non-digit characters
      const digits = phoneNumber.replace(/\D/g, '');
      
      // If it starts with 1 and has 11 digits, it's likely US/Canada
      if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`;
      }
      
      // If it has 10 digits, assume US/Canada and add +1
      if (digits.length === 10) {
        return `+1${digits}`;
      }
      
      // If it already starts with +, return as is
      if (phoneNumber.startsWith('+')) {
        return phoneNumber;
      }
      
      // For other formats, add + if not present
      if (digits.length >= 10) {
        return `+${digits}`;
      }
      
      return null; // Invalid format
    } catch (error) {
      console.error('Error formatting phone number:', error);
      return null;
    }
  }

  /**
   * Cache call information locally for offline access
   */
  private static async cacheCallInfo(taskId: string, callData: any): Promise<void> {
    try {
      const cached = await StorageService.getItem(this.STORAGE_KEYS.CALL_HISTORY);
      const callHistory = cached ? JSON.parse(cached) : {};
      
      callHistory[taskId] = {
        ...callData,
        cachedAt: new Date().toISOString()
      };
      
      // Keep only last 50 calls to manage storage
      const entries = Object.entries(callHistory);
      if (entries.length > 50) {
        const sorted = entries.sort((a: any, b: any) => 
          new Date(b[1].cachedAt).getTime() - new Date(a[1].cachedAt).getTime()
        );
        const trimmed = Object.fromEntries(sorted.slice(0, 50));
        await StorageService.setItem(this.STORAGE_KEYS.CALL_HISTORY, JSON.stringify(trimmed));
      } else {
        await StorageService.setItem(this.STORAGE_KEYS.CALL_HISTORY, JSON.stringify(callHistory));
      }
    } catch (error) {
      console.error('Error caching call info:', error);
    }
  }

  /**
   * Get system status for calling service
   */
  static async getSystemStatus(): Promise<{ available: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('get-system-status');

      if (error) {
        return {
          available: false,
          message: 'Unable to connect to calling service'
        };
      }

      return {
        available: data.twilio_available && data.ai_service_available,
        message: data.status_message || 'Calling service operational'
      };

    } catch (error) {
      console.error('Error getting system status:', error);
      return {
        available: false,
        message: 'Error checking system status'
      };
    }
  }
} 