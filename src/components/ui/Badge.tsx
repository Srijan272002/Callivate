import React from 'react';
import { Text, View, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '../../styles/theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: colors.success[100],
          borderColor: colors.success[200],
          textColor: colors.success[700],
        };
      case 'warning':
        return {
          backgroundColor: colors.warning[100],
          borderColor: colors.warning[200],
          textColor: colors.warning[700],
        };
      case 'danger':
        return {
          backgroundColor: colors.danger[100],
          borderColor: colors.danger[200],
          textColor: colors.danger[700],
        };
      case 'info':
        return {
          backgroundColor: colors.primary[100],
          borderColor: colors.primary[200],
          textColor: colors.primary[700],
        };
      case 'secondary':
        return {
          backgroundColor: colors.gray[100],
          borderColor: colors.gray[200],
          textColor: colors.gray[700],
        };
      default:
        return {
          backgroundColor: colors.gray[100],
          borderColor: colors.gray[200],
          textColor: colors.gray[700],
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs / 2,
          fontSize: fontSize.xs,
        };
      case 'lg':
        return {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: fontSize.base,
        };
      default:
        return {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          fontSize: fontSize.sm,
        };
    }
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
    alignSelf: 'flex-start',
    ...style,
  };

  const defaultTextStyle: TextStyle = {
    fontSize: sizeStyles.fontSize,
    fontWeight: '500',
    color: variantStyles.textColor,
    ...textStyle,
  };

  return (
    <View style={containerStyle}>
      {typeof children === 'string' ? (
        <Text style={defaultTextStyle}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}; 