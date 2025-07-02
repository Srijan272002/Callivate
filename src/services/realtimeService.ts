import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Streak, Task } from '../types';
import { supabase } from './supabase';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeEvent<T = any> {
  eventType: RealtimeEventType;
  table: string;
  old?: T;
  new?: T;
  errors?: string[];
}

export interface TaskEvent extends RealtimeEvent<Task> {
  table: 'tasks';
}

export interface StreakEvent extends RealtimeEvent<Streak> {
  table: 'streaks';
}

export interface CallEvent extends RealtimeEvent {
  table: 'calls';
  data: {
    id: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
    task_id?: string;
    transcription?: string;
    completion_confidence?: number;
  };
}

export type RealtimeCallback<T = any> = (event: RealtimeEvent<T>) => void;

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  /**
   * Initialize real-time service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing Realtime Service...');
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('⚠️ User not authenticated, real-time features disabled');
        return;
      }

      // Cache user ID for subscriptions
      await this.cacheCurrentUserId();

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ Realtime Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Realtime Service:', error);
      throw error;
    }
  }

  /**
   * Subscribe to task changes for current user
   */
  subscribeToTasks(callback: RealtimeCallback<Task>): () => void {
    const channelName = 'tasks-changes';
    
    try {
      console.log('📡 Subscribing to task changes...');
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `user_id=eq.${this.getCurrentUserId()}`,
          },
          (payload: RealtimePostgresChangesPayload<Task>) => {
            console.log('🔔 Task change received:', payload);
            
            const event: TaskEvent = {
              eventType: payload.eventType as RealtimeEventType,
              table: 'tasks',
              old: payload.old as Task,
              new: payload.new as Task,
              errors: payload.errors,
            };
            
            callback(event);
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
      console.log('✅ Subscribed to task changes');

      // Return unsubscribe function
      return () => this.unsubscribe(channelName);
    } catch (error) {
      console.error('❌ Failed to subscribe to task changes:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to streak updates for current user
   */
  subscribeToStreaks(callback: RealtimeCallback<Streak>): () => void {
    const channelName = 'streaks-changes';
    
    try {
      console.log('📡 Subscribing to streak changes...');
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'streaks',
            filter: `user_id=eq.${this.getCurrentUserId()}`,
          },
          (payload: RealtimePostgresChangesPayload<Streak>) => {
            console.log('🔥 Streak change received:', payload);
            
            const event: StreakEvent = {
              eventType: payload.eventType as RealtimeEventType,
              table: 'streaks',
              old: payload.old as Streak,
              new: payload.new as Streak,
              errors: payload.errors,
            };
            
            callback(event);
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
      console.log('✅ Subscribed to streak changes');

      return () => this.unsubscribe(channelName);
    } catch (error) {
      console.error('❌ Failed to subscribe to streak changes:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to AI voice call status updates
   */
  subscribeToCallStatus(taskId: string, callback: RealtimeCallback): () => void {
    const channelName = `call-status-${taskId}`;
    
    try {
      console.log(`📞 Subscribing to call status for task: ${taskId}`);
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'calls',
            filter: `task_id=eq.${taskId}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('📞 Call status change received:', payload);
            
            const event: CallEvent = {
              eventType: payload.eventType as RealtimeEventType,
              table: 'calls',
              old: payload.old,
              new: payload.new,
              data: payload.new || payload.old,
              errors: payload.errors,
            };
            
            callback(event);
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
      console.log('✅ Subscribed to call status changes');

      return () => this.unsubscribe(channelName);
    } catch (error) {
      console.error('❌ Failed to subscribe to call status:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(callback: RealtimeCallback): () => void {
    const channelName = 'notifications-changes';
    
    try {
      console.log('🔔 Subscribing to notification changes...');
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${this.getCurrentUserId()}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('🔔 New notification received:', payload);
            
            const event: RealtimeEvent = {
              eventType: 'INSERT',
              table: 'notifications',
              new: payload.new,
              errors: payload.errors,
            };
            
            callback(event);
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
      console.log('✅ Subscribed to notification changes');

      return () => this.unsubscribe(channelName);
    } catch (error) {
      console.error('❌ Failed to subscribe to notifications:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to sync status updates
   */
  subscribeToSyncStatus(callback: RealtimeCallback): () => void {
    const channelName = 'sync-status';
    
    try {
      console.log('🔄 Subscribing to sync status...');
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sync_queue',
            filter: `user_id=eq.${this.getCurrentUserId()}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('🔄 Sync status change received:', payload);
            
            const event: RealtimeEvent = {
              eventType: payload.eventType as RealtimeEventType,
              table: 'sync_queue',
              old: payload.old,
              new: payload.new,
              errors: payload.errors,
            };
            
            callback(event);
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
      console.log('✅ Subscribed to sync status changes');

      return () => this.unsubscribe(channelName);
    } catch (error) {
      console.error('❌ Failed to subscribe to sync status:', error);
      return () => {};
    }
  }

  /**
   * Unsubscribe from a specific channel
   */
  private unsubscribe(channelName: string): void {
    try {
      const channel = this.channels.get(channelName);
      if (channel) {
        channel.unsubscribe();
        this.channels.delete(channelName);
        console.log(`🔇 Unsubscribed from ${channelName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to unsubscribe from ${channelName}:`, error);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    try {
      console.log('🔇 Unsubscribing from all real-time channels...');
      
      for (const [channelName, channel] of this.channels) {
        channel.unsubscribe();
      }
      
      this.channels.clear();
      this.isConnected = false;
      console.log('✅ Unsubscribed from all channels');
    } catch (error) {
      console.error('❌ Failed to unsubscribe from all channels:', error);
    }
  }

  /**
   * Get current user ID from session (cached from initialization)
   */
  private currentUserId: string | null = null;

  private async cacheCurrentUserId(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      this.currentUserId = user?.id || null;
    } catch (error) {
      console.error('Failed to get current user ID:', error);
      this.currentUserId = null;
    }
  }

  private getCurrentUserId(): string {
    return this.currentUserId || 'unknown';
  }

  /**
   * Check connection status
   */
  isRealtimeConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get active channels count
   */
  getActiveChannelsCount(): number {
    return this.channels.size;
  }

  /**
   * Get list of active channel names
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Reconnect to all subscriptions
   */
  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    try {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      // Unsubscribe from all current channels
      this.unsubscribeAll();
      
      // Wait before reconnecting
      await new Promise(resolve => setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts));
      
      // Reinitialize
      await this.initialize();
      
      console.log('✅ Successfully reconnected to real-time service');
    } catch (error) {
      console.error('❌ Failed to reconnect:', error);
      
      // Exponential backoff for next attempt
      this.reconnectDelay *= 2;
      
      // Try again if we haven't reached max attempts
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.reconnect(), this.reconnectDelay);
      }
    }
  }

  /**
   * Cleanup when user signs out
   */
  cleanup(): void {
    console.log('🧹 Cleaning up real-time service...');
    this.unsubscribeAll();
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    console.log('✅ Real-time service cleanup complete');
  }
}

// Create singleton instance
export const realtimeService = new RealtimeService();

// Export for testing
export { RealtimeService };
export default realtimeService; 