import { apiClient } from '../services/api';
import { OfflineService } from '../services/offlineService';
import { realtimeService } from '../services/realtimeService';
import { supabase } from '../services/supabase';

export interface ConnectionTestResult {
  service: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export class ConnectionTester {
  /**
   * Test all connections and return comprehensive status
   */
  static async runAllTests(): Promise<ConnectionTestResult[]> {
    const results: ConnectionTestResult[] = [];
    
    console.log('🔍 Starting connection tests...');

    // Test 1: Supabase Connection
    results.push(await this.testSupabaseConnection());

    // Test 2: Backend API Connection
    results.push(await this.testBackendConnection());

    // Test 3: Supabase Authentication
    results.push(await this.testSupabaseAuth());

    // Test 4: Real-time Service
    results.push(await this.testRealtimeService());

    // Test 5: Offline Service
    results.push(await this.testOfflineService());

    // Test 6: Environment Configuration
    results.push(await this.testEnvironmentConfig());

    console.log('✅ Connection tests completed');
    return results;
  }

  /**
   * Test Supabase client connection
   */
  private static async testSupabaseConnection(): Promise<ConnectionTestResult> {
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        return {
          service: 'Supabase Database',
          status: 'error',
          message: `Connection failed: ${error.message}`,
          details: error,
        };
      }

      return {
        service: 'Supabase Database',
        status: 'success',
        message: 'Connected successfully',
        details: { response: data },
      };
    } catch (error) {
      return {
        service: 'Supabase Database',
        status: 'error',
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
      };
    }
  }

  /**
   * Test FastAPI backend connection
   */
  private static async testBackendConnection(): Promise<ConnectionTestResult> {
    try {
      const isHealthy = await apiClient.healthCheck();
      
      if (isHealthy) {
        return {
          service: 'FastAPI Backend',
          status: 'success',
          message: 'Backend is running and accessible',
        };
      } else {
        return {
          service: 'FastAPI Backend',
          status: 'error',
          message: 'Backend health check failed',
        };
      }
    } catch (error) {
      return {
        service: 'FastAPI Backend',
        status: 'error',
        message: `Backend connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
      };
    }
  }

  /**
   * Test Supabase authentication
   */
  private static async testSupabaseAuth(): Promise<ConnectionTestResult> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          service: 'Supabase Auth',
          status: 'warning',
          message: `Auth check failed: ${error.message}`,
          details: error,
        };
      }

      if (session) {
        return {
          service: 'Supabase Auth',
          status: 'success',
          message: 'User is authenticated',
          details: { userId: session.user.id },
        };
      } else {
        return {
          service: 'Supabase Auth',
          status: 'warning',
          message: 'No active session (user not logged in)',
        };
      }
    } catch (error) {
      return {
        service: 'Supabase Auth',
        status: 'error',
        message: `Auth test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
      };
    }
  }

  /**
   * Test real-time service
   */
  private static async testRealtimeService(): Promise<ConnectionTestResult> {
    try {
      // Check if real-time service can be initialized
      await realtimeService.initialize();
      
      const isConnected = realtimeService.isRealtimeConnected();
      const activeChannels = realtimeService.getActiveChannels();
      const channelCount = realtimeService.getActiveChannelsCount();
      
      return {
        service: 'Real-time Service',
        status: isConnected ? 'success' : 'warning',
        message: isConnected 
          ? `Real-time service connected with ${channelCount} channels` 
          : 'Real-time service not connected (may require authentication)',
        details: {
          isConnected,
          activeChannels,
          channelCount,
        },
      };
    } catch (error) {
      return {
        service: 'Real-time Service',
        status: 'error',
        message: `Real-time service failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
      };
    }
  }

  /**
   * Test offline service
   */
  private static async testOfflineService(): Promise<ConnectionTestResult> {
    try {
      await OfflineService.initialize();
      
      const networkStatus = OfflineService.getNetworkStatus();
      const syncQueue = await OfflineService.getSyncQueue();
      
      return {
        service: 'Offline Service',
        status: 'success',
        message: `Offline service initialized (${networkStatus.isConnected ? 'online' : 'offline'})`,
        details: {
          networkStatus,
          queueSize: syncQueue.length,
        },
      };
    } catch (error) {
      return {
        service: 'Offline Service',
        status: 'error',
        message: `Offline service failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
      };
    }
  }

  /**
   * Test environment configuration
   */
  private static async testEnvironmentConfig(): Promise<ConnectionTestResult> {
    const config = {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      devMode: process.env.EXPO_PUBLIC_DEV_MODE,
    };

    const missing = [];
    if (!config.supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
    if (config.supabaseKey === 'Missing') missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    if (!config.apiUrl) missing.push('EXPO_PUBLIC_API_URL');

    if (missing.length > 0) {
      return {
        service: 'Environment Config',
        status: 'error',
        message: `Missing environment variables: ${missing.join(', ')}`,
        details: config,
      };
    }

    return {
      service: 'Environment Config',
      status: 'success',
      message: 'All required environment variables configured',
      details: config,
    };
  }

  /**
   * Format test results for display
   */
  static formatResults(results: ConnectionTestResult[]): string {
    let output = '\n🔗 CONNECTION TEST RESULTS\n';
    output += '='.repeat(50) + '\n\n';

    results.forEach((result, index) => {
      const icon = result.status === 'success' ? '✅' : 
                   result.status === 'warning' ? '⚠️' : '❌';
      
      output += `${index + 1}. ${icon} ${result.service}\n`;
      output += `   Status: ${result.status.toUpperCase()}\n`;
      output += `   Message: ${result.message}\n`;
      
      if (result.details) {
        output += `   Details: ${JSON.stringify(result.details, null, 2)}\n`;
      }
      
      output += '\n';
    });

    // Summary
    const successCount = results.filter(r => r.status === 'success').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    output += '📊 SUMMARY\n';
    output += `✅ Success: ${successCount}/${results.length}\n`;
    output += `⚠️ Warnings: ${warningCount}/${results.length}\n`;
    output += `❌ Errors: ${errorCount}/${results.length}\n`;

    if (errorCount === 0 && warningCount <= 1) {
      output += '\n🎉 Frontend and Backend are properly connected!\n';
    } else if (errorCount === 0) {
      output += '\n✅ Basic connection established, some warnings to review\n';
    } else {
      output += '\n🚨 Connection issues detected, please fix errors\n';
    }

    return output;
  }
}

// Export convenience function
export const testConnections = () => ConnectionTester.runAllTests();
export default ConnectionTester; 