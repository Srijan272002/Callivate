import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, spacing, borderRadius } from '../styles/theme';
import { useTheme } from '../hooks/useTheme';

interface SplashScreenProps {
  navigation?: any;
}

const { width, height } = Dimensions.get('window');

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const logoRotateAnim = React.useRef(new Animated.Value(0)).current;

  // Create dynamic styles based on current theme
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  useEffect(() => {
    // Start animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotateAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to main app after 3 seconds
    const timer = setTimeout(() => {
      if (navigation) {
        navigation.replace('Onboarding'); // or 'Main' if user is already authenticated
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  const logoRotation = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Background Gradient Effect */}
      <View style={styles.backgroundGradient} />
      
      {/* Animated Content */}
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {/* Logo Container */}
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              transform: [{ rotate: logoRotation }],
            }
          ]}
        >
          <View style={styles.logoBackground}>
            <Ionicons name="call" size={48} color={theme.colors.primary} />
          </View>
        </Animated.View>

        {/* App Name */}
        <Text style={styles.appName}>Callivate</Text>
        
        {/* Tagline */}
        <Text style={styles.tagline}>
          Your AI-powered reminder companion
        </Text>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBar}>
            <Animated.View 
              style={[
                styles.loadingProgress,
                {
                  width: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }
              ]}
            />
          </View>
          <Text style={styles.loadingText}>Getting things ready...</Text>
        </View>
      </Animated.View>

      {/* Floating Elements */}
      <View style={styles.floatingElements}>
        <Animated.View 
          style={[
            styles.floatingCircle,
            styles.floatingCircle1,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.1],
              }),
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.floatingCircle,
            styles.floatingCircle2,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.15],
              }),
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.floatingCircle,
            styles.floatingCircle3,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.08],
              }),
            }
          ]} 
        />
      </View>
    </View>
  );
};

// Dynamic styles function that accepts theme
const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: isDark 
      ? `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.surface} 100%)`
      : `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.surface} 100%)`,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  appName: {
    fontSize: fontSize['4xl'],
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  tagline: {
    fontSize: fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: isDark ? theme.colors.textSecondary + '30' : theme.colors.textSecondary + '20',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  floatingElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
  },
  floatingCircle1: {
    width: 100,
    height: 100,
    top: height * 0.1,
    left: -50,
  },
  floatingCircle2: {
    width: 80,
    height: 80,
    top: height * 0.3,
    right: -40,
  },
  floatingCircle3: {
    width: 120,
    height: 120,
    bottom: height * 0.1,
    left: width * 0.2,
  },
}); 