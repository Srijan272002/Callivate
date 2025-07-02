import { ApiResponse, MonthlyAnalytics, Task, User, UserSettings, Voice } from '../types';
import { supabase } from './supabase';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

class ApiClient {
  private config: ApiClientConfig;
  private authToken: string | null = null;

  constructor(config?: Partial<ApiClientConfig>) {
    this.config = {
      baseURL: API_BASE_URL,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  // Get current auth token
  private async getAuthToken(): Promise<string | null> {
    try {
      const session = await supabase.auth.getSession();
      return session.data.session?.access_token || null;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  // Make authenticated request
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`;
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Add auth token if required
    if (includeAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Create request configuration
    const requestConfig: RequestInit = {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    };

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        console.log(`🌐 API Request [${attempt}/${this.config.retries}]: ${options.method || 'GET'} ${endpoint}`);
        
        const response = await fetch(url, requestConfig);
        
        // Handle response
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ API Success: ${endpoint}`);
          return {
            success: true,
            data: data.data || data,
            message: data.message,
          };
        } else {
          // Handle HTTP errors
          const errorData = await response.json().catch(() => ({}));
          const apiError: ApiError = {
            message: errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
            code: errorData.code,
            details: errorData,
          };

          console.error(`❌ API Error [${response.status}]: ${endpoint}`, apiError);
          
          // Don't retry certain errors
          if (response.status === 401 || response.status === 403 || response.status === 404) {
            return {
              success: false,
              error: apiError.message,
            };
          }

          lastError = new Error(apiError.message);
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`🔥 API Request Failed [${attempt}/${this.config.retries}]: ${endpoint}`, error);
        
        // Don't retry network timeout or abort errors on last attempt
        if (attempt === this.config.retries) {
          break;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
      }
    }

    // All retries failed
    return {
      success: false,
      error: lastError?.message || 'Request failed after all retries',
    };
  }

  // GET request
  async get<T>(endpoint: string, includeAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' }, includeAuth);
  }

  // POST request
  async post<T>(endpoint: string, data?: any, includeAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      includeAuth
    );
  }

  // PUT request
  async put<T>(endpoint: string, data?: any, includeAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      includeAuth
    );
  }

  // DELETE request
  async delete<T>(endpoint: string, includeAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' }, includeAuth);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health', false);
      return response.success;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Create global API client instance
export const apiClient = new ApiClient();

// API Service Classes
export class TaskAPI {
  static async getTasks(): Promise<ApiResponse<Task[]>> {
    return apiClient.get<Task[]>('/tasks');
  }

  static async getTask(taskId: string): Promise<ApiResponse<Task>> {
    return apiClient.get<Task>(`/tasks/${taskId}`);
  }

  static async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Task>> {
    return apiClient.post<Task>('/tasks', task);
  }

  static async updateTask(taskId: string, updates: Partial<Task>): Promise<ApiResponse<Task>> {
    return apiClient.put<Task>(`/tasks/${taskId}`, updates);
  }

  static async deleteTask(taskId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/tasks/${taskId}`);
  }

  static async completeTask(taskId: string): Promise<ApiResponse<Task>> {
    return apiClient.post<Task>(`/tasks/${taskId}/complete`);
  }

  static async getTodaysTasks(): Promise<ApiResponse<Task[]>> {
    return apiClient.get<Task[]>('/tasks/today');
  }

  static async getUpcomingTasks(): Promise<ApiResponse<Task[]>> {
    return apiClient.get<Task[]>('/tasks/upcoming');
  }
}

export class UserAPI {
  static async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/users/me');
  }

  static async updateUser(updates: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.put<User>('/users/me', updates);
  }

  static async getUserSettings(): Promise<ApiResponse<UserSettings>> {
    return apiClient.get<UserSettings>('/users/me/settings');
  }

  static async updateUserSettings(settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    return apiClient.put<UserSettings>('/users/me/settings', settings);
  }
}

export class VoiceAPI {
  static async getVoices(): Promise<ApiResponse<Voice[]>> {
    return apiClient.get<Voice[]>('/voices');
  }

  static async getVoice(voiceId: string): Promise<ApiResponse<Voice>> {
    return apiClient.get<Voice>(`/voices/${voiceId}`);
  }
}

export class AnalyticsAPI {
  static async getMonthlyAnalytics(year: number, month: number): Promise<ApiResponse<MonthlyAnalytics>> {
    return apiClient.get<MonthlyAnalytics>(`/analytics/monthly?year=${year}&month=${month}`);
  }

  static async getOverviewAnalytics(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/analytics/overview');
  }

  static async getStreakAnalytics(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/analytics/streaks');
  }
}

export class NotificationAPI {
  static async registerDevice(deviceToken: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/notifications/device', { deviceToken });
  }

  static async unregisterDevice(): Promise<ApiResponse<void>> {
    return apiClient.delete<void>('/notifications/device');
  }

  static async getNotificationSettings(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/notifications/settings');
  }

  static async updateNotificationSettings(settings: any): Promise<ApiResponse<any>> {
    return apiClient.put<any>('/notifications/settings', settings);
  }
}

export class SyncAPI {
  static async syncData(syncItems: any[]): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/sync/batch', { items: syncItems });
  }

  static async getSyncStatus(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/sync/status');
  }

  static async forceFullSync(): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/sync/full');
  }
}

// Export everything
export { ApiClient };
export default apiClient; 