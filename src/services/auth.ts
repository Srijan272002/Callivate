import { supabase } from './supabase';
import { StorageService } from './storage';
import { User } from '../types';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';

// Configure WebBrowser for auth sessions
WebBrowser.maybeCompleteAuthSession();

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export class AuthService {
  // Simple Google OAuth with Supabase
  static async signInWithGoogle(): Promise<AuthResponse> {
    try {
      console.log('🚀 Starting Google OAuth...');
      
      // Get the redirect URL for current environment
      const redirectUrl = AuthService.getRedirectUrl();
      console.log('📍 Using redirect URL:', redirectUrl);
      
      // Start OAuth flow with Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        return { success: false, error: error.message };
      }

      if (!data.url) {
        return { success: false, error: 'No OAuth URL received' };
      }

      // Open OAuth URL in browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === 'success' && result.url) {
        return await AuthService.handleAuthCallback(result.url);
      } else if (result.type === 'cancel') {
        return { success: false, error: 'Authentication was cancelled' };
      }

      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      console.error('💥 Authentication error:', error);
      return { 
        success: false, 
        error: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Handle OAuth callback
  private static async handleAuthCallback(callbackUrl: string): Promise<AuthResponse> {
    try {
      console.log('🔄 Processing callback:', callbackUrl);
      
      const url = new URL(callbackUrl);
      
      // Parse URL fragment (hash) for tokens - this is where Supabase puts them
      const fragment = url.hash.substring(1); // Remove the '#'
      const fragmentParams = new URLSearchParams(fragment);
      
      // Check for direct tokens (implicit flow)
      const accessToken = fragmentParams.get('access_token');
      const refreshToken = fragmentParams.get('refresh_token');
      const expiresAt = fragmentParams.get('expires_at');
      
      // Check for authorization code (authorization code flow)
      const code = url.searchParams.get('code') || fragmentParams.get('code');

      // Method 1: Handle implicit flow (direct tokens)
      if (accessToken) {
        console.log('🎯 Using implicit flow with direct tokens');
        
        const { data: { user }, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          console.error('❌ Session setup error:', error);
          return { success: false, error: error.message };
        }

        if (user) {
          const transformedUser = AuthService.transformSupabaseUser(user);
          await StorageService.setObject('user', transformedUser);
          console.log('✅ Authentication successful with tokens!');
          return { success: true, user: transformedUser };
        }
      }

      // Method 2: Handle authorization code flow
      if (code) {
        console.log('🔑 Using authorization code flow');
        
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error('❌ Session exchange error:', error);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const user = AuthService.transformSupabaseUser(data.user);
          await StorageService.setObject('user', user);
          console.log('✅ Authentication successful with code!');
          return { success: true, user };
        }
      }

      // If neither tokens nor code are available
      console.log('⚠️ No tokens or authorization code found in callback');
      console.log('📝 Available params:', Object.fromEntries(fragmentParams.entries()));
      console.log('📝 Search params:', Object.fromEntries(url.searchParams.entries()));
      
      return { success: false, error: 'No valid authentication data in callback' };
    } catch (error) {
      console.error('💥 Callback error:', error);
      return { success: false, error: `Callback processing failed: ${error}` };
    }
  }

  // Get redirect URL for current environment
  private static getRedirectUrl(): string {
    if (__DEV__) {
      // Development with Expo Go
      return Linking.createURL('auth');
    } else {
      // Production build
      return 'callivate://auth';
    }
  }

  // Sign out
  static async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🚪 AuthService.signOut() called');
      
      // Check current session before signing out
      const currentSession = await AuthService.getCurrentSession();
      console.log('📋 Current session before signOut:', currentSession ? 'exists' : 'none');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Supabase signOut error:', error);
        return { success: false, error: error.message };
      }

      console.log('🗑️ Removing user from storage');
      await StorageService.removeItem('user');
      
      // Verify session is cleared
      const sessionAfter = await AuthService.getCurrentSession();
      console.log('📋 Session after signOut:', sessionAfter ? 'still exists' : 'cleared');
      
      console.log('✅ AuthService.signOut() completed successfully');
      return { success: true };
    } catch (error) {
      console.error('💥 Sign-out error in AuthService:', error);
      return { success: false, error: 'Failed to sign out' };
    }
  }

  // Get current session
  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    try {
      // First check stored user
      const storedUser = await StorageService.getObject<User>('user');
      if (storedUser) {
        return storedUser;
      }

      // Then check current session
      const session = await AuthService.getCurrentSession();
      if (session?.user) {
        const user = AuthService.transformSupabaseUser(session.user);
        await StorageService.setObject('user', user);
        return user;
      }

      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Check if authenticated
  static async isAuthenticated(): Promise<boolean> {
    const session = await AuthService.getCurrentSession();
    return !!session?.user;
  }

  // Transform Supabase user to app user
  static transformSupabaseUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '',
      avatar: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || '',
      createdAt: supabaseUser.created_at || new Date().toISOString(),
      updatedAt: supabaseUser.updated_at || new Date().toISOString(),
    };
  }
} 