import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  interpolateColor,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../styles/theme';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outlined' | 'filled' | 'underlined';
  // Animation props
  animated?: boolean;
  animationDelay?: number;
  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  required = false,
  leftIcon,
  rightIcon,
  secureTextEntry = false,
  showPasswordToggle = false,
  fullWidth = true,
  size = 'md',
  variant = 'outlined',
  animated = true,
  animationDelay = 0,
  accessibilityLabel,
  accessibilityHint,
  style,
  ...props
}) => {
  const { theme, isDark } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Animation values
  const focusProgress = useSharedValue(0);
  const errorProgress = useSharedValue(0);

  React.useEffect(() => {
    focusProgress.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused]);

  React.useEffect(() => {
    errorProgress.value = withTiming(error ? 1 : 0, { duration: 200 });
  }, [error]);

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {};
    
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    return baseStyle;
  };

  const getInputContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: borderRadius.lg,
      borderWidth: variant === 'underlined' ? 0 : 1,
      borderBottomWidth: 1,
    };

    // Size styles
    switch (size) {
      case 'sm':
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.sm;
        baseStyle.minHeight = 36;
        break;
      case 'lg':
        baseStyle.paddingHorizontal = spacing.xl;
        baseStyle.paddingVertical = spacing.lg;
        baseStyle.minHeight = 56;
        break;
      default: // md
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.md;
        baseStyle.minHeight = 44;
    }

    // Variant styles
    switch (variant) {
      case 'filled':
        baseStyle.backgroundColor = isDark 
          ? 'rgba(255, 255, 255, 0.05)' 
          : theme.colors.surface;
        break;
      case 'underlined':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderRadius = 0;
        baseStyle.paddingHorizontal = 0;
        break;
      default: // outlined
        baseStyle.backgroundColor = theme.colors.background;
    }

    return baseStyle;
  };

  const animatedInputContainerStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      errorProgress.value,
      [0, 1],
      [
        interpolateColor(
          focusProgress.value,
          [0, 1],
          [theme.colors.textSecondary, theme.colors.primary]
        ),
        theme.colors.danger
      ]
    );

    const shadowOpacity = interpolateColor(
      focusProgress.value,
      [0, 1],
      ['rgba(0,0,0,0)', isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)']
    );

    return {
      borderColor,
      shadowColor: shadowOpacity,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: focusProgress.value * 0.1,
      shadowRadius: focusProgress.value * 4,
      elevation: focusProgress.value * 2,
    };
  });

  const getInputStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      flex: 1,
      color: theme.colors.text,
      fontFamily: 'GowunDodum',
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

    return baseStyle;
  };

  const getLabelStyle = (): TextStyle => {
    return {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: error ? theme.colors.danger : theme.colors.text,
      marginBottom: spacing.xs,
      fontFamily: 'GowunDodum',
    };
  };

  const getErrorStyle = (): TextStyle => {
    return {
      fontSize: fontSize.sm,
      color: theme.colors.danger,
      marginTop: spacing.xs,
      fontFamily: 'GowunDodum',
    };
  };

  const getHelperTextStyle = (): TextStyle => {
    return {
      fontSize: fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: spacing.xs,
      fontFamily: 'GowunDodum',
    };
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
    // Announce to screen readers
    AccessibilityInfo.announceForAccessibility(
      isPasswordVisible ? 'Password hidden' : 'Password visible'
    );
  };

  const actualSecureTextEntry = secureTextEntry && !isPasswordVisible;

  return (
    <AnimatedView 
      style={getContainerStyle()}
      entering={animated ? FadeInDown.delay(animationDelay).springify() : undefined}
    >
      {label && (
        <Text style={getLabelStyle()}>
          {label}
          {required && <Text style={{ color: theme.colors.danger }}>*</Text>}
        </Text>
      )}
      
      <Animated.View style={[getInputContainerStyle(), animatedInputContainerStyle]}>
        {leftIcon && (
          <View style={{ marginRight: spacing.sm }}>
            {leftIcon}
          </View>
        )}
        
        <AnimatedTextInput
          style={[getInputStyle(), style]}
          secureTextEntry={actualSecureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={theme.colors.textSecondary}
          selectionColor={theme.colors.primary}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint}
          {...props}
        />
        
        {showPasswordToggle && secureTextEntry && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={{ 
              marginLeft: spacing.sm,
              padding: spacing.xs,
            }}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            accessibilityHint="Toggles password visibility"
          >
            <Ionicons 
              name={isPasswordVisible ? 'eye-off' : 'eye'} 
              size={20} 
              color={theme.colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !showPasswordToggle && (
          <View style={{ marginLeft: spacing.sm }}>
            {rightIcon}
          </View>
        )}
      </Animated.View>
      
      {error && (
        <AnimatedView
          entering={FadeInDown.springify()}
        >
          <Text style={getErrorStyle()}>
            {error}
          </Text>
        </AnimatedView>
      )}

      {helperText && !error && (
        <Text style={getHelperTextStyle()}>
          {helperText}
        </Text>
      )}
    </AnimatedView>
  );
}; 