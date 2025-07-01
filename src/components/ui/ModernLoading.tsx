import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { fontSize, spacing } from '../../styles/theme';

interface ModernLoadingProps {
  messages?: string[];
  duration?: number; // minimum duration in ms
  onComplete?: () => void;
  showProgress?: boolean;
}

const defaultMessages = [
  'Preparing your experience...',
  'Loading your tasks...',
  'Setting up notifications...',
];

export const ModernLoading: React.FC<ModernLoadingProps> = ({
  messages = defaultMessages,
  duration = 3000,
  onComplete,
  showProgress = true,
}) => {
  const { theme, isDark } = useTheme();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  useEffect(() => {
    // Initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Message cycling
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, duration / messages.length);

    // Progress simulation
    let progressValue = 0;
    const progressInterval = setInterval(() => {
      progressValue += 1;
      setProgress(progressValue);
      if (progressValue >= 100) {
        clearInterval(progressInterval);
        clearInterval(messageInterval);
        setTimeout(() => {
          onComplete?.();
        }, 300);
      }
    }, duration / 100);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [duration, messages.length, onComplete]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Spinner */}
        <View style={styles.spinnerContainer}>
          <ActivityIndicator 
            size="large" 
            color={theme.colors.primary} 
            style={styles.spinner}
          />
        </View>

        {/* Progress Text */}
        <Text style={styles.message}>
          {messages[currentMessageIndex]}
        </Text>

        {/* Progress Bar */}
        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerContainer: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: 50,
    backgroundColor: isDark 
      ? 'rgba(56, 189, 248, 0.1)' 
      : 'rgba(14, 165, 233, 0.1)',
  },
  spinner: {
    transform: [{ scale: 1.5 }],
  },
  message: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: 0.5,
  },
  progressContainer: {
    alignItems: 'center',
    width: 250,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: isDark 
      ? 'rgba(255, 255, 255, 0.1)' 
      : 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
}); 