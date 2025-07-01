import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { fontSize, spacing, borderRadius } from '../styles/theme';
import { useTheme } from '../hooks/useTheme';
import { Button, Card } from '../components/ui';

interface NotificationPermissionScreenProps {
  navigation?: any;
}

export const NotificationPermissionScreen: React.FC<NotificationPermissionScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [requesting, setRequesting] = useState(false);
  const [animationValue] = useState(new Animated.Value(0));

  // Create dynamic styles based on current theme
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  useEffect(() => {
    // Start animation when component mounts
    Animated.timing(animationValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const navigateToLogin = () => {
    navigation?.navigate('Loading', {
      nextScreen: 'Login',
      duration: 1500,
      simple: true,
    });
  };

  const requestNotificationPermission = async () => {
    setRequesting(true);
    try {
      await Notifications.requestPermissionsAsync();
    } catch (error) {
      Alert.alert(
        'Error',
        'Something went wrong while requesting notification permissions.'
      );
    } finally {
      setRequesting(false);
      navigateToLogin();
    }
  };

  const skipPermission = () => {
    navigateToLogin();
  };

  const bellAnimation = animationValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '15deg', '-15deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.iconContainer,
            {
              opacity: animationValue,
              transform: [
                { scale: animationValue },
                { rotate: bellAnimation },
              ],
            }
          ]}
        >
          <View style={styles.iconBackground}>
            <Ionicons name="notifications" size={64} color={theme.colors.primary} />
          </View>
        </Animated.View>

        <Card style={styles.contentCard} shadow="lg">
          <View style={styles.textContent}>
            <Text style={styles.title}>Stay on Track</Text>
            <Text style={styles.description}>
              To remind you about your tasks, Callivate sends you timely notifications. Please allow notification access.
            </Text>
          </View>

          <Button
            title={requesting ? "Requesting..." : "Allow Notifications"}
            onPress={requestNotificationPermission}
            loading={requesting}
            disabled={requesting}
            fullWidth
            size="lg"
          />

          <TouchableOpacity onPress={skipPermission} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    iconContainer: {
        marginBottom: spacing['2xl'],
    },
    iconBackground: {
        width: 120,
        height: 120,
        borderRadius: borderRadius.full,
        backgroundColor: theme.colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentCard: {
        width: '100%',
        padding: spacing.xl,
    },
    textContent: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: fontSize['2xl'],
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    description: {
        fontSize: fontSize.base,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: spacing.lg,
    },
    skipButton: {
        marginTop: spacing.lg,
        alignSelf: 'center',
    },
    skipButtonText: {
        fontSize: fontSize.base,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
}); 