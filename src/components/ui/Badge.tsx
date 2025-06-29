import React from 'react';
import { Text, View, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, ZoomIn, BounceIn } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../styles/theme';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'outlined';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  // Interaction props
  onPress?: () => void;
  disabled?: boolean;
  // Animation props
  animated?: boolean;
  animationType?: 'fadeIn' | 'zoomIn' | 'bounceIn';
  animationDelay?: number;
  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'text' | 'button';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
  onPress,
  disabled = false,
  animated = true,
  animationType = 'fadeIn',
  animationDelay = 0,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
}) => {
  const { theme, isDark } = useTheme();

  const getVariantStyles = () => {
    const alpha = isDark ? 0.15 : 0.1;
    const textAlpha = isDark ? 0.9 : 0.8;

    switch (variant) {
      case 'success':
        return {
          backgroundColor: isDark 
            ? `rgba(74, 222, 128, ${alpha})` 
            : theme.colors.success + '20',
          borderColor: theme.colors.success + (isDark ? '40' : '30'),
          textColor: theme.colors.success,
        };
      case 'warning':
        return {
          backgroundColor: isDark 
            ? `rgba(251, 191, 36, ${alpha})` 
            : theme.colors.warning + '20',
          borderColor: theme.colors.warning + (isDark ? '40' : '30'),
          textColor: theme.colors.warning,
        };
      case 'danger':
        return {
          backgroundColor: isDark 
            ? `rgba(248, 113, 113, ${alpha})` 
            : theme.colors.danger + '20',
          borderColor: theme.colors.danger + (isDark ? '40' : '30'),
          textColor: theme.colors.danger,
        };
      case 'info':
        return {
          backgroundColor: isDark 
            ? `rgba(56, 189, 248, ${alpha})` 
            : theme.colors.primary + '20',
          borderColor: theme.colors.primary + (isDark ? '40' : '30'),
          textColor: theme.colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: isDark 
            ? 'rgba(168, 162, 158, 0.1)' 
            : theme.colors.secondary + '10',
          borderColor: theme.colors.textSecondary + '30',
          textColor: theme.colors.textSecondary,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderColor: theme.colors.textSecondary,
          textColor: theme.colors.text,
        };
      default:
        return {
          backgroundColor: isDark 
            ? 'rgba(168, 162, 158, 0.1)' 
            : theme.colors.surface,
          borderColor: theme.colors.textSecondary + '20',
          textColor: theme.colors.text,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return {
          paddingHorizontal: spacing.xs,
          paddingVertical: 2,
          fontSize: fontSize.xs,
          minHeight: 16,
        };
      case 'sm':
        return {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs / 2,
          fontSize: fontSize.xs,
          minHeight: 20,
        };
      case 'lg':
        return {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: fontSize.base,
          minHeight: 32,
        };
      default: // md
        return {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          fontSize: fontSize.sm,
          minHeight: 24,
        };
    }
  };

  const getAnimationEntering = () => {
    const animations = {
      fadeIn: FadeIn.delay(animationDelay),
      zoomIn: ZoomIn.delay(animationDelay).springify(),
      bounceIn: BounceIn.delay(animationDelay),
    };
    return animations[animationType];
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const containerStyle: ViewStyle = {
    backgroundColor: variantStyles.backgroundColor,
    borderWidth: 1,
    borderColor: variantStyles.borderColor,
    borderRadius: borderRadius.full,
    paddingHorizontal: sizeStyles.paddingHorizontal,
    paddingVertical: sizeStyles.paddingVertical,
    minHeight: sizeStyles.minHeight,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  const defaultTextStyle: TextStyle = {
    fontSize: sizeStyles.fontSize,
    fontWeight: '500',
    color: variantStyles.textColor,
    fontFamily: 'GowunDodum',
    textAlign: 'center',
    ...textStyle,
  };

  const Component = onPress ? AnimatedTouchableOpacity : AnimatedView;

  return (
    <Component
      style={containerStyle}
      onPress={!disabled ? onPress : undefined}
      disabled={disabled}
      entering={animated ? getAnimationEntering() : undefined}
      activeOpacity={onPress ? 0.8 : 1}
      accessibilityRole={accessibilityRole || (onPress ? 'button' : 'text')}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: disabled,
      }}
    >
      {typeof children === 'string' ? (
        <Text style={defaultTextStyle}>{children}</Text>
      ) : (
        children
      )}
    </Component>
  );
}; 