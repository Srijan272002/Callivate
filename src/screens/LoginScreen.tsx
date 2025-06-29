import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { colors, fontSize, spacing, borderRadius, fontWeight } from '../styles/theme';
import { useAuth } from '../hooks';
import { GoogleIcon } from '../components/ui';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { signIn, loading, error } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      const response = await signIn();
      
      if (response.success) {
        navigation.replace('Main');
      } else {
        Alert.alert(
          'Sign In Failed',
          response.error || 'An error occurred during sign in. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      Alert.alert(
        'Sign In Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Background Pattern */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </View>

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            {/* Top Section with Illustration */}
            <View style={styles.topSection}>
              <Image 
                source={require('../../assets/logout.png')} 
                style={styles.illustration}
                resizeMode="contain"
              />
              <Text style={styles.title}>Welcome to Callivate</Text>
              <Text style={styles.subtitle}>
                Transform your habits with AI-powered voice reminders and intelligent follow-ups
              </Text>
            </View>

            {/* Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <AntDesign name="exclamationcircle" size={16} color={colors.danger[600]} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              {/* Features Preview */}
              <View style={styles.featuresContainer}>
                <View style={styles.feature}>
                  <Text style={styles.featureIcon}>🔔</Text>
                  <Text style={styles.featureText}>Smart Reminders</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureIcon}>🔥</Text>
                  <Text style={styles.featureText}>Streak Tracking</Text>
                </View>
                <View style={styles.feature}>
                  <Text style={styles.featureIcon}>📊</Text>
                  <Text style={styles.featureText}>Progress Analytics</Text>
                </View>
              </View>

              {/* Auth Section */}
              <View style={styles.authContainer}>
                <TouchableOpacity
                  style={[
                    styles.googleButton,
                    (loading || isSigningIn) && styles.buttonDisabled
                  ]}
                  onPress={handleGoogleSignIn}
                  disabled={loading || isSigningIn}
                  activeOpacity={0.9}
                >
                  {(loading || isSigningIn) ? (
                    <ActivityIndicator color="#1f2937" size="small" />
                  ) : (
                    <>
                      <View style={styles.googleIconContainer}>
                        <GoogleIcon size={24} />
                      </View>
                      <Text style={styles.buttonText}>Continue with Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.termsText}>
                  By continuing, you agree to our{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -75,
  },
  circle3: {
    width: 100,
    height: 100,
    top: screenHeight * 0.3,
    right: 50,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    flex: 1,
    justifyContent: 'center',
  },
  illustration: {
    width: screenWidth * 0.6,
    height: screenWidth * 0.6,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: '800' as const,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: fontSize.lg * 1.5,
    maxWidth: screenWidth * 0.8,
    fontWeight: '400' as const,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: '#ffffff',
    marginLeft: spacing.sm,
    flex: 1,
  },
  bottomSection: {
    paddingBottom: spacing.xl,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing['2xl'],
    paddingHorizontal: spacing.md,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  featureText: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textAlign: 'center',
  },
  authContainer: {
    alignItems: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    width: '100%',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: 0.3,
  },
  termsText: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: fontSize.xs * 1.5,
    maxWidth: screenWidth * 0.8,
  },
  termsLink: {
    color: '#ffffff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  googleIconContainer: {
    marginRight: spacing.md,
  },
}); 