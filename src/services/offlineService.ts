import { StorageService } from './storage';
import { Task, User, Note } from '../types';
import NetInfo from '@react-native-community/netinfo';

export interface OfflineTask extends Task {
  syncStatus: 'pending' | 'synced' | 'failed';
  createdOffline?: boolean;
  lastModifiedOffline?: string;
}

export interface OfflineNote extends Note {
  syncStatus: 'pending' | 'synced' | 'failed';
  createdOffline?: boolean;
  lastModifiedOffline?: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'task' | 'note' | 'completion' | 'deletion';
  action: 'create' | 'update' | 'delete' | 'complete';
  data: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

export class OfflineService {
  private static readonly STORAGE_KEYS = {
    OFFLINE_TASKS: 'offline_tasks',
    OFFLINE_NOTES: 'offline_notes',
    SYNC_QUEUE: 'sync_queue',
    LAST_SYNC: 'last_sync_timestamp',
    NETWORK_STATUS: 'network_status',
    OFFLINE_MODE: 'offline_mode_enabled',
  };

  private static networkStatus: NetworkStatus = {
    isConnected: false,
    isInternetReachable: null,
    type: null,
  };

  private static syncInProgress = false;
  private static networkListener: any = null;

  /**
   * Initialize the offline service
   */
  static async initialize(): Promise<void> {
    try {
      // Set up network status monitoring
      await this.setupNetworkMonitoring();
      
      // Check for pending sync items
      const queueItems = await this.getSyncQueue();
      if (queueItems.length > 0) {
        console.log(`📱 Found ${queueItems.length} items in sync queue`);
      }

      // Attempt initial sync if online
      if (this.networkStatus.isConnected) {
        await this.processSyncQueue();
      }

      console.log('📱 Offline service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize offline service:', error);
    }
  }

  /**
   * Setup network status monitoring
   */
  static async setupNetworkMonitoring(): Promise<void> {
    try {
      // Get initial network state
      const state = await NetInfo.fetch();
      this.networkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      };

      // Store network status
      await StorageService.setObject(this.STORAGE_KEYS.NETWORK_STATUS, this.networkStatus);

      // Listen for network changes
      this.networkListener = NetInfo.addEventListener((state: any) => {
        const previousStatus = this.networkStatus.isConnected;
        
        this.networkStatus = {
          isConnected: state.isConnected ?? false,
          isInternetReachable: state.isInternetReachable,
          type: state.type,
        };

        // Store updated status
        StorageService.setObject(this.STORAGE_KEYS.NETWORK_STATUS, this.networkStatus);

        console.log(`📡 Network status changed: ${this.networkStatus.isConnected ? 'online' : 'offline'}`);

        // If we just came online, try to sync
        if (!previousStatus && this.networkStatus.isConnected) {
          console.log('🔄 Device came online, attempting sync...');
          this.processSyncQueue();
        }
      });

      console.log(`📡 Network monitoring setup. Current status: ${this.networkStatus.isConnected ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('❌ Failed to setup network monitoring:', error);
    }
  }

  /**
   * Get current network status
   */
  static getNetworkStatus(): NetworkStatus {
    return this.networkStatus;
  }

  /**
   * Check if device is online
   */
  static isOnline(): boolean {
    return this.networkStatus.isConnected && this.networkStatus.isInternetReachable !== false;
  }

  /**
   * Check if device is offline
   */
  static isOffline(): boolean {
    return !this.isOnline();
  }

  /**
   * Save task offline
   */
  static async saveTaskOffline(task: Task): Promise<void> {
    try {
      const offlineTask: OfflineTask = {
        ...task,
        syncStatus: 'pending',
        createdOffline: true,
        lastModifiedOffline: new Date().toISOString(),
      };

      const existingTasks = await this.getOfflineTasks();
      const updatedTasks = [...existingTasks.filter(t => t.id !== task.id), offlineTask];
      
      await StorageService.setObject(this.STORAGE_KEYS.OFFLINE_TASKS, updatedTasks);

      // Add to sync queue
      await this.addToSyncQueue({
        id: `task_${task.id}_${Date.now()}`,
        type: 'task',
        action: 'create',
        data: task,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
      });

      console.log(`📱 Saved task offline: ${task.title}`);
    } catch (error) {
      console.error('❌ Failed to save task offline:', error);
    }
  }

  /**
   * Update task offline
   */
  static async updateTaskOffline(task: Task): Promise<void> {
    try {
      const existingTasks = await this.getOfflineTasks();
      const taskIndex = existingTasks.findIndex(t => t.id === task.id);
      
      if (taskIndex !== -1) {
        existingTasks[taskIndex] = {
          ...task,
          syncStatus: 'pending',
          lastModifiedOffline: new Date().toISOString(),
        };
      } else {
        existingTasks.push({
          ...task,
          syncStatus: 'pending',
          createdOffline: true,
          lastModifiedOffline: new Date().toISOString(),
        });
      }

      await StorageService.setObject(this.STORAGE_KEYS.OFFLINE_TASKS, existingTasks);

      // Add to sync queue
      await this.addToSyncQueue({
        id: `task_update_${task.id}_${Date.now()}`,
        type: 'task',
        action: 'update',
        data: task,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
      });

      console.log(`📱 Updated task offline: ${task.title}`);
    } catch (error) {
      console.error('❌ Failed to update task offline:', error);
    }
  }

  /**
   * Mark task as completed offline
   */
  static async completeTaskOffline(taskId: string): Promise<void> {
    try {
      const existingTasks = await this.getOfflineTasks();
      const taskIndex = existingTasks.findIndex(t => t.id === taskId);
      
      if (taskIndex !== -1) {
        existingTasks[taskIndex].isCompleted = true;
        existingTasks[taskIndex].completedAt = new Date().toISOString();
        existingTasks[taskIndex].syncStatus = 'pending';
        existingTasks[taskIndex].lastModifiedOffline = new Date().toISOString();

        await StorageService.setObject(this.STORAGE_KEYS.OFFLINE_TASKS, existingTasks);

        // Add to sync queue
        await this.addToSyncQueue({
          id: `task_complete_${taskId}_${Date.now()}`,
          type: 'completion',
          action: 'complete',
          data: { taskId, completedAt: new Date().toISOString() },
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
        });

        console.log(`📱 Marked task as completed offline: ${taskId}`);
      }
    } catch (error) {
      console.error('❌ Failed to complete task offline:', error);
    }
  }

  /**
   * Save note offline
   */
  static async saveNoteOffline(note: Note): Promise<void> {
    try {
      const offlineNote: OfflineNote = {
        ...note,
        syncStatus: 'pending',
        createdOffline: true,
        lastModifiedOffline: new Date().toISOString(),
      };

      const existingNotes = await this.getOfflineNotes();
      const updatedNotes = [...existingNotes.filter(n => n.id !== note.id), offlineNote];
      
      await StorageService.setObject(this.STORAGE_KEYS.OFFLINE_NOTES, updatedNotes);

      // Add to sync queue
      await this.addToSyncQueue({
        id: `note_${note.id}_${Date.now()}`,
        type: 'note',
        action: 'create',
        data: note,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
      });

      console.log(`📱 Saved note offline: ${note.title}`);
    } catch (error) {
      console.error('❌ Failed to save note offline:', error);
    }
  }

  /**
   * Get offline tasks
   */
  static async getOfflineTasks(): Promise<OfflineTask[]> {
    try {
      const tasks = await StorageService.getObject<OfflineTask[]>(this.STORAGE_KEYS.OFFLINE_TASKS);
      return tasks || [];
    } catch (error) {
      console.error('❌ Failed to get offline tasks:', error);
      return [];
    }
  }

  /**
   * Get offline notes
   */
  static async getOfflineNotes(): Promise<OfflineNote[]> {
    try {
      const notes = await StorageService.getObject<OfflineNote[]>(this.STORAGE_KEYS.OFFLINE_NOTES);
      return notes || [];
    } catch (error) {
      console.error('❌ Failed to get offline notes:', error);
      return [];
    }
  }

  /**
   * Add item to sync queue
   */
  static async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      queue.push(item);
      await StorageService.setObject(this.STORAGE_KEYS.SYNC_QUEUE, queue);
      
      // Try to sync immediately if online
      if (this.isOnline() && !this.syncInProgress) {
        await this.processSyncQueue();
      }
    } catch (error) {
      console.error('❌ Failed to add item to sync queue:', error);
    }
  }

  /**
   * Get sync queue
   */
  static async getSyncQueue(): Promise<SyncQueueItem[]> {
    try {
      const queue = await StorageService.getObject<SyncQueueItem[]>(this.STORAGE_KEYS.SYNC_QUEUE);
      return queue || [];
    } catch (error) {
      console.error('❌ Failed to get sync queue:', error);
      return [];
    }
  }

  /**
   * Process sync queue
   */
  static async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.isOffline()) {
      console.log('⏸️ Sync already in progress or device is offline');
      return;
    }

    this.syncInProgress = true;

    try {
      const queue = await this.getSyncQueue();
      if (queue.length === 0) {
        console.log('✅ Sync queue is empty');
        return;
      }

      console.log(`🔄 Processing ${queue.length} sync queue items...`);

      const successfulItems: string[] = [];
      const failedItems: SyncQueueItem[] = [];

      for (const item of queue) {
        try {
          // Here you would call your API to sync the item
          // For now, we'll simulate success
          console.log(`🔄 Syncing ${item.type} ${item.action}: ${item.id}`);
          
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Mark as successful
          successfulItems.push(item.id);
          
          // Update sync status in offline storage
          await this.updateSyncStatus(item, 'synced');
          
        } catch (error) {
          console.error(`❌ Failed to sync item ${item.id}:`, error);
          
          // Increment retry count
          item.retryCount++;
          
          if (item.retryCount < item.maxRetries) {
            failedItems.push(item);
          } else {
            console.error(`❌ Max retries reached for item ${item.id}, marking as failed`);
            await this.updateSyncStatus(item, 'failed');
          }
        }
      }

      // Update sync queue with failed items
      await StorageService.setObject(this.STORAGE_KEYS.SYNC_QUEUE, failedItems);
      
      // Update last sync timestamp
      await StorageService.setItem(this.STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

      console.log(`✅ Sync completed: ${successfulItems.length} successful, ${failedItems.length} failed`);
      
    } catch (error) {
      console.error('❌ Failed to process sync queue:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Update sync status for an item
   */
  private static async updateSyncStatus(item: SyncQueueItem, status: 'synced' | 'failed'): Promise<void> {
    try {
      if (item.type === 'task' || item.type === 'completion') {
        const tasks = await this.getOfflineTasks();
        const taskIndex = tasks.findIndex(t => t.id === item.data.id || t.id === item.data.taskId);
        if (taskIndex !== -1) {
          tasks[taskIndex].syncStatus = status;
          await StorageService.setObject(this.STORAGE_KEYS.OFFLINE_TASKS, tasks);
        }
      } else if (item.type === 'note') {
        const notes = await this.getOfflineNotes();
        const noteIndex = notes.findIndex(n => n.id === item.data.id);
        if (noteIndex !== -1) {
          notes[noteIndex].syncStatus = status;
          await StorageService.setObject(this.STORAGE_KEYS.OFFLINE_NOTES, notes);
        }
      }
    } catch (error) {
      console.error('❌ Failed to update sync status:', error);
    }
  }

  /**
   * Clear offline data
   */
  static async clearOfflineData(): Promise<void> {
    try {
      await StorageService.removeItem(this.STORAGE_KEYS.OFFLINE_TASKS);
      await StorageService.removeItem(this.STORAGE_KEYS.OFFLINE_NOTES);
      await StorageService.removeItem(this.STORAGE_KEYS.SYNC_QUEUE);
      await StorageService.removeItem(this.STORAGE_KEYS.LAST_SYNC);
      
      console.log('🗑️ Cleared all offline data');
    } catch (error) {
      console.error('❌ Failed to clear offline data:', error);
    }
  }

  /**
   * Get last sync timestamp
   */
  static async getLastSyncTime(): Promise<string | null> {
    try {
      return await StorageService.getItem(this.STORAGE_KEYS.LAST_SYNC);
    } catch (error) {
      console.error('❌ Failed to get last sync time:', error);
      return null;
    }
  }

  /**
   * Force sync
   */
  static async forceSync(): Promise<void> {
    if (this.isOffline()) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.processSyncQueue();
  }

  /**
   * Cleanup and dispose
   */
  static dispose(): void {
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
  }
} 