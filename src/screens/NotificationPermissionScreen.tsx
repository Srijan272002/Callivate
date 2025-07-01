import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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

    // Check if permissions are already granted
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      // Already have permission, navigate to dashboard
      navigation?.navigate('Main', { screen: 'ToDoList' });
    }
  };

  const requestNotificationPermission = async () => {
    setRequesting(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        // Permission granted, navigate to dashboard
        navigation?.navigate('Main', { screen: 'ToDoList' });
      } else {
        // Permission denied, still proceed to dashboard
        navigation?.navigate('Main', { screen: 'ToDoList' });
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      // Still proceed to dashboard even if there's an error
      navigation?.navigate('Main', { screen: 'ToDoList' });
    } finally {
      setRequesting(false);
    }
  };

  const skipPermission = () => {
    // Skip for now, proceed to dashboard
    navigation?.navigate('Main', { screen: 'ToDoList' });
  };

  const bellAnimation = animationValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '15deg', '-15deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <View style={styles.content}>
        {/* Animated Bell Icon */}
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

        {/* Main Content */}
        <Card style={styles.contentCard} shadow="lg">
          <View style={styles.textContent}>
            <Text style={styles.title}>Stay Notified</Text>
            <Text style={styles.description}>
              To remind you about your tasks, Callivate sends you timely notifications. Please allow notification access.
            </Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="time" size={20} color={theme.colors.success} />
              </View>
              <Text style={styles.featureText}>
                Timely reminders for your scheduled tasks
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="flame" size={20} color={theme.colors.warning} />
              </View>
              <Text style={styles.featureText}>
                Streak notifications to keep you motivated
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="analytics" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.featureText}>
                Progress updates and insights
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Button
            title={requesting ? "Requesting..." : "Allow Notifications"}
            onPress={requestNotificationPermission}
            loading={requesting}
            disabled={requesting}
            size="lg"
            fullWidth
          />
          
          <Button
            title="Skip for Now"
            onPress={skipPermission}
            variant="secondary"
            size="lg"
            fullWidth
            style={styles.skipButton}
          />
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.privacyText}>
            Your privacy is important to us. We'll never spam you or share your data.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Dynamic styles function that accepts theme
const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  contentCard: {
    marginBottom: spacing.xl,
  },
  textContent: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.base * 1.6,
  },
  featuresList: {
    gap: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: fontSize.sm * 1.4,
  },
  actionContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  skipButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  privacyText: {
    fontSize: fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
}); 