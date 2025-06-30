import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, borderRadius, fontSize } from '../styles/theme';
import { Card, Button, Badge, Text } from '../components/ui';
import { Voice, UserSettings } from '../types';
import { useAuth } from '../hooks/useAuth';

// Mock data
const mockVoices: Voice[] = [
  { id: '1', name: 'Default Female', isDefault: true, isCustom: false },
  { id: '2', name: 'Default Male', isDefault: false, isCustom: false },
  { id: '3', name: 'Calm Voice', isDefault: false, isCustom: false },
  { id: '4', name: 'Energetic Voice', isDefault: false, isCustom: false },
  { id: '5', name: 'My Custom Voice', isDefault: false, isCustom: true, audioUrl: 'custom_voice.mp3' },
];

const mockSettings: UserSettings = {
  id: '1',
  userId: 'user1',
  defaultVoiceId: '1',
  enableNotifications: true,
  enableSilentMode: false,
  preferredTimeFormat: '12h',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

interface VoiceSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  selectedVoiceId?: string;
  onSelectVoice: (voiceId: string) => void;
}

const VoiceSelectionModal: React.FC<VoiceSelectionModalProps> = ({
  visible,
  onClose,
  selectedVoiceId,
  onSelectVoice,
}) => {
  const { theme } = useTheme();

  const handleSelectVoice = (voiceId: string) => {
    onSelectVoice(voiceId);
    onClose();
  };

  const handleTestVoice = (voice: Voice) => {
    Alert.alert(
      'Voice Preview',
      `Playing sample: "${voice.name}"`,
      [{ text: 'OK' }]
    );
  };

  const modalStyles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.textSecondary + '20',
    },
    modalContent: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={modalStyles.modalContainer}>
        <View style={modalStyles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text variant="body" color="primary">Cancel</Text>
          </TouchableOpacity>
          <Text variant="h6" color="text">Select Voice</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={modalStyles.modalContent}>
          {mockVoices.map((voice, index) => (
            <Card
              key={voice.id}
              animated
              animationDelay={index * 100}
              pressable
              onPress={() => handleSelectVoice(voice.id)}
              variant={selectedVoiceId === voice.id ? 'elevated' : 'default'}
              style={{ 
                marginVertical: spacing.xs,
                borderWidth: selectedVoiceId === voice.id ? 2 : 0,
                borderColor: selectedVoiceId === voice.id ? theme.colors.primary : 'transparent',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons
                    name={voice.isCustom ? 'mic' : 'volume-high'}
                    size={20}
                    color={theme.colors.textSecondary}
                    style={{ marginRight: spacing.md }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="body" color="text" style={{ marginBottom: 4 }}>
                      {voice.name}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                      {voice.isDefault && (
                        <Badge variant="secondary" size="sm">Default</Badge>
                      )}
                      {voice.isCustom && (
                        <Badge variant="info" size="sm">Custom</Badge>
                      )}
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: borderRadius.md,
                      backgroundColor: theme.colors.primary + '20',
                    }}
                    onPress={() => handleTestVoice(voice)}
                  >
                    <Ionicons name="play" size={14} color={theme.colors.primary} />
                    <Text variant="caption" color="primary" style={{ marginLeft: 4 }}>
                      Test
                    </Text>
                  </TouchableOpacity>
                  
                  {selectedVoiceId === voice.id && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  )}
                </View>
              </View>
            </Card>
          ))}

          <Card
            animated
            animationDelay={mockVoices.length * 100}
            pressable
            variant="outlined"
            style={{ 
              marginVertical: spacing.md,
              borderStyle: 'dashed',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add" size={20} color={theme.colors.primary} />
              <Text variant="body" color="primary" style={{ marginLeft: spacing.sm }}>
                Record Custom Voice
              </Text>
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

interface SettingsScreenProps {
  navigation?: any;
}

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: 'navigation' | 'toggle' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  destructive?: boolean;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { signOut, user, signingOut } = useAuth();
  
  // Local settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Create dynamic styles based on current theme
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Navigation will be handled by auth state change
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const settingSections = [
    {
      title: 'Notifications',
      items: [
        {
          id: 'notifications',
          title: 'Push Notifications',
          subtitle: 'Receive reminders and updates',
          icon: 'notifications-outline',
          type: 'toggle' as const,
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          id: 'privacy',
          title: 'Privacy Policy',
          subtitle: 'View our privacy policy',
          icon: 'shield-checkmark-outline',
          type: 'navigation' as const,
          onPress: () => navigation?.navigate('PrivacyPolicy'),
        },
        {
          id: 'terms',
          title: 'Terms of Service',
          subtitle: 'View our terms of service',
          icon: 'document-text-outline',
          type: 'navigation' as const,
          onPress: () => navigation?.navigate('TermsOfService'),
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.settingItem,
          item.destructive && styles.destructiveItem
        ]}
        onPress={item.type === 'navigation' ? item.onPress : undefined}
        disabled={item.type === 'toggle'}
      >
        <View style={styles.settingLeft}>
          <View style={[
            styles.settingIcon,
            item.destructive && styles.destructiveIcon
          ]}>
            <Ionicons 
              name={item.icon as any} 
              size={22} 
              color={item.destructive ? theme.colors.danger : theme.colors.primary} 
            />
          </View>
          <View style={styles.settingContent}>
            <Text style={[
              styles.settingTitle,
              item.destructive && styles.destructiveText
            ]}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            )}
          </View>
        </View>

        <View style={styles.settingRight}>
          {item.type === 'toggle' && (
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              trackColor={{ 
                false: isDark ? theme.colors.textSecondary + '30' : theme.colors.textSecondary + '20', 
                true: theme.colors.primary + '50' 
              }}
              thumbColor={item.value ? theme.colors.primary : (isDark ? '#ffffff' : '#f4f3f4')}
            />
          )}
          {item.type === 'navigation' && (
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={theme.colors.textSecondary} 
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
       
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        {user && (
          <Card style={styles.userCard} shadow="md">
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{user.name || 'User'}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>
          </Card>
        )}



        {/* Settings Sections */}
        {settingSections.map((section, sectionIndex) => (
          <Card key={section.title} style={styles.sectionCard} shadow="sm">
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <View key={item.id}>
                  {renderSettingItem(item)}
                  {itemIndex < section.items.length - 1 && (
                    <View style={styles.separator} />
                  )}
                </View>
              ))}
            </View>
          </Card>
        ))}

        {/* Sign Out Button */}
        <Card style={styles.signOutCard} shadow="sm">
          <Button
            title={signingOut ? "Signing Out..." : "Sign Out"}
            onPress={handleSignOut}
            loading={signingOut}
            disabled={signingOut}
            variant="danger"
            size="lg"
            fullWidth
          />
        </Card>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Dynamic styles function that accepts theme
const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? theme.colors.textSecondary + '20' : theme.colors.textSecondary + '10',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  userCard: {
    marginBottom: spacing.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#ffffff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.xs / 2,
  },
  userEmail: {
    fontSize: fontSize.base,
    color: theme.colors.textSecondary,
  },

  sectionCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  sectionContent: {
    gap: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  destructiveItem: {
    backgroundColor: theme.colors.danger + '10',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  destructiveIcon: {
    backgroundColor: theme.colors.danger + '20',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: spacing.xs / 2,
  },
  destructiveText: {
    color: theme.colors.danger,
  },
  settingSubtitle: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
  },
  settingRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: isDark ? theme.colors.textSecondary + '20' : theme.colors.textSecondary + '10',
    marginLeft: 56,
  },
  signOutCard: {
    marginBottom: spacing.lg,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
}); 