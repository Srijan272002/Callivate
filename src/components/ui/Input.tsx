import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  required = false,
  leftIcon,
  rightIcon,
  secureTextEntry = false,
  showPasswordToggle = false,
  fullWidth = true,
  size = 'md',
  style,
  ...props
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.gray[50],
    };

    // Size styles
    switch (size) {
      case 'sm':
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.sm;
        break;
      case 'lg':
        baseStyle.paddingHorizontal = spacing.xl;
        baseStyle.paddingVertical = spacing.lg;
        break;
      default: // md
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.md;
    }

    // State styles
    if (error) {
      baseStyle.borderColor = colors.danger[500];
    } else if (isFocused) {
      baseStyle.borderColor = colors.primary[500];
      baseStyle.backgroundColor = colors.primary[50];
    } else {
      baseStyle.borderColor = colors.gray[300];
    }

    return baseStyle;
  };

  const getInputStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      flex: 1,
      color: colors.gray[900],
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
      color: colors.gray[700],
      marginBottom: spacing.xs,
    };
  };

  const getErrorStyle = (): TextStyle => {
    return {
      fontSize: fontSize.sm,
      color: colors.danger[500],
      marginTop: spacing.xs,
    };
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const actualSecureTextEntry = secureTextEntry && !isPasswordVisible;

  return (
    <View style={getContainerStyle()}>
      {label && (
        <Text style={getLabelStyle()}>
          {label}
          {required && <Text style={{ color: colors.danger[500] }}>*</Text>}
        </Text>
      )}
      
      <View style={getInputContainerStyle()}>
        {leftIcon && (
          <View style={{ marginRight: spacing.sm }}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          style={[getInputStyle(), style]}
          secureTextEntry={actualSecureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={colors.gray[400]}
          {...props}
        />
        
        {showPasswordToggle && secureTextEntry && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={{ marginLeft: spacing.sm }}
          >
            <Text style={{ color: colors.primary[500] }}>
              {isPasswordVisible ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        )}
        
        {rightIcon && !showPasswordToggle && (
          <View style={{ marginLeft: spacing.sm }}>
            {rightIcon}
          </View>
        )}
      </View>
      
      {error && (
        <Text style={getErrorStyle()}>
          {error}
        </Text>
      )}
    </View>
  );
}; 