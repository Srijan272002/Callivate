import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  color = colors.primary[500],
  backgroundColor = colors.gray[200],
  showLabel = false,
  label,
  animated = true,
  style,
}) => {
  const progressWidth = Math.min(Math.max(progress, 0), 100);

  const containerStyle: ViewStyle = {
    width: '100%',
    height,
    backgroundColor,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...style,
  };

  const fillStyle: ViewStyle = {
    width: `${progressWidth}%`,
    height: '100%',
    backgroundColor: color,
    borderRadius: borderRadius.full,
    ...(animated && {
      // Note: React Native doesn't have built-in CSS transitions
      // You might want to use react-native-reanimated for smooth animations
    }),
  };

  const labelStyle: TextStyle = {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginTop: spacing.xs,
    textAlign: 'right',
  };

  return (
    <View>
      <View style={containerStyle}>
        <View style={fillStyle} />
      </View>
      {showLabel && (
        <Text style={labelStyle}>
          {label || `${Math.round(progressWidth)}%`}
        </Text>
      )}
    </View>
  );
}; 