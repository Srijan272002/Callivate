import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../hooks/useTheme';
import { fontSize, spacing } from '../styles/theme';

interface NewSplashScreenProps {
  navigation?: any;
}

const { width, height } = Dimensions.get('window');

export const NewSplashScreen: React.FC<NewSplashScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const logoAnim = React.useRef(new Animated.Value(0)).current;

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  useEffect(() => {
    // Start animations
    Animated.sequence([
      // Logo appears
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Content fades in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Navigate after 3 seconds
    const timer = setTimeout(() => {
      navigation?.replace('Onboarding');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  const logoScale = logoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient} />
      
      {/* Animated content */}
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {/* Logo */}
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              opacity: logoAnim,
              transform: [{ scale: logoScale }],
            }
          ]}
        >
          <Image 
            source={require('../../assets/splash-icon.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App Name */}
        <Text style={styles.appName}>Callivate</Text>
      </Animated.View>

      {/* Floating decorative elements */}
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
    </View>
  );
};

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
      ? 'rgba(56, 189, 248, 0.03)'
      : 'rgba(14, 165, 233, 0.02)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: spacing.xl,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  appName: {
    fontSize: fontSize['4xl'],
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 1,
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: theme.colors.primary,
  },
  floatingCircle1: {
    width: 120,
    height: 120,
    top: height * 0.15,
    left: -60,
  },
  floatingCircle2: {
    width: 80,
    height: 80,
    bottom: height * 0.2,
    right: -40,
  },
}); 