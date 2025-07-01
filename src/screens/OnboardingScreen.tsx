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
  Image,
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
  image: any;
}

const onboardingData: OnboardingSlide[] = [
  {
    id: '1',
    title: 'AI-Powered Reminders',
    subtitle: 'Never miss what matters most',
    description: 'Get personalized AI voice calls that remind you about your tasks and goals at the perfect time. Choose from multiple AI voices for a truly personal experience.',
    icon: 'call',
    color: '#667eea',
    image: require('../../assets/ai-powered-reminder.png'),
  },
  {
    id: '2',
    title: 'Smart Scheduling',
    subtitle: 'Intelligent time management',
    description: 'Our AI learns your habits and schedules reminders when you\'re most likely to take action. Set it once and let intelligence handle the rest.',
    icon: 'calendar',
    color: '#f093fb',
    image: require('../../assets/smart-scheduling.png'),
  },
  {
    id: '3',
    title: 'Track Your Progress',
    subtitle: 'See your growth every day',
    description: 'Beautiful analytics and insights help you understand your productivity patterns and celebrate your wins with detailed progress tracking.',
    icon: 'analytics',
    color: '#4facfe',
    image: require('../../assets/track-your-progress.png'),
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
    navigation?.navigate('NotificationPermission');
  };

  const handleSkip = () => {
    navigation?.navigate('NotificationPermission');
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
            {/* Illustration Container */}
            <View style={styles.illustrationContainer}>
              <Image 
                source={slide.image} 
                style={styles.illustrationImage}
                resizeMode="contain"
              />
            </View>

            {/* Content */}
            <View style={styles.slideContent}>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={[styles.slideSubtitle, { color: slide.color }]}>{slide.subtitle}</Text>
              <Text style={styles.slideDescription}>{slide.description}</Text>
              
              {/* Feature highlights */}
              <View style={styles.highlightsContainer}>
                {slide.id === '1' && (
                  <>
                    <View style={styles.highlight}>
                      <View style={[styles.highlightDot, { backgroundColor: slide.color }]} />
                      <Text style={styles.highlightText}>Smart AI voice calls</Text>
                    </View>
                    <View style={styles.highlight}>
                      <View style={[styles.highlightDot, { backgroundColor: slide.color }]} />
                      <Text style={styles.highlightText}>Multiple voice options</Text>
                    </View>
                  </>
                )}
                {slide.id === '2' && (
                  <>
                    <View style={styles.highlight}>
                      <View style={[styles.highlightDot, { backgroundColor: slide.color }]} />
                      <Text style={styles.highlightText}>Learns your habits</Text>
                    </View>
                    <View style={styles.highlight}>
                      <View style={[styles.highlightDot, { backgroundColor: slide.color }]} />
                      <Text style={styles.highlightText}>Perfect timing</Text>
                    </View>
                  </>
                )}
                {slide.id === '3' && (
                  <>
                    <View style={styles.highlight}>
                      <View style={[styles.highlightDot, { backgroundColor: slide.color }]} />
                      <Text style={styles.highlightText}>Progress analytics</Text>
                    </View>
                    <View style={styles.highlight}>
                      <View style={[styles.highlightDot, { backgroundColor: slide.color }]} />
                      <Text style={styles.highlightText}>Streak tracking</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
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
    flex: 0.4,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
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
    minWidth: 100,
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
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.primary,
    gap: spacing.sm,
    minWidth: 100,
  },
  nextButtonText: {
    fontSize: fontSize.base,
    color: '#ffffff',
    fontWeight: '600',
  },
  primaryButton: {
    minWidth: 100,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
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
  illustrationContainer: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  illustrationPlaceholder: {
    width: screenWidth * 0.7,
    height: 280,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  placeholderText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
  highlightsContainer: {
    marginTop: spacing.xl,
    gap: spacing.md,
    width: '100%',
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  highlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.md,
  },
  highlightText: {
    fontSize: fontSize.base,
    color: theme.colors.text,
    fontWeight: '500',
  },
  illustrationImage: {
    width: screenWidth * 0.9,
    height: 300,
  },
}); 