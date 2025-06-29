import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Dimensions, 
  TouchableOpacity,
  SafeAreaView 
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';

type OnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

interface Props {
  navigation: OnboardingScreenNavigationProp;
}

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingSlide {
  id: number;
  emoji: string;
  title: string;
  description: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    emoji: '📞',
    title: 'AI-Powered Reminders',
    description: 'Get personalized voice calls from AI to remind you about your tasks. Never forget what matters most.',
    color: colors.primary[500],
  },
  {
    id: 2,
    emoji: '🔥',
    title: 'Build Daily Streaks',
    description: 'Track your consistency with visual streak counters. See your progress and stay motivated.',
    color: colors.success[500],
  },
  {
    id: 3,
    emoji: '🎯',
    title: 'Smart Follow-ups',
    description: 'Our AI follows up if you miss a task, helping you stay accountable to your goals.',
    color: colors.warning[500],
  },
  {
    id: 4,
    emoji: '📊',
    title: 'Insightful Analytics',
    description: 'View your monthly progress, completion rates, and longest streaks to celebrate your success.',
    color: colors.primary[600],
  },
];

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentSlide(slideIndex);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    scrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: true });
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      goToSlide(currentSlide + 1);
    } else {
      navigation.navigate('Login');
    }
  };

  const skipOnboarding = () => {
    navigation.navigate('Login');
  };

  const renderSlide = (slide: OnboardingSlide) => (
    <View key={slide.id} style={[styles.slide, { backgroundColor: slide.color }]}>
      <View style={styles.slideHeader}>
        <TouchableOpacity onPress={skipOnboarding} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.slideContent}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.slideTitle}>{slide.title}</Text>
        <Text style={styles.slideDescription}>{slide.description}</Text>
      </View>

      <View style={styles.slideFooter}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.paginationDot,
                currentSlide === index && styles.paginationDotActive,
              ]}
              onPress={() => goToSlide(index)}
            />
          ))}
        </View>

        <TouchableOpacity 
          style={styles.nextButton}
          onPress={nextSlide}
        >
          <Text style={styles.nextButtonText}>
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollView}
      >
        {slides.map(renderSlide)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  slideHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  skipButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: fontSize.base,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    maxWidth: screenWidth,
  },
  emoji: {
    fontSize: 80,
    marginBottom: spacing.xl,
  },
  slideTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: fontSize['3xl'] * 1.2,
  },
  slideDescription: {
    fontSize: fontSize.lg,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: fontSize.lg * 1.4,
  },
  slideFooter: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: spacing.xs,
  },
  paginationDotActive: {
    backgroundColor: '#ffffff',
    width: 24,
    borderRadius: 4,
  },
  nextButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 120,
  },
  nextButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#ffffff',
  },
}); 