import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, spacing, borderRadius } from '../styles/theme';
import { useTheme } from '../hooks/useTheme';
import { Button, Card } from '../components/ui';

interface OnboardingScreenProps {
  navigation?: any;
}

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
}

const onboardingData: OnboardingSlide[] = [
  {
    id: '1',
    title: 'AI-Powered Reminders',
    subtitle: 'Never forget again',
    description: 'Get personalized voice calls from our AI assistant to remind you of important tasks and habits.',
    icon: 'call',
    color: '#6366f1',
  },
  {
    id: '2',
    title: 'Smart Scheduling',
    subtitle: 'Perfect timing',
    description: 'Set custom schedules that adapt to your lifestyle with intelligent recurring reminders.',
    icon: 'time',
    color: '#8b5cf6',
  },
  {
    id: '3',
    title: 'Track Your Progress',
    subtitle: 'See your growth',
    description: 'Monitor your habits with detailed analytics and celebrate your streak achievements.',
    icon: 'analytics',
    color: '#06b6d4',
  },
  {
    id: '4',
    title: 'Personalized Experience',
    subtitle: 'Made for you',
    description: 'Choose from different AI voices and customize your reminder experience to fit your preferences.',
    icon: 'person',
    color: '#10b981',
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnimation = useRef(new Animated.Value(0)).current;

  // Create dynamic styles based on current theme
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const scrollToSlide = (index: number) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: index * screenWidth,
        animated: true,
      });
    }
    setCurrentIndex(index);
    
    // Animate slide transition
    Animated.spring(slideAnimation, {
      toValue: index,
      useNativeDriver: true,
    }).start();
  };

  const nextSlide = () => {
    if (currentIndex < onboardingData.length - 1) {
      scrollToSlide(currentIndex + 1);
    }
  };

  const previousSlide = () => {
    if (currentIndex > 0) {
      scrollToSlide(currentIndex - 1);
    }
  };

  const handleGetStarted = () => {
    navigation?.replace('Login');
  };

  const handleSkip = () => {
    navigation?.replace('Login');
  };

  const onScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const isLastSlide = currentIndex === onboardingData.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {onboardingData.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <Card style={styles.slideCard} shadow="lg">
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
                <Ionicons name={slide.icon as any} size={64} color={slide.color} />
              </View>

              {/* Content */}
              <View style={styles.slideContent}>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
                <Text style={styles.slideDescription}>{slide.description}</Text>
              </View>
            </Card>
          </View>
        ))}
      </ScrollView>

      {/* Page Indicators */}
      <View style={styles.indicatorContainer}>
        {onboardingData.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.activeIndicator,
            ]}
            onPress={() => scrollToSlide(index)}
          />
        ))}
      </View>

      {/* Navigation */}
      <View style={styles.navigationContainer}>
        <View style={styles.buttonRow}>
          {currentIndex > 0 && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={previousSlide}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <View style={styles.buttonSpacer} />

          {isLastSlide ? (
            <Button
              title="Get Started"
              onPress={handleGetStarted}
              size="lg"
              style={styles.primaryButton}
            />
          ) : (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={nextSlide}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Features Preview */}
      <View style={styles.featuresPreview}>
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.featureText}>Free to get started</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.featureText}>No credit card required</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.featureText}>Start in under 2 minutes</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Dynamic styles function that accepts theme
const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  skipButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: fontSize.base,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: screenWidth,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  slideCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  slideContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  slideTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  slideSubtitle: {
    fontSize: fontSize.lg,
    color: theme.colors.primary,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  slideDescription: {
    fontSize: fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.base * 1.6,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textSecondary + '30',
  },
  activeIndicator: {
    width: 24,
    backgroundColor: theme.colors.primary,
  },
  navigationContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
    gap: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: fontSize.base,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  buttonSpacer: {
    flex: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.primary,
    gap: spacing.sm,
  },
  nextButtonText: {
    fontSize: fontSize.base,
    color: '#ffffff',
    fontWeight: '600',
  },
  primaryButton: {
    minWidth: 120,
  },
  featuresPreview: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
  },
}); 