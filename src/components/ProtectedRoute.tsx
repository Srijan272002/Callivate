import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks';
import { useTheme } from '../hooks/useTheme';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    // This will be handled by the navigation logic in AppNavigator
    return null;
  }

  return <>{children}</>;
}; 