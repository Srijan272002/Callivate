import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/ui';
import { NotificationService } from '../services/notifications';

interface NotificationPermissionScreenProps {
  onPermissionGranted: () => void;
  onSkip: () => void;
}

export const NotificationPermissionScreen: React.FC<NotificationPermissionScreenProps> = ({
  onPermissionGranted,
  onSkip,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    
    try {
      const permissionResult = await NotificationService.requestPermissions();
      
      if (permissionResult.granted) {
        Alert.alert(
          '🎉 Perfect!',
          'Notifications are now enabled. You\'ll receive reminders for your tasks.',
          [{ text: 'Continue', onPress: onPermissionGranted }]
        );
      } else if (!permissionResult.canAskAgain) {
        Alert.alert(
          '⚠️ Permission Denied',
          'To enable notifications, please go to Settings > Apps > Callivate > Notifications and turn them on.',
          [
            { text: 'Skip for now', onPress: onSkip },
            { text: 'Open Settings', onPress: () => {
              // You could open device settings here
              onSkip();
            }},
          ]
        );
      } else {
        Alert.alert(
          '😔 Permission Denied',
          'Notifications help keep you on track with your goals. You can enable them later in Settings.',
          [{ text: 'Continue', onPress: onSkip }]
        );
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      Alert.alert(
        'Error',
        'Failed to request notification permission. You can try again later in Settings.',
        [{ text: 'Continue', onPress: onSkip }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="notifications" 
              size={64} 
              color={colors.primary[600]} 
            />
          </View>
          
          <Text style={styles.title}>Stay on Track</Text>
          <Text style={styles.subtitle}>
            Get gentle reminders to help you build consistent habits and achieve your goals
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="alarm" size={24} color={colors.primary[600]} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Task Reminders</Text>
              <Text style={styles.featureDescription}>
                Get notified when it's time for your scheduled tasks
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="refresh" size={24} color={colors.secondary[600]} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Follow-up Alerts</Text>
              <Text style={styles.featureDescription}>
                Gentle nudges if you miss a task or call
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="flame" size={24} color={colors.warning[600]} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Streak Updates</Text>
              <Text style={styles.featureDescription}>
                Stay motivated with streak milestones and achievements
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="cloud-offline" size={24} color={colors.gray[600]} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Offline Support</Text>
              <Text style={styles.featureDescription}>
                Get local notifications even when offline
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark" size={20} color={colors.success[600]} />
          <Text style={styles.privacyText}>
            Your privacy matters. Notifications are sent locally from your device.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title={isLoading ? 'Requesting...' : 'Enable Notifications'}
          onPress={handleRequestPermission}
          disabled={isLoading}
          style={styles.enableButton}
        />
        
        <TouchableOpacity 
          style={styles.skipButton} 
          onPress={onSkip}
          disabled={isLoading}
        >
          <Text style={styles.skipButtonText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl * 2,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  featuresContainer: {
    marginBottom: spacing.xl,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success[50],
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  privacyText: {
    fontSize: fontSize.sm,
    color: colors.success[700],
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
  actions: {
    paddingTop: spacing.lg,
  },
  enableButton: {
    marginBottom: spacing.md,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
}); 