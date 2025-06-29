import { Task, CreateTaskForm } from '../types';
import { NotificationService } from './notifications';
import { OfflineService } from './offlineService';
import { StorageService } from './storage';

export class TaskService {
  private static readonly STORAGE_KEYS = {
    TASKS: 'tasks',
    TASK_SCHEDULES: 'task_schedules',
  };

  /**
   * Create a new task with notification scheduling
   */
  static async createTask(taskForm: CreateTaskForm): Promise<Task> {
    try {
      const task: Task = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: 'current_user', // Would come from auth context
        title: taskForm.title,
        scheduledTime: taskForm.scheduledTime.toISOString(),
        isCompleted: false,
        isRecurring: taskForm.isRecurring,
        recurrenceType: taskForm.recurrenceType,
        voiceId: taskForm.voiceId,
        isSilentMode: taskForm.isSilentMode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Check if device is online
      if (OfflineService.isOnline()) {
        // Save to server (would be API call)
        console.log('📡 Saving task to server:', task.title);
        
        // Schedule notification
        if (!task.isSilentMode) {
          await NotificationService.scheduleTaskReminder(task);
        }
        
        // Save locally as backup
        await this.saveTaskLocally(task);
      } else {
        // Save offline
        console.log('📱 Device offline, saving task offline:', task.title);
        await OfflineService.saveTaskOffline(task);
        
        // Schedule local notification
        if (!task.isSilentMode) {
          await NotificationService.sendOfflineFallbackNotification(task);
        }
      }

      console.log(`✅ Created task: ${task.title}`);
      return task;
    } catch (error) {
      console.error('❌ Failed to create task:', error);
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  static async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    try {
      const existingTasks = await this.getAllTasks();
      const taskIndex = existingTasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      const updatedTask: Task = {
        ...existingTasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      if (OfflineService.isOnline()) {
        // Update on server
        console.log('📡 Updating task on server:', updatedTask.title);
        
        // Cancel old notifications and schedule new ones if needed
        await NotificationService.cancelTaskNotifications(taskId);
        if (!updatedTask.isSilentMode && !updatedTask.isCompleted) {
          await NotificationService.scheduleTaskReminder(updatedTask);
        }
        
        await this.saveTaskLocally(updatedTask);
      } else {
        // Update offline
        console.log('📱 Device offline, updating task offline:', updatedTask.title);
        await OfflineService.updateTaskOffline(updatedTask);
      }

      console.log(`✅ Updated task: ${updatedTask.title}`);
    } catch (error) {
      console.error('❌ Failed to update task:', error);
      throw error;
    }
  }

  /**
   * Mark task as completed
   */
  static async completeTask(taskId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      if (OfflineService.isOnline()) {
        // Complete on server
        console.log('📡 Marking task complete on server:', taskId);
        
        // Cancel any pending notifications
        await NotificationService.cancelTaskNotifications(taskId);
        
        // Update local storage
        const tasks = await this.getAllTasks();
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          tasks[taskIndex].isCompleted = true;
          tasks[taskIndex].completedAt = now;
          tasks[taskIndex].updatedAt = now;
          await this.saveAllTasks(tasks);
        }
      } else {
        // Complete offline
        console.log('📱 Device offline, marking task complete offline:', taskId);
        await OfflineService.completeTaskOffline(taskId);
      }

      console.log(`✅ Completed task: ${taskId}`);
    } catch (error) {
      console.error('❌ Failed to complete task:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(taskId: string): Promise<void> {
    try {
      if (OfflineService.isOnline()) {
        // Delete from server
        console.log('📡 Deleting task from server:', taskId);
        
        // Cancel notifications
        await NotificationService.cancelTaskNotifications(taskId);
        
        // Remove from local storage
        const tasks = await this.getAllTasks();
        const filteredTasks = tasks.filter(t => t.id !== taskId);
        await this.saveAllTasks(filteredTasks);
      } else {
        // Queue for deletion when online
        console.log('📱 Device offline, queuing task for deletion:', taskId);
        await OfflineService.addToSyncQueue({
          id: `delete_task_${taskId}_${Date.now()}`,
          type: 'deletion',
          action: 'delete',
          data: { taskId },
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
        });
        
        // Remove from local storage immediately
        const tasks = await this.getAllTasks();
        const filteredTasks = tasks.filter(t => t.id !== taskId);
        await this.saveAllTasks(filteredTasks);
      }

      console.log(`🗑️ Deleted task: ${taskId}`);
    } catch (error) {
      console.error('❌ Failed to delete task:', error);
      throw error;
    }
  }

  /**
   * Get all tasks (combines local and offline data)
   */
  static async getAllTasks(): Promise<Task[]> {
    try {
      let tasks: Task[] = [];
      
      // Get local tasks
      const localTasks = await this.getLocalTasks();
      tasks = [...localTasks];
      
      // Get offline tasks
      const offlineTasks = await OfflineService.getOfflineTasks();
      
      // Merge offline tasks (they override local ones)
      for (const offlineTask of offlineTasks) {
        const existingIndex = tasks.findIndex(t => t.id === offlineTask.id);
        if (existingIndex !== -1) {
          tasks[existingIndex] = offlineTask;
        } else {
          tasks.push(offlineTask);
        }
      }
      
      return tasks.sort((a, b) => 
        new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
      );
    } catch (error) {
      console.error('❌ Failed to get all tasks:', error);
      return [];
    }
  }

  /**
   * Get today's tasks
   */
  static async getTodaysTasks(): Promise<Task[]> {
    try {
      const allTasks = await this.getAllTasks();
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      
      return allTasks.filter(task => {
        const taskTime = new Date(task.scheduledTime);
        return taskTime >= todayStart && taskTime < todayEnd;
      });
    } catch (error) {
      console.error('❌ Failed to get today\'s tasks:', error);
      return [];
    }
  }

  /**
   * Get upcoming tasks (next 7 days)
   */
  static async getUpcomingTasks(): Promise<Task[]> {
    try {
      const allTasks = await this.getAllTasks();
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      return allTasks.filter(task => {
        const taskTime = new Date(task.scheduledTime);
        return taskTime >= now && taskTime <= oneWeekFromNow && !task.isCompleted;
      });
    } catch (error) {
      console.error('❌ Failed to get upcoming tasks:', error);
      return [];
    }
  }

  /**
   * Check for overdue tasks and send notifications
   */
  static async checkOverdueTasks(): Promise<void> {
    try {
      const allTasks = await this.getAllTasks();
      const now = new Date();
      
      const overdueTasks = allTasks.filter(task => {
        const taskTime = new Date(task.scheduledTime);
        return taskTime < now && !task.isCompleted && !task.isSilentMode;
      });

      for (const task of overdueTasks) {
        // Send follow-up notification after 15 minutes
        const timeSinceScheduled = now.getTime() - new Date(task.scheduledTime).getTime();
        const fifteenMinutes = 15 * 60 * 1000;
        
        if (timeSinceScheduled > fifteenMinutes) {
          await NotificationService.sendOfflineFallbackNotification(task);
        }
      }

      if (overdueTasks.length > 0) {
        console.log(`⏰ Found ${overdueTasks.length} overdue tasks`);
      }
    } catch (error) {
      console.error('❌ Failed to check overdue tasks:', error);
    }
  }

  /**
   * Reschedule recurring tasks
   */
  static async rescheduleRecurringTasks(): Promise<void> {
    try {
      const allTasks = await this.getAllTasks();
      const completedRecurringTasks = allTasks.filter(task => 
        task.isCompleted && task.isRecurring
      );

      for (const task of completedRecurringTasks) {
        const nextScheduledTime = this.calculateNextOccurrence(task);
        if (nextScheduledTime) {
          const newTask: Task = {
            ...task,
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isCompleted: false,
            scheduledTime: nextScheduledTime.toISOString(),
            completedAt: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await this.createTask({
            title: newTask.title,
            scheduledTime: nextScheduledTime,
            isRecurring: newTask.isRecurring,
            recurrenceType: newTask.recurrenceType,
            voiceId: newTask.voiceId,
            isSilentMode: newTask.isSilentMode,
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to reschedule recurring tasks:', error);
    }
  }

  /**
   * Calculate next occurrence for recurring task
   */
  private static calculateNextOccurrence(task: Task): Date | null {
    if (!task.isRecurring || !task.recurrenceType) return null;

    const baseTime = new Date(task.scheduledTime);
    const nextTime = new Date(baseTime);

    switch (task.recurrenceType) {
      case 'daily':
        nextTime.setDate(nextTime.getDate() + 1);
        break;
      case 'weekly':
        nextTime.setDate(nextTime.getDate() + 7);
        break;
      default:
        return null;
    }

    return nextTime;
  }

  /**
   * Save task locally
   */
  private static async saveTaskLocally(task: Task): Promise<void> {
    try {
      const tasks = await this.getLocalTasks();
      const existingIndex = tasks.findIndex(t => t.id === task.id);
      
      if (existingIndex !== -1) {
        tasks[existingIndex] = task;
      } else {
        tasks.push(task);
      }
      
      await StorageService.setObject(this.STORAGE_KEYS.TASKS, tasks);
    } catch (error) {
      console.error('❌ Failed to save task locally:', error);
    }
  }

  /**
   * Get local tasks
   */
  private static async getLocalTasks(): Promise<Task[]> {
    try {
      const tasks = await StorageService.getObject<Task[]>(this.STORAGE_KEYS.TASKS);
      return tasks || [];
    } catch (error) {
      console.error('❌ Failed to get local tasks:', error);
      return [];
    }
  }

  /**
   * Save all tasks locally
   */
  private static async saveAllTasks(tasks: Task[]): Promise<void> {
    try {
      await StorageService.setObject(this.STORAGE_KEYS.TASKS, tasks);
    } catch (error) {
      console.error('❌ Failed to save all tasks:', error);
    }
  }

  /**
   * Initialize task service
   */
  static async initialize(): Promise<void> {
    try {
      // Check for overdue tasks on startup
      await this.checkOverdueTasks();
      
      // Reschedule recurring tasks
      await this.rescheduleRecurringTasks();
      
      console.log('📋 Task service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize task service:', error);
    }
  }
} 