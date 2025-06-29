import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, StatusBar, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { colors, fontSize, spacing } from '../styles/theme';
import { useAuth } from '../hooks';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

interface Props {
  navigation: SplashScreenNavigationProp;
}

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const { isAuthenticated, loading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Define image source explicitly to help Metro bundler
  const splashIcon = require('../../assets/icon.png');

  useEffect(() => {
    // Start animations immediately
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation for loading indicator
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotateAnimation.start();

    // Navigation logic - 5 second delay
    const navigationTimer = setTimeout(() => {
      if (!loading) {
        if (isAuthenticated) {
          navigation.replace('Main');
        } else {
          navigation.replace('Onboarding');
        }
      }
    }, 5000); // 5 seconds for splash screen display

    // Fallback timer to prevent splash screen from hanging
    const fallbackTimer = setTimeout(() => {
      console.log('⚠️ Splash screen fallback navigation triggered');
      if (isAuthenticated) {
        navigation.replace('Main');
      } else {
        navigation.replace('Onboarding');
      }
    }, 8000); // 8 second fallback

    return () => {
      clearTimeout(navigationTimer);
      clearTimeout(fallbackTimer);
      rotateAnimation.stop();
    };
  }, [fadeAnim, scaleAnim, rotateAnim, navigation, isAuthenticated, loading]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary[500]} />
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <View style={styles.logoContainer}>
            <Image 
              source={splashIcon} 
              style={styles.logo}
              onError={(error) => console.log('Image loading error:', error.nativeEvent.error)}
              onLoad={() => console.log('Image loaded successfully')}
            />
            <Text style={styles.title}>Callivate</Text>
            <Text style={styles.subtitle}>Voice-first productivity</Text>
          </View>
          
          <View style={styles.loadingContainer}>
            <Animated.View 
              style={[
                styles.loadingIndicator,
                { transform: [{ rotate: spin }] }
              ]}
            >
              <Text style={styles.loadingIcon}>⭯</Text>
            </Animated.View>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </Animated.View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: spacing.md,
    resizeMode: 'contain',
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.primary[100],
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingIndicator: {
    marginBottom: spacing.sm,
  },
  loadingIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.primary[200],
    fontWeight: '500',
  },
}); 