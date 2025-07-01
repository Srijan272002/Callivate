import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User } from '../types';
import { AuthService, AuthResponse } from '../services/auth';
import { supabase } from '../services/supabase';
import { StorageService } from '../services/storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signingOut: boolean;
  error: string | null;
  signIn: () => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [signingOut, setSigningOut] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing authentication on app start and listen for auth changes
  useEffect(() => {
    checkAuthStatus();
    
    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in via auth state change');
          const user = AuthService.transformSupabaseUser(session.user);
          await StorageService.setObject('user', user);
          setUser(user);
          setError(null);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out via auth state change');
          setUser(null);
          await StorageService.removeItem('user');
          setError(null);
          
          // Add a small delay to ensure clean state transition
          setTimeout(() => {
            setSigningOut(false);
            setLoading(false);
          }, 100);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed');
          if (session?.user) {
            const user = AuthService.transformSupabaseUser(session.user);
            await StorageService.setObject('user', user);
            setUser(user);
          }
          setLoading(false);
        } else if (event === 'INITIAL_SESSION') {
          // Handle initial session check completion
          setLoading(false);
        }
        
        // Fallback: always set loading to false after reasonable delay if not handled above
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('Auth check error:', err);
      setError('Failed to check authentication status');
      setUser(null); // Ensure user is cleared on error
    } finally {
      // Add a minimum delay to prevent flash
      setTimeout(() => {
        setLoading(false);
      }, 100);
    }
  };

  const signIn = async (): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);

      const response = await AuthService.signInWithGoogle();
      
      if (response.success && response.user) {
        setUser(response.user);
        return response;
      } else {
        setError(response.error || 'Sign in failed');
        return response;
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred during sign in';
      console.error('Sign in error:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('🔄 Starting signOut process...');
      setSigningOut(true);
      setError(null);
      // Don't set loading here as we have a separate signingOut state

      const result = await AuthService.signOut();
      console.log('📋 SignOut result:', result);
      
      if (result.success) {
        console.log('✅ SignOut successful, clearing user state');
        // Don't clear user state here - let the auth state change handle it
        // This prevents race conditions and ensures consistency
      } else {
        console.error('❌ SignOut failed:', result.error);
        setError(result.error || 'Sign out failed');
        setSigningOut(false); // Reset signing out state on error
        throw new Error(result.error || 'Sign out failed');
      }
    } catch (err) {
      console.error('💥 Sign out error in hook:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out';
      setError(errorMessage);
      setSigningOut(false); // Reset signing out state on error
      throw err; // Re-throw to allow calling component to handle
    }
    // Note: setSigningOut(false) is handled in the auth state change listener
    console.log('🏁 SignOut process finished');
  };

  const value: AuthContextType = {
    user,
    loading,
    signingOut,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 