import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
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
  ...props
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.lg,
      borderWidth: 1,
    };

    // Size styles
    switch (size) {
      case 'sm':
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.sm;
        break;
      case 'lg':
        baseStyle.paddingHorizontal = spacing['2xl'];
        baseStyle.paddingVertical = spacing.lg;
        break;
      default: // md
        baseStyle.paddingHorizontal = spacing.xl;
        baseStyle.paddingVertical = spacing.md;
    }

    // Variant styles
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = colors.primary[500];
        baseStyle.borderColor = colors.primary[500];
        break;
      case 'secondary':
        baseStyle.backgroundColor = colors.secondary[100];
        baseStyle.borderColor = colors.secondary[200];
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderColor = colors.primary[500];
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderColor = 'transparent';
        break;
      case 'danger':
        baseStyle.backgroundColor = colors.danger[500];
        baseStyle.borderColor = colors.danger[500];
        break;
    }

    // Disabled state
    if (disabled || loading) {
      baseStyle.opacity = 0.6;
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

    // Variant styles
    switch (variant) {
      case 'primary':
      case 'danger':
        baseStyle.color = '#ffffff';
        break;
      case 'secondary':
        baseStyle.color = colors.secondary[700];
        break;
      case 'outline':
      case 'ghost':
        baseStyle.color = colors.primary[500];
        break;
    }

    return baseStyle;
  };

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress({} as any);
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {leftIcon && !loading && leftIcon}
      
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' || variant === 'danger' ? '#ffffff' : colors.primary[500]} 
        />
      ) : (
        <>
          {leftIcon && <Text style={{ marginRight: spacing.sm }} />}
          <Text style={getTextStyle()}>{title}</Text>
          {rightIcon && <Text style={{ marginLeft: spacing.sm }} />}
        </>
      )}
      
      {rightIcon && !loading && rightIcon}
    </TouchableOpacity>
  );
}; 