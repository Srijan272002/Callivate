import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../styles/theme';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  // Accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  ...props
}) => {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      // Enhanced shadow for better depth
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    };

    // Size styles with better spacing
    switch (size) {
      case 'sm':
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.sm;
        baseStyle.minHeight = 36;
        break;
      case 'lg':
        baseStyle.paddingHorizontal = spacing['3xl'];
        baseStyle.paddingVertical = spacing.lg;
        baseStyle.minHeight = 56;
        break;
      default: // md
        baseStyle.paddingHorizontal = spacing.xl;
        baseStyle.paddingVertical = spacing.md;
        baseStyle.minHeight = 44;
    }

    // Variant styles with theme support
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = theme.colors.primary;
        baseStyle.borderColor = theme.colors.primary;
        break;
      case 'secondary':
        baseStyle.backgroundColor = theme.colors.surface;
        baseStyle.borderColor = isDark ? theme.colors.textSecondary : theme.colors.surface;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderColor = theme.colors.primary;
        baseStyle.borderWidth = 2;
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderColor = 'transparent';
        baseStyle.shadowOpacity = 0;
        baseStyle.elevation = 0;
        break;
      case 'danger':
        baseStyle.backgroundColor = theme.colors.danger;
        baseStyle.borderColor = theme.colors.danger;
        break;
    }

    // Disabled state with better visual feedback
    if (disabled || loading) {
      baseStyle.opacity = 0.6;
      baseStyle.shadowOpacity = 0;
      baseStyle.elevation = 0;
    }

    // Full width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
      letterSpacing: 0.5,
    };

    // Size styles
    switch (size) {
      case 'sm':
        baseStyle.fontSize = fontSize.sm;
        break;
      case 'lg':
        baseStyle.fontSize = fontSize.lg;
        break;
      default: // md
        baseStyle.fontSize = fontSize.base;
    }

    // Variant styles with theme support
    switch (variant) {
      case 'primary':
      case 'danger':
        baseStyle.color = '#ffffff';
        break;
      case 'secondary':
        baseStyle.color = theme.colors.text;
        break;
      case 'outline':
      case 'ghost':
        baseStyle.color = theme.colors.primary;
        break;
    }

    return baseStyle;
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      // Remove opacity from here to avoid conflicts with potential layout animations
      // opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.96, { 
        damping: 15,
        stiffness: 300,
      });
      // Use simpler opacity animation to avoid conflicts
      opacity.value = withTiming(0.8, { duration: 100 });
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, { 
        damping: 15,
        stiffness: 300,
      });
      opacity.value = withTiming(1, { duration: 100 });
    }
  };

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      // Haptic feedback could be added here for iOS
      onPress({} as any);
    }
  };

  // Create a separate animated style for opacity to avoid conflicts
  const opacityStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[opacityStyle]}>
      <AnimatedTouchableOpacity
        style={[getButtonStyle(), animatedStyle, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1} // Disable built-in activeOpacity since we handle it manually
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{
          disabled: disabled || loading,
          busy: loading,
        }}
        {...props}
      >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' || variant === 'danger' ? '#ffffff' : theme.colors.primary} 
        />
      ) : (
        <>
          {leftIcon && (
            <View style={{ marginRight: spacing.sm }}>
              {leftIcon}
            </View>
          )}
          <Text style={getTextStyle()}>{title}</Text>
          {rightIcon && (
            <View style={{ marginLeft: spacing.sm }}>
              {rightIcon}
            </View>
          )}
        </>
      )}
      </AnimatedTouchableOpacity>
    </Animated.View>
  );
}; 