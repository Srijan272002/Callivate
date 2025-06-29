import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Card, Button, Badge } from '../components/ui';
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Voice</Text>
          <View style={styles.modalRight} />
        </View>

        <ScrollView style={styles.modalContent}>
          {mockVoices.map((voice) => (
            <TouchableOpacity
              key={voice.id}
              style={[
                styles.voiceOption,
                selectedVoiceId === voice.id && styles.voiceOptionSelected
              ]}
              onPress={() => handleSelectVoice(voice.id)}
            >
              <View style={styles.voiceOptionLeft}>
                <Ionicons
                  name={voice.isCustom ? 'mic' : 'volume-high'}
                  size={20}
                  color={colors.gray[600]}
                />
                <View style={styles.voiceInfo}>
                  <Text style={styles.voiceOptionName}>{voice.name}</Text>
                  {voice.isDefault && (
                    <Badge variant="secondary" size="sm">Default</Badge>
                  )}
                  {voice.isCustom && (
                    <Badge variant="info" size="sm">Custom</Badge>
                  )}
                </View>
              </View>

              <View style={styles.voiceActions}>
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={() => handleTestVoice(voice)}
                >
                  <Ionicons name="play" size={16} color={colors.primary[600]} />
                  <Text style={styles.testButtonText}>Test</Text>
                </TouchableOpacity>
                
                {selectedVoiceId === voice.id && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary[600]} />
                )}
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addVoiceButton}>
            <Ionicons name="add" size={20} color={colors.primary[600]} />
            <Text style={styles.addVoiceText}>Record Custom Voice</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export const SettingsScreen: React.FC = () => {
  const { signOut, user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(mockSettings);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  const selectedVoice = mockVoices.find(v => v.id === settings.defaultVoiceId);

  const handleToggleSetting = (key: keyof UserSettings, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleVoiceSelection = (voiceId: string) => {
    handleToggleSetting('defaultVoiceId', voiceId);
  };

  const handleClearCallHistory = () => {
    Alert.alert(
      'Clear Call History',
      'This will permanently delete all your call history and recordings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Call history has been cleared.');
          },
        },
      ]
    );
  };

  const handleResetStreaks = () => {
    Alert.alert(
      'Reset Streaks',
      'This will reset all your streaks to zero. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'All streaks have been reset.');
          },
        },
      ]
    );
  };

  const handleDeleteAllNotes = () => {
    Alert.alert(
      'Delete All Notes',
      'This will permanently delete all your notes. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'All notes have been deleted.');
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Your data will be prepared for export. You will receive a download link via email.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? Type "DELETE" to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm Delete', style: 'destructive' },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <Card style={styles.profileCard} shadow="sm">
          <View style={styles.profileInfo}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={32} color={colors.gray[600]} />
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>
                {user?.name || user?.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </Card>

        {/* Voice & Audio Settings */}
        <Card style={styles.settingsCard} shadow="sm">
          <Text style={styles.cardTitle}>Voice & Audio</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setVoiceModalVisible(true)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="volume-high" size={20} color={colors.gray[600]} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Default Voice</Text>
                <Text style={styles.settingValue}>{selectedVoice?.name}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-off" size={20} color={colors.gray[600]} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Silent Mode Default</Text>
                <Text style={styles.settingSubtitle}>Use notifications instead of calls</Text>
              </View>
            </View>
            <Switch
              value={settings.enableSilentMode}
              onValueChange={(value) => handleToggleSetting('enableSilentMode', value)}
              trackColor={{ false: colors.gray[300], true: colors.primary[200] }}
              thumbColor={settings.enableSilentMode ? colors.primary[500] : colors.gray[500]}
            />
          </View>
        </Card>

        {/* Notifications */}
        <Card style={styles.settingsCard} shadow="sm">
          <Text style={styles.cardTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications" size={20} color={colors.gray[600]} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingSubtitle}>Reminders and updates</Text>
              </View>
            </View>
            <Switch
              value={settings.enableNotifications}
              onValueChange={(value) => handleToggleSetting('enableNotifications', value)}
              trackColor={{ false: colors.gray[300], true: colors.primary[200] }}
              thumbColor={settings.enableNotifications ? colors.primary[500] : colors.gray[500]}
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="time" size={20} color={colors.gray[600]} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Notification Schedule</Text>
                <Text style={styles.settingValue}>Customize timing</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </TouchableOpacity>
        </Card>

        {/* Preferences */}
        <Card style={styles.settingsCard} shadow="sm">
          <Text style={styles.cardTitle}>Preferences</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="time-outline" size={20} color={colors.gray[600]} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Time Format</Text>
                <Text style={styles.settingValue}>
                  {settings.preferredTimeFormat === '12h' ? '12 Hour' : '24 Hour'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="globe" size={20} color={colors.gray[600]} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Language</Text>
                <Text style={styles.settingValue}>English</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </TouchableOpacity>
        </Card>

        {/* Privacy & Data */}
        <Card style={styles.settingsCard} shadow="sm">
          <Text style={styles.cardTitle}>Privacy & Data</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleClearCallHistory}>
            <View style={styles.settingLeft}>
              <Ionicons name="call" size={20} color={colors.warning[600]} />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.warning[700] }]}>
                  Clear Call History
                </Text>
                <Text style={styles.settingSubtitle}>Delete all call recordings</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleResetStreaks}>
            <View style={styles.settingLeft}>
              <Ionicons name="refresh" size={20} color={colors.warning[600]} />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.warning[700] }]}>
                  Reset Streaks
                </Text>
                <Text style={styles.settingSubtitle}>Reset all streak counters</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAllNotes}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text" size={20} color={colors.warning[600]} />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.warning[700] }]}>
                  Delete All Notes
                </Text>
                <Text style={styles.settingSubtitle}>Permanently remove all notes</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleExportData}>
            <View style={styles.settingLeft}>
              <Ionicons name="download" size={20} color={colors.primary[600]} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Export Data</Text>
                <Text style={styles.settingSubtitle}>Download your data</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </TouchableOpacity>
        </Card>

        {/* Support & About */}
        <Card style={styles.settingsCard} shadow="sm">
          <Text style={styles.cardTitle}>Support & About</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle" size={20} color={colors.gray[600]} />
              <Text style={styles.settingLabel}>Help & FAQ</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="mail" size={20} color={colors.gray[600]} />
              <Text style={styles.settingLabel}>Contact Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text" size={20} color={colors.gray[600]} />
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="information-circle" size={20} color={colors.gray[600]} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>About Callivate</Text>
                <Text style={styles.settingValue}>Version 1.0.0</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </TouchableOpacity>
        </Card>

        {/* Danger Zone */}
        <Card style={styles.dangerCard} shadow="sm">
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          
          <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
            <View style={styles.settingLeft}>
              <Ionicons name="trash" size={20} color={colors.danger[600]} />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.danger[700] }]}>
                  Delete Account
                </Text>
                <Text style={styles.settingSubtitle}>Permanently delete your account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </TouchableOpacity>
        </Card>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            title="Sign Out"
            variant="ghost"
            onPress={signOut}
            style={styles.logoutButton}
          />
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Voice Selection Modal */}
      <VoiceSelectionModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        selectedVoiceId={settings.defaultVoiceId}
        onSelectVoice={handleVoiceSelection}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  profileCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs / 2,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  settingsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  settingLabel: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.gray[900],
    marginBottom: spacing.xs / 2,
  },
  settingSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  settingValue: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  dangerCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger[200],
  },
  dangerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.danger[700],
    marginBottom: spacing.md,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  logoutContainer: {
    marginVertical: spacing.lg,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  bottomSpacing: {
    height: spacing.xl,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalCancel: {
    fontSize: fontSize.base,
    color: colors.gray[600],
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  modalRight: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  voiceOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  voiceOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voiceInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  voiceOptionName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.gray[900],
    marginBottom: spacing.xs / 2,
  },
  voiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.md,
    gap: spacing.xs / 2,
  },
  testButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary[700],
    fontWeight: '500',
  },
  addVoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary[200],
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  addVoiceText: {
    fontSize: fontSize.base,
    color: colors.primary[700],
    fontWeight: '500',
  },
}); 