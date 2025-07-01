import React from 'react';
import { View, ViewProps, ViewStyle, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import Animated, { FadeInUp, FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { spacing, borderRadius } from '../../styles/theme';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface CardProps extends ViewProps {
  padding?: keyof typeof spacing;
  margin?: keyof typeof spacing;
  shadow?: boolean | 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  children: React.ReactNode;
  // Animation props
  animated?: boolean;
  animationType?: 'fadeIn' | 'fadeInUp' | 'fadeInDown';
  animationDelay?: number;
  // Interaction props
  onPress?: () => void;
  pressable?: boolean;
  // Accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'none' | 'button' | 'link' | 'text';
}

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  margin,
  shadow = 'md',
  border = false,
  variant = 'default',
  children,
  style,
  animated = true,
  animationType = 'fadeInUp',
  animationDelay = 0,
  onPress,
  pressable = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'none',
  ...props
}) => {
  const { theme, isDark } = useTheme();

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.lg,
      padding: spacing[padding],
      overflow: 'hidden',
    };

    if (margin) {
      baseStyle.margin = spacing[margin];
    }

    // Enhanced shadow effects with theme awareness
    if (shadow) {
      const shadowPresets = {
        sm: {
          shadowColor: isDark ? '#000' : '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 2,
          elevation: 2,
        },
        md: {
          shadowColor: isDark ? '#000' : '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.4 : 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        lg: {
          shadowColor: isDark ? '#000' : '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.5 : 0.15,
          shadowRadius: 16,
          elevation: 12,
        },
        xl: {
          shadowColor: isDark ? '#000' : '#000',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: isDark ? 0.6 : 0.2,
          shadowRadius: 24,
          elevation: 16,
        },
      };

      const shadowType = shadow === true ? 'md' : shadow;
      Object.assign(baseStyle, shadowPresets[shadowType]);
    }

    // Variant styles with theme support
    switch (variant) {
      case 'elevated':
        baseStyle.backgroundColor = theme.colors.surface;
        break;
      case 'outlined':
        baseStyle.backgroundColor = theme.colors.background;
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = isDark ? theme.colors.textSecondary : theme.colors.surface;
        break;
      case 'glass':
        baseStyle.backgroundColor = isDark 
          ? 'rgba(255, 255, 255, 0.05)' 
          : 'rgba(255, 255, 255, 0.8)';
        break;
      default:
        baseStyle.backgroundColor = theme.colors.surface;
    }

    if (border && variant !== 'outlined') {
      baseStyle.borderWidth = 1;
      baseStyle.borderColor = isDark ? theme.colors.textSecondary : theme.colors.surface;
    }

    return baseStyle;
  };

  const getAnimationEntering = () => {
    const animations = {
      fadeIn: FadeIn.delay(animationDelay),
      fadeInUp: FadeInUp.delay(animationDelay).springify().damping(15).stiffness(200),
      fadeInDown: FadeInDown.delay(animationDelay).springify().damping(15).stiffness(200),
    };
    return animations[animationType];
  };

  // If card is pressable, use TouchableOpacity
  if (pressable || onPress) {
    if (animated) {
      // Wrap with animated container to avoid opacity conflicts
      return (
        <AnimatedView
          entering={getAnimationEntering()}
          style={style}
          {...props}
        >
          <TouchableOpacity
            style={getCardStyle()}
            onPress={onPress}
            activeOpacity={0.95}
            accessibilityRole={accessibilityRole === 'none' ? 'button' : accessibilityRole}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
          >
            {children}
          </TouchableOpacity>
        </AnimatedView>
      );
    } else {
      return (
        <TouchableOpacity
          style={[getCardStyle(), style]}
          onPress={onPress}
          activeOpacity={0.95}
          accessibilityRole={accessibilityRole === 'none' ? 'button' : accessibilityRole}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          {...props}
        >
          {children}
        </TouchableOpacity>
      );
    }
  }

  // Regular non-pressable card
  if (animated) {
    // Wrap with animated container to avoid opacity conflicts
    return (
      <AnimatedView
        entering={getAnimationEntering()}
        style={style}
        {...props}
      >
        <View
          style={getCardStyle()}
          accessibilityRole={accessibilityRole}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
        >
          {children}
        </View>
      </AnimatedView>
    );
  } else {
    return (
      <View
        style={[getCardStyle(), style]}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        {...props}
      >
        {children}
      </View>
    );
  }
}; 