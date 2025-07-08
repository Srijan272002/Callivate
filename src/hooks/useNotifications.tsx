import { useCallback, useEffect, useState } from 'react';
import { NotificationService, OfflineService, TaskService } from '../services';
import { Task } from '../types';

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  loading: boolean;
}

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  type: string | null;
}

export interface SyncStatus {
  isLoading: boolean;
  lastSyncTime: string | null;
  queueCount: number;
}

export const useNotifications = () => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>({
    granted: false,
    canAskAgain: true,
    loading: true,
  });

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: false,
    isOffline: true,
    type: null,
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isLoading: false,
    lastSyncTime: null,
    queueCount: 0,
  });

  // Check permission status on mount
  useEffect(() => {
    const checkPermissionStatus = async () => {
      try {
        const hasPermission = await NotificationService.hasPermission();
        setPermissionStatus({
          granted: hasPermission,
          canAskAgain: !hasPermission,
          loading: false,
        });
      } catch (error) {
        console.error('Failed to check notification permission:', error);
        setPermissionStatus({
          granted: false,
          canAskAgain: true,
          loading: false,
        });
      }
    };

    checkPermissionStatus();
  }, []);

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      const status = OfflineService.getNetworkStatus();
      setNetworkStatus({
        isOnline: OfflineService.isOnline(),
        isOffline: OfflineService.isOffline(),
        type: status.type,
      });
    };

    // Update initial status
    updateNetworkStatus();

    // Set up periodic check (since we don't have direct access to the listener)
    const interval = setInterval(updateNetworkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // Monitor sync status
  useEffect(() => {
    const updateSyncStatus = async () => {
      try {
        const queueItems = await OfflineService.getSyncQueue();
        const lastSync = await OfflineService.getLastSyncTime();
        
        setSyncStatus(prev => ({
          ...prev,
          queueCount: queueItems.length,
          lastSyncTime: lastSync,
        }));
      } catch (error) {
        console.error('Failed to update sync status:', error);
      }
    };

    updateSyncStatus();
    
    // Update sync status periodically
    const interval = setInterval(updateSyncStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  // Request notification permissions
  const requestPermissions = useCallback(async () => {
    setPermissionStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await NotificationService.requestPermissions();
      setPermissionStatus({
        granted: result.granted,
        canAskAgain: result.canAskAgain,
        loading: false,
      });
      
      return result;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      setPermissionStatus({
        granted: false,
        canAskAgain: false,
        loading: false,
      });
      
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied' as const,
      };
    }
  }, []);

  // Schedule task reminder
  const scheduleTaskReminder = useCallback(async (task: Task) => {
    try {
      if (!permissionStatus.granted) {
        console.warn('Cannot schedule notification: permission not granted');
        return null;
      }

      return await NotificationService.scheduleTaskReminder(task);
    } catch (error) {
      console.error('Failed to schedule task reminder:', error);
      return null;
    }
  }, [permissionStatus.granted]);

  // Send offline fallback notification
  const sendOfflineFallback = useCallback(async (task: Task) => {
    try {
      await NotificationService.sendOfflineFallbackNotification(task);
    } catch (error) {
      console.error('Failed to send offline fallback notification:', error);
    }
  }, []);

  // Send streak break notification
  const sendStreakBreakNotification = useCallback(async (streakCount: number) => {
    try {
      await NotificationService.sendStreakNotification(streakCount, 'break');
    } catch (error) {
      console.error('Failed to send streak break notification:', error);
    }
  }, []);

  // Cancel task notifications
  const cancelTaskNotifications = useCallback(async (taskId: string) => {
    try {
      await NotificationService.cancelTaskNotifications(taskId);
    } catch (error) {
      console.error('Failed to cancel task notifications:', error);
    }
  }, []);

  // Force sync
  const forceSync = useCallback(async () => {
    if (networkStatus.isOffline) {
      throw new Error('Cannot sync while offline');
    }

    setSyncStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      await OfflineService.forceSync();
      
      // Update sync status after successful sync
      const queueItems = await OfflineService.getSyncQueue();
      const lastSync = await OfflineService.getLastSyncTime();
      
      setSyncStatus({
        isLoading: false,
        queueCount: queueItems.length,
        lastSyncTime: lastSync,
      });
    } catch (error) {
      console.error('Failed to force sync:', error);
      setSyncStatus(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [networkStatus.isOffline]);

  // Clear offline data
  const clearOfflineData = useCallback(async () => {
    try {
      await OfflineService.clearOfflineData();
      setSyncStatus({
        isLoading: false,
        queueCount: 0,
        lastSyncTime: null,
      });
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }, []);

  // Check for overdue tasks
  const checkOverdueTasks = useCallback(async () => {
    try {
      await TaskService.checkOverdueTasks();
    } catch (error) {
      console.error('Failed to check overdue tasks:', error);
    }
  }, []);

  return {
    // Permission status
    permissionStatus,
    requestPermissions,
    
    // Network status
    networkStatus,
    
    // Sync status
    syncStatus,
    forceSync,
    clearOfflineData,
    
    // Notification actions
    scheduleTaskReminder,
    sendOfflineFallback,
    sendStreakBreakNotification,
    cancelTaskNotifications,
    
    // Task actions
    checkOverdueTasks,
    
    // Computed values
    hasNotificationPermission: permissionStatus.granted,
    isOnline: networkStatus.isOnline,
    isOffline: networkStatus.isOffline,
    hasPendingSync: syncStatus.queueCount > 0,
    isSyncing: syncStatus.isLoading,
  };
}; 