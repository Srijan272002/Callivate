import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeEvent, realtimeService } from '../services/realtimeService';
import { Streak, Task } from '../types';
import { useAuth } from './useAuth';

export interface RealtimeStatus {
  isConnected: boolean;
  activeChannels: number;
  lastActivity: Date | null;
}

export interface TaskUpdates {
  tasks: Task[];
  lastUpdated: Date | null;
  isLoading: boolean;
}

export interface StreakUpdates {
  currentStreak: number;
  longestStreak: number;
  lastUpdated: Date | null;
}

export interface CallStatus {
  callId?: string;
  status: 'idle' | 'scheduled' | 'in_progress' | 'completed' | 'failed';
  taskId?: string;
  transcription?: string;
  completionConfidence?: number;
  lastUpdated: Date | null;
}

export interface RealtimeHookReturn {
  // Connection status
  realtimeStatus: RealtimeStatus;
  
  // Task management
  taskUpdates: TaskUpdates;
  subscribeToTasks: () => () => void;
  
  // Streak tracking
  streakUpdates: StreakUpdates;
  subscribeToStreaks: () => () => void;
  
  // Call status tracking
  callStatus: CallStatus;
  subscribeToCallStatus: (taskId: string) => () => void;
  
  // General controls
  initialize: () => Promise<void>;
  cleanup: () => void;
  reconnect: () => Promise<void>;
}

export const useRealtime = (): RealtimeHookReturn => {
  const { user, isAuthenticated } = useAuth();
  
  // Realtime status
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>({
    isConnected: false,
    activeChannels: 0,
    lastActivity: null,
  });

  // Task updates
  const [taskUpdates, setTaskUpdates] = useState<TaskUpdates>({
    tasks: [],
    lastUpdated: null,
    isLoading: false,
  });

  // Streak updates
  const [streakUpdates, setStreakUpdates] = useState<StreakUpdates>({
    currentStreak: 0,
    longestStreak: 0,
    lastUpdated: null,
  });

  // Call status
  const [callStatus, setCallStatus] = useState<CallStatus>({
    status: 'idle',
    lastUpdated: null,
  });

  // Track active subscriptions
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());

  // Update realtime status
  const updateRealtimeStatus = useCallback(() => {
    setRealtimeStatus({
      isConnected: realtimeService.isRealtimeConnected(),
      activeChannels: realtimeService.getActiveChannelsCount(),
      lastActivity: new Date(),
    });
  }, []);

  // Initialize realtime service
  const initialize = useCallback(async () => {
    if (!isAuthenticated) {
      console.warn('⚠️ Cannot initialize realtime: user not authenticated');
      return;
    }

    try {
      console.log('🔄 Initializing realtime hooks...');
      await realtimeService.initialize();
      updateRealtimeStatus();
      console.log('✅ Realtime hooks initialized');
    } catch (error) {
      console.error('❌ Failed to initialize realtime hooks:', error);
    }
  }, [isAuthenticated, updateRealtimeStatus]);

  // Task subscription handler
  const handleTaskEvent = useCallback((event: RealtimeEvent<Task>) => {
    console.log('🔄 Task event received:', event);
    
    setTaskUpdates(prev => {
      const newTasks = [...prev.tasks];
      
      switch (event.eventType) {
        case 'INSERT':
          if (event.new) {
            newTasks.push(event.new);
          }
          break;
          
        case 'UPDATE':
          if (event.new) {
            const index = newTasks.findIndex(t => t.id === event.new?.id);
            if (index !== -1) {
              newTasks[index] = event.new;
            }
          }
          break;
          
        case 'DELETE':
          if (event.old) {
            const index = newTasks.findIndex(t => t.id === event.old?.id);
            if (index !== -1) {
              newTasks.splice(index, 1);
            }
          }
          break;
      }
      
      return {
        tasks: newTasks,
        lastUpdated: new Date(),
        isLoading: false,
      };
    });
    
    updateRealtimeStatus();
  }, [updateRealtimeStatus]);

  // Streak subscription handler
  const handleStreakEvent = useCallback((event: RealtimeEvent<Streak>) => {
    console.log('🔥 Streak event received:', event);
    
    if (event.new) {
      setStreakUpdates({
        currentStreak: event.new.currentStreak,
        longestStreak: event.new.longestStreak,
        lastUpdated: new Date(),
      });
    }
    
    updateRealtimeStatus();
  }, [updateRealtimeStatus]);

  // Call status subscription handler
  const handleCallEvent = useCallback((event: RealtimeEvent) => {
    console.log('📞 Call event received:', event);
    
    if (event.new) {
      setCallStatus({
        callId: event.new.id,
        status: event.new.status || 'idle',
        taskId: event.new.task_id,
        transcription: event.new.transcription,
        completionConfidence: event.new.completion_confidence,
        lastUpdated: new Date(),
      });
    }
    
    updateRealtimeStatus();
  }, [updateRealtimeStatus]);

  // Subscribe to task updates
  const subscribeToTasks = useCallback(() => {
    const subscriptionKey = 'tasks';
    
    // Unsubscribe if already subscribed
    const existingUnsubscribe = subscriptionsRef.current.get(subscriptionKey);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    console.log('📡 Setting up task subscription...');
    setTaskUpdates(prev => ({ ...prev, isLoading: true }));
    
    const unsubscribe = realtimeService.subscribeToTasks(handleTaskEvent);
    subscriptionsRef.current.set(subscriptionKey, unsubscribe);
    
    updateRealtimeStatus();
    
    return () => {
      unsubscribe();
      subscriptionsRef.current.delete(subscriptionKey);
      updateRealtimeStatus();
    };
  }, [handleTaskEvent, updateRealtimeStatus]);

  // Subscribe to streak updates
  const subscribeToStreaks = useCallback(() => {
    const subscriptionKey = 'streaks';
    
    // Unsubscribe if already subscribed
    const existingUnsubscribe = subscriptionsRef.current.get(subscriptionKey);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    console.log('🔥 Setting up streak subscription...');
    
    const unsubscribe = realtimeService.subscribeToStreaks(handleStreakEvent);
    subscriptionsRef.current.set(subscriptionKey, unsubscribe);
    
    updateRealtimeStatus();
    
    return () => {
      unsubscribe();
      subscriptionsRef.current.delete(subscriptionKey);
      updateRealtimeStatus();
    };
  }, [handleStreakEvent, updateRealtimeStatus]);

  // Subscribe to call status for specific task
  const subscribeToCallStatus = useCallback((taskId: string) => {
    const subscriptionKey = `call-${taskId}`;
    
    // Unsubscribe if already subscribed
    const existingUnsubscribe = subscriptionsRef.current.get(subscriptionKey);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    console.log(`📞 Setting up call subscription for task: ${taskId}`);
    
    const unsubscribe = realtimeService.subscribeToCallStatus(taskId, handleCallEvent);
    subscriptionsRef.current.set(subscriptionKey, unsubscribe);
    
    updateRealtimeStatus();
    
    return () => {
      unsubscribe();
      subscriptionsRef.current.delete(subscriptionKey);
      updateRealtimeStatus();
    };
  }, [handleCallEvent, updateRealtimeStatus]);

  // Reconnect to realtime service
  const reconnect = useCallback(async () => {
    try {
      console.log('🔄 Reconnecting realtime service...');
      await realtimeService.reconnect();
      updateRealtimeStatus();
      console.log('✅ Realtime service reconnected');
    } catch (error) {
      console.error('❌ Failed to reconnect realtime service:', error);
    }
  }, [updateRealtimeStatus]);

  // Cleanup all subscriptions
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up realtime subscriptions...');
    
    // Unsubscribe from all active subscriptions
    for (const [key, unsubscribe] of subscriptionsRef.current) {
      try {
        unsubscribe();
      } catch (error) {
        console.error(`❌ Failed to unsubscribe from ${key}:`, error);
      }
    }
    
    subscriptionsRef.current.clear();
    realtimeService.cleanup();
    
    // Reset state
    setRealtimeStatus({
      isConnected: false,
      activeChannels: 0,
      lastActivity: null,
    });
    
    setTaskUpdates({
      tasks: [],
      lastUpdated: null,
      isLoading: false,
    });
    
    setStreakUpdates({
      currentStreak: 0,
      longestStreak: 0,
      lastUpdated: null,
    });
    
    setCallStatus({
      status: 'idle',
      lastUpdated: null,
    });
    
    console.log('✅ Realtime cleanup complete');
  }, []);

  // Initialize on user authentication
  useEffect(() => {
    if (isAuthenticated && user) {
      initialize();
    } else {
      cleanup();
    }
  }, [isAuthenticated, user, initialize, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    realtimeStatus,
    taskUpdates,
    subscribeToTasks,
    streakUpdates,
    subscribeToStreaks,
    callStatus,
    subscribeToCallStatus,
    initialize,
    cleanup,
    reconnect,
  };
}; 