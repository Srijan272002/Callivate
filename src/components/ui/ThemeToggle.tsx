import React from 'react';
import { TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolateColor 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, borderRadius } from '../../styles/theme';
import { Text } from './Text';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  style?: ViewStyle;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'md',
  showLabel = true,
  style,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const animatedValue = useSharedValue(isDark ? 1 : 0);

  React.useEffect(() => {
    animatedValue.value = withSpring(isDark ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [isDark]);

  const getToggleSize = () => {
    switch (size) {
      case 'sm':
        return { width: 44, height: 24, knobSize: 18 };
      case 'lg':
        return { width: 60, height: 32, knobSize: 26 };
      default:
        return { width: 52, height: 28, knobSize: 22 };
    }
  };

  const toggleSize = getToggleSize();

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    ...style,
  };

  const trackStyle: ViewStyle = {
    width: toggleSize.width,
    height: toggleSize.height,
    borderRadius: toggleSize.height / 2,
    padding: 3,
    justifyContent: 'center',
  };

  const animatedTrackStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      animatedValue.value,
      [0, 1],
      [theme.colors.textSecondary + '30', theme.colors.primary]
    );

    return {
      backgroundColor,
    };
  });

  const animatedKnobStyle = useAnimatedStyle(() => {
    const translateX = animatedValue.value * (toggleSize.width - toggleSize.knobSize - 6);
    
    return {
      transform: [{ translateX }],
      width: toggleSize.knobSize,
      height: toggleSize.knobSize,
      borderRadius: toggleSize.knobSize / 2,
      backgroundColor: '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
    };
  });

  const handlePress = () => {
    toggleTheme();
  };

  return (
    <View style={containerStyle}>
      {showLabel && (
        <Text 
          variant="body" 
          color="text" 
          style={{ marginRight: spacing.md }}
        >
          Dark Mode
        </Text>
      )}
      
      <AnimatedTouchableOpacity
        style={[trackStyle, animatedTrackStyle]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityRole="switch"
        accessibilityLabel="Dark mode toggle"
        accessibilityHint="Switches between light and dark theme"
        accessibilityState={{ checked: isDark }}
      >
        <Animated.View style={animatedKnobStyle}>
          <View 
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons
              name={isDark ? 'moon' : 'sunny'}
              size={toggleSize.knobSize * 0.6}
              color={theme.colors.primary}
            />
          </View>
        </Animated.View>
      </AnimatedTouchableOpacity>
      
      {!showLabel && (
        <Text 
          variant="bodySmall" 
          color="textSecondary" 
          style={{ marginLeft: spacing.sm }}
        >
          {isDark ? 'Dark' : 'Light'}
        </Text>
      )}
    </View>
  );
}; 