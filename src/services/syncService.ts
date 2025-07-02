import { ApiResponse, User } from '../types';
import { SyncAPI, TaskAPI, UserAPI } from './api';
import { ExtendedSyncQueueItem, OfflineService, SyncQueueItem } from './offlineService';
import { realtimeService } from './realtimeService';
import { supabase } from './supabase';

export interface SyncItem {
  id: string;
  type: 'task' | 'user' | 'note' | 'settings';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
  userId?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  queueCount: number;
  errorCount: number;
  successCount: number;
}

export interface ConflictResolution {
  strategy: 'client_wins' | 'server_wins' | 'merge' | 'manual';
  clientData: any;
  serverData: any;
  mergedData?: any;
}

class SyncService {
  private isInitialized: boolean = false;
  private isSyncing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_BATCH_SIZE = 50;

  /**
   * Convert SyncItem to ExtendedSyncQueueItem for OfflineService compatibility
   */
  private convertToQueueItem(item: Omit<SyncItem, 'id' | 'retryCount' | 'maxRetries'>): ExtendedSyncQueueItem {
    return {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: item.type as any, // Type assertion for compatibility
      action: item.action,
      data: item.data,
      timestamp: item.timestamp,
      retryCount: 0,
      maxRetries: 3,
      userId: item.userId,
    };
  }

  /**
   * Convert SyncQueueItem to SyncItem for internal processing
   */
  private convertFromQueueItem(item: SyncQueueItem | ExtendedSyncQueueItem): SyncItem {
    return {
      id: item.id,
      type: this.mapQueueItemType(item.type),
      action: item.action as 'create' | 'update' | 'delete',
      data: item.data,
      timestamp: item.timestamp,
      retryCount: item.retryCount,
      maxRetries: item.maxRetries,
      userId: (item as ExtendedSyncQueueItem).userId,
    };
  }

  /**
   * Map queue item types to sync item types
   */
  private mapQueueItemType(type: string): 'task' | 'user' | 'note' | 'settings' {
    switch (type) {
      case 'completion':
      case 'deletion':
        return 'task'; // Map special types to task
      case 'user':
      case 'settings':
      case 'task':
      case 'note':
        return type as 'task' | 'user' | 'note' | 'settings';
      default:
        return 'task'; // Default fallback
    }
  }

  /**
   * Initialize the sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Sync service already initialized');
      return;
    }

    try {
      console.log('🔄 Initializing Sync Service...');

      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('⚠️ User not authenticated, sync service disabled');
        return;
      }

      // Initialize realtime service for sync status updates
      await realtimeService.initialize();

      // Start periodic sync
      this.startPeriodicSync();

      this.isInitialized = true;
      console.log('✅ Sync service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize sync service:', error);
      throw error;
    }
  }

  /**
   * Start periodic background sync
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncPendingItems();
      } catch (error) {
        console.error('❌ Periodic sync failed:', error);
      }
    }, this.SYNC_INTERVAL_MS);

    console.log('⏰ Periodic sync started');
  }

  /**
   * Stop periodic sync
   */
  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Periodic sync stopped');
    }
  }

  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return OfflineService.isOnline();
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const queueItems = await OfflineService.getSyncQueue();
      const lastSyncTime = await OfflineService.getLastSyncTime();

      return {
        isOnline: this.isOnline(),
        isSyncing: this.isSyncing,
        lastSyncTime,
        queueCount: queueItems.length,
        errorCount: queueItems.filter(item => item.retryCount > 0).length,
        successCount: 0, // This would be tracked separately in a real app
      };
    } catch (error) {
      console.error('❌ Failed to get sync status:', error);
      return {
        isOnline: false,
        isSyncing: false,
        lastSyncTime: null,
        queueCount: 0,
        errorCount: 0,
        successCount: 0,
      };
    }
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(item: Omit<SyncItem, 'id' | 'retryCount' | 'maxRetries'>): Promise<void> {
    try {
      const queueItem = this.convertToQueueItem(item);
      await OfflineService.addToSyncQueue(queueItem);
      console.log(`📤 Added item to sync queue: ${item.type} ${item.action}`);

      // Try immediate sync if online
      if (this.isOnline() && !this.isSyncing) {
        this.syncPendingItems();
      }
    } catch (error) {
      console.error('❌ Failed to add item to sync queue:', error);
      throw error;
    }
  }

  /**
   * Sync all pending items
   */
  async syncPendingItems(): Promise<void> {
    if (!this.isOnline()) {
      console.log('📱 Device offline, skipping sync');
      return;
    }

    if (this.isSyncing) {
      console.log('🔄 Sync already in progress, skipping');
      return;
    }

    try {
      this.isSyncing = true;
      console.log('🔄 Starting sync process...');

      const queueItems = await OfflineService.getSyncQueue();
      if (queueItems.length === 0) {
        console.log('✅ No items to sync');
        return;
      }

      console.log(`📦 Syncing ${queueItems.length} items...`);

      // Convert queue items to sync items
      const syncItems = queueItems.map(item => this.convertFromQueueItem(item));

      // Process items in batches
      const batches = this.createBatches(syncItems, this.MAX_BATCH_SIZE);
      let totalSynced = 0;
      let totalErrors = 0;

      for (const batch of batches) {
        const results = await this.processBatch(batch);
        totalSynced += results.success;
        totalErrors += results.errors;
      }

      // Update last sync time
      await OfflineService.setLastSyncTime(new Date().toISOString());

      console.log(`✅ Sync completed: ${totalSynced} synced, ${totalErrors} errors`);
    } catch (error) {
      console.error('❌ Sync process failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Create batches from sync items
   */
  private createBatches(items: SyncItem[], batchSize: number): SyncItem[][] {
    const batches: SyncItem[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a batch of sync items
   */
  private async processBatch(batch: SyncItem[]): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;

    for (const item of batch) {
      try {
        const result = await this.syncItem(item);
        if (result.success) {
          success++;
          await OfflineService.removeSyncItem(item.id);
        } else {
          errors++;
          await this.handleSyncError(item, result.error || 'Unknown error');
        }
      } catch (error) {
        errors++;
        await this.handleSyncError(item, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return { success, errors };
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: SyncItem): Promise<ApiResponse<any>> {
    console.log(`🔄 Syncing ${item.type} ${item.action}: ${item.id}`);

    try {
      switch (item.type) {
        case 'task':
          return await this.syncTaskItem(item);
        case 'user':
          return await this.syncUserItem(item);
        default:
          console.warn(`⚠️ Unknown sync item type: ${item.type}`);
          return { success: false, error: `Unknown item type: ${item.type}` };
      }
    } catch (error) {
      console.error(`❌ Failed to sync item ${item.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sync task item
   */
  private async syncTaskItem(item: SyncItem): Promise<ApiResponse<any>> {
    const { action, data } = item;

    switch (action) {
      case 'create':
        return await TaskAPI.createTask(data);
      case 'update':
        return await TaskAPI.updateTask(data.id, data);
      case 'delete':
        // Handle delete operation which returns void
        const deleteResult = await TaskAPI.deleteTask(data.id);
        return deleteResult.success 
          ? { success: true, data: { id: data.id, deleted: true } }
          : deleteResult;
      default:
        return { success: false, error: `Unknown task action: ${action}` };
    }
  }

  /**
   * Sync user item
   */
  private async syncUserItem(item: SyncItem): Promise<ApiResponse<User>> {
    const { action, data } = item;

    switch (action) {
      case 'update':
        return await UserAPI.updateUser(data);
      default:
        return { success: false, error: `Unknown user action: ${action}` };
    }
  }

  /**
   * Handle sync error
   */
  private async handleSyncError(item: SyncItem, error: string): Promise<void> {
    console.error(`❌ Sync error for ${item.id}: ${error}`);

    const updatedItem: SyncItem = {
      ...item,
      retryCount: item.retryCount + 1,
    };

    if (updatedItem.retryCount >= updatedItem.maxRetries) {
      console.error(`🚨 Max retries reached for ${item.id}, removing from queue`);
      await OfflineService.removeSyncItem(item.id);
    } else {
      console.log(`🔄 Retrying ${item.id} (attempt ${updatedItem.retryCount}/${updatedItem.maxRetries})`);
      
      // Convert back to queue item for storage
      const queueItem: ExtendedSyncQueueItem = {
        id: updatedItem.id,
        type: updatedItem.type as any,
        action: updatedItem.action,
        data: updatedItem.data,
        timestamp: updatedItem.timestamp,
        retryCount: updatedItem.retryCount,
        maxRetries: updatedItem.maxRetries,
        userId: updatedItem.userId,
      };
      
      await OfflineService.updateSyncItem(queueItem);
    }
  }

  /**
   * Force full synchronization
   */
  async forceFullSync(): Promise<void> {
    try {
      console.log('🔄 Starting force full sync...');
      
      if (!this.isOnline()) {
        throw new Error('Cannot sync while offline');
      }

      // Use backend full sync endpoint
      const response = await SyncAPI.forceFullSync();
      
      if (!response.success) {
        throw new Error(response.error || 'Full sync failed');
      }

      // Clear local sync queue since server handled everything
      await OfflineService.clearSyncQueue();
      
      console.log('✅ Force full sync completed');
    } catch (error) {
      console.error('❌ Force full sync failed:', error);
      throw error;
    }
  }

  /**
   * Resolve sync conflicts
   */
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution
  ): Promise<ApiResponse<any>> {
    try {
      console.log(`🔄 Resolving conflict ${conflictId} with strategy: ${resolution.strategy}`);

      let finalData: any;

      switch (resolution.strategy) {
        case 'client_wins':
          finalData = resolution.clientData;
          break;
        case 'server_wins':
          finalData = resolution.serverData;
          break;
        case 'merge':
          finalData = resolution.mergedData || this.mergeData(resolution.clientData, resolution.serverData);
          break;
        case 'manual':
          finalData = resolution.mergedData;
          break;
        default:
          throw new Error(`Unknown conflict resolution strategy: ${resolution.strategy}`);
      }

      // Apply the resolved data
      // This would depend on the specific conflict type
      return { success: true, data: finalData };
    } catch (error) {
      console.error('❌ Failed to resolve conflict:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conflict resolution failed'
      };
    }
  }

  /**
   * Simple data merging strategy
   */
  private mergeData(clientData: any, serverData: any): any {
    // Simple merge strategy: server data wins for conflicts, client data for new fields
    return {
      ...clientData,
      ...serverData,
      // Keep client timestamp if it's newer
      updatedAt: new Date(clientData.updatedAt) > new Date(serverData.updatedAt)
        ? clientData.updatedAt
        : serverData.updatedAt,
    };
  }

  /**
   * Push notification handling
   */
  async handlePushNotification(data: any): Promise<void> {
    try {
      console.log('🔔 Handling push notification:', data);

      // If notification indicates data changes, trigger sync
      if (data.type === 'data_update' || data.type === 'sync_required') {
        await this.syncPendingItems();
      }

      // Handle specific notification types
      switch (data.type) {
        case 'task_completed':
          console.log('✅ Task completed notification received');
          break;
        case 'streak_updated':
          console.log('🔥 Streak updated notification received');
          break;
        case 'call_status_change':
          console.log('📞 Call status change notification received');
          break;
        default:
          console.log(`📨 Unknown notification type: ${data.type}`);
      }
    } catch (error) {
      console.error('❌ Failed to handle push notification:', error);
    }
  }

  /**
   * Cleanup sync service
   */
  cleanup(): void {
    console.log('🧹 Cleaning up sync service...');
    
    this.stopPeriodicSync();
    this.isInitialized = false;
    this.isSyncing = false;
    
    console.log('✅ Sync service cleanup complete');
  }
}

// Create singleton instance
export const syncService = new SyncService();

// Export for testing
export { SyncService };
export default syncService; 