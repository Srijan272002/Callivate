import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks';
import { colors } from '../styles/theme';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
      }}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!isAuthenticated) {
    // This will be handled by the navigation logic in AppNavigator
    return null;
  }

  return <>{children}</>;
}; 