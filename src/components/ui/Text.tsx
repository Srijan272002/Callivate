import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import Animated, { FadeIn, SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { fontFamily, fontSize } from '../../styles/theme';

const AnimatedText = Animated.createAnimatedComponent(RNText);

interface TextProps extends Omit<RNTextProps, 'accessibilityRole'> {
  children: React.ReactNode;
  // Typography variants
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'bodyLarge' | 'bodySmall' | 'caption' | 'label' | 'overline';
  // Weight variants
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  // Color variants
  color?: 'primary' | 'secondary' | 'text' | 'textSecondary' | 'success' | 'warning' | 'danger' | 'white' | 'inherit';
  // Text alignment
  align?: 'left' | 'center' | 'right' | 'justify';
  // Animation props
  animated?: boolean;
  animationType?: 'fadeIn' | 'slideInLeft' | 'slideInRight';
  animationDelay?: number;
}

export const Text: React.FC<TextProps> = ({ 
  style, 
  children, 
  variant = 'body',
  weight = 'normal',
  color = 'text',
  align = 'left',
  animated = false,
  animationType = 'fadeIn',
  animationDelay = 0,
  ...props 
}) => {
  const { theme } = useTheme();

  const getTypographyStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontFamily: fontFamily.primary,
      textAlign: align,
    };

    // Typography variants
    switch (variant) {
      case 'h1':
        baseStyle.fontSize = fontSize['5xl'];
        baseStyle.lineHeight = fontSize['5xl'] * 1.2;
        baseStyle.fontWeight = '700';
        break;
      case 'h2':
        baseStyle.fontSize = fontSize['4xl'];
        baseStyle.lineHeight = fontSize['4xl'] * 1.2;
        baseStyle.fontWeight = '600';
        break;
      case 'h3':
        baseStyle.fontSize = fontSize['3xl'];
        baseStyle.lineHeight = fontSize['3xl'] * 1.3;
        baseStyle.fontWeight = '600';
        break;
      case 'h4':
        baseStyle.fontSize = fontSize['2xl'];
        baseStyle.lineHeight = fontSize['2xl'] * 1.3;
        baseStyle.fontWeight = '500';
        break;
      case 'h5':
        baseStyle.fontSize = fontSize.xl;
        baseStyle.lineHeight = fontSize.xl * 1.4;
        baseStyle.fontWeight = '500';
        break;
      case 'h6':
        baseStyle.fontSize = fontSize.lg;
        baseStyle.lineHeight = fontSize.lg * 1.4;
        baseStyle.fontWeight = '500';
        break;
      case 'bodyLarge':
        baseStyle.fontSize = fontSize.lg;
        baseStyle.lineHeight = fontSize.lg * 1.5;
        baseStyle.fontWeight = '400';
        break;
      case 'body':
        baseStyle.fontSize = fontSize.base;
        baseStyle.lineHeight = fontSize.base * 1.5;
        baseStyle.fontWeight = '400';
        break;
      case 'bodySmall':
        baseStyle.fontSize = fontSize.sm;
        baseStyle.lineHeight = fontSize.sm * 1.4;
        baseStyle.fontWeight = '400';
        break;
      case 'caption':
        baseStyle.fontSize = fontSize.xs;
        baseStyle.lineHeight = fontSize.xs * 1.3;
        baseStyle.fontWeight = '400';
        break;
      case 'label':
        baseStyle.fontSize = fontSize.sm;
        baseStyle.lineHeight = fontSize.sm * 1.2;
        baseStyle.fontWeight = '500';
        baseStyle.letterSpacing = 0.5;
        break;
      case 'overline':
        baseStyle.fontSize = fontSize.xs;
        baseStyle.lineHeight = fontSize.xs * 1.2;
        baseStyle.fontWeight = '500';
        baseStyle.textTransform = 'uppercase';
        baseStyle.letterSpacing = 1;
        break;
    }

    // Weight override
    const weightMap: Record<string, any> = {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    };
    if (weight !== 'normal') {
      baseStyle.fontWeight = weightMap[weight] as any;
    }

    // Color variants
    switch (color) {
      case 'primary':
        baseStyle.color = theme.colors.primary;
        break;
      case 'secondary':
        baseStyle.color = theme.colors.secondary;
        break;
      case 'text':
        baseStyle.color = theme.colors.text;
        break;
      case 'textSecondary':
        baseStyle.color = theme.colors.textSecondary;
        break;
      case 'success':
        baseStyle.color = theme.colors.success;
        break;
      case 'warning':
        baseStyle.color = theme.colors.warning;
        break;
      case 'danger':
        baseStyle.color = theme.colors.danger;
        break;
      case 'white':
        baseStyle.color = '#ffffff';
        break;
      case 'inherit':
        // Don't set color, inherit from parent
        break;
    }

    return baseStyle;
  };

  const getAnimationEntering = () => {
    const animations = {
      fadeIn: FadeIn.delay(animationDelay),
      slideInLeft: SlideInLeft.delay(animationDelay).springify(),
      slideInRight: SlideInRight.delay(animationDelay).springify(),
    };
    return animations[animationType];
  };

  const Component = animated ? AnimatedText : RNText;

  return (
    <Component 
      style={[getTypographyStyle(), style]}
      entering={animated ? getAnimationEntering() : undefined}
      {...props}
    >
      {children}
    </Component>
  );
}; 