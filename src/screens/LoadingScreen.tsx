import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../hooks/useTheme';
import { ModernLoading } from '../components/ui/ModernLoading';
import { spacing } from '../styles/theme';

interface LoadingScreenProps {
  navigation?: any;
  route?: any;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const { 
    messages, 
    nextScreen, 
    duration = 3000, 
    simple = false // New parameter for simple loading
  } = route?.params || {};

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const handleComplete = () => {
    if (nextScreen && navigation) {
      navigation.replace(nextScreen);
    }
  };

  // Simple loading for quick transitions (onboarding -> login)
  if (simple) {
    React.useEffect(() => {
      const timer = setTimeout(() => {
        handleComplete();
      }, duration);

      return () => clearTimeout(timer);
    }, [navigation, nextScreen]);

    return (
      <View style={styles.simpleContainer}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ActivityIndicator 
          size="large" 
          color={theme.colors.primary} 
        />
      </View>
    );
  }

  // Modern loading for app initialization (login -> dashboard)
  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ModernLoading
        messages={messages}
        duration={duration}
        onComplete={handleComplete}
        showProgress={true}
      />
    </View>
  );
};

// Dynamic styles function that accepts theme
const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  simpleContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 