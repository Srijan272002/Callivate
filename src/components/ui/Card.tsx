import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius } from '../../styles/theme';

interface CardProps extends ViewProps {
  padding?: keyof typeof spacing;
  margin?: keyof typeof spacing;
  shadow?: boolean | 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  variant?: 'default' | 'elevated' | 'outlined';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  margin,
  shadow = 'md',
  border = false,
  variant = 'default',
  children,
  style,
  ...props
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: colors.gray[50],
      borderRadius: borderRadius.lg,
      padding: spacing[padding],
    };

    if (margin) {
      baseStyle.margin = spacing[margin];
    }

    // Enhanced shadow effects
    if (shadow) {
      const shadowPresets = {
        sm: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 1,
          elevation: 2,
        },
        md: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 8,
        },
        lg: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 12,
        },
        xl: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.2,
          shadowRadius: 24,
          elevation: 16,
        },
      };

      const shadowType = shadow === true ? 'md' : shadow;
      Object.assign(baseStyle, shadowPresets[shadowType]);
    }

    // Variant styles
    switch (variant) {
      case 'elevated':
        baseStyle.backgroundColor = '#ffffff';
        break;
      case 'outlined':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.gray[200];
        break;
      default:
        baseStyle.backgroundColor = '#ffffff';
    }

    if (border && variant !== 'outlined') {
      baseStyle.borderWidth = 1;
      baseStyle.borderColor = colors.gray[200];
    }

    return baseStyle;
  };

  return (
    <View style={[getCardStyle(), style]} {...props}>
      {children}
    </View>
  );
}; 