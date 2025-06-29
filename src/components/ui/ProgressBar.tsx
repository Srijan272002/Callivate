import React, { useEffect } from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontSize } from '../../styles/theme';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  showLabel?: boolean;
  label?: string;
  color?: string;
  backgroundColor?: string;
  animated?: boolean;
  animationDuration?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height,
  showLabel = false,
  label,
  color,
  backgroundColor,
  animated = true,
  animationDuration = 500,
  variant = 'default',
  size = 'md',
  style,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme, isDark } = useTheme();
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    const targetProgress = Math.max(0, Math.min(100, progress));
    if (animated) {
      animatedProgress.value = withSpring(targetProgress, {
        damping: 15,
        stiffness: 100,
      });
    } else {
      animatedProgress.value = targetProgress;
    }
  }, [progress, animated]);

  const getBarHeight = () => {
    if (height) return height;
    
    switch (size) {
      case 'sm':
        return 4;
      case 'lg':
        return 12;
      default:
        return 8;
    }
  };

  const getProgressColor = () => {
    if (color) return color;
    
    switch (variant) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'danger':
        return theme.colors.danger;
      default:
        return theme.colors.primary;
    }
  };

  const getBackgroundColor = () => {
    if (backgroundColor) return backgroundColor;
    return isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  };

  const containerStyle: ViewStyle = {
    width: '100%',
    ...style,
  };

  const trackStyle: ViewStyle = {
    height: getBarHeight(),
    backgroundColor: getBackgroundColor(),
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  };

  const animatedFillStyle = useAnimatedStyle(() => {
    const width = interpolate(
      animatedProgress.value,
      [0, 100],
      [0, 100]
    );

    return {
      width: `${width}%`,
      backgroundColor: getProgressColor(),
      height: '100%',
      borderRadius: borderRadius.full,
    };
  });

  const getLabelStyle = (): TextStyle => {
    return {
      fontSize: size === 'sm' ? fontSize.xs : fontSize.sm,
      fontWeight: '500',
      color: theme.colors.text,
      textAlign: 'center',
      marginTop: showLabel ? 4 : 0,
      fontFamily: 'GowunDodum',
    };
  };

  const formatProgress = (value: number) => {
    return `${Math.round(value)}%`;
  };

  return (
    <View 
      style={containerStyle}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel || `Progress: ${formatProgress(progress)}`}
      accessibilityHint={accessibilityHint}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: progress,
      }}
    >
      <View style={trackStyle}>
        <Animated.View style={animatedFillStyle} />
      </View>
      
      {showLabel && (
        <Text style={getLabelStyle()}>
          {label || formatProgress(progress)}
        </Text>
      )}
    </View>
  );
}; 