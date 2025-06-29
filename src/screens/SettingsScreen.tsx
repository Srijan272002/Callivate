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
import { spacing, borderRadius } from '../styles/theme';
import { Card, Button, Badge, Text, ThemeToggle } from '../components/ui';
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

export const SettingsScreen: React.FC = () => {
  const { signOut, user } = useAuth();
  const { theme } = useTheme();
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
            Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
            signOut();
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    sectionTitle: {
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    userInfo: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Section */}
        <Card animated shadow="lg" style={{ marginBottom: spacing.lg }}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color={theme.colors.primary} />
            </View>
            <Text variant="h5" color="text" style={{ marginBottom: 4 }}>
              {user?.name || user?.email?.split('@')[0] || 'User'}
            </Text>
            <Text variant="bodySmall" color="textSecondary">
              {user?.email}
            </Text>
          </View>
        </Card>

        {/* Appearance Section */}
        <Text variant="h6" color="text" style={styles.sectionTitle}>
          Appearance
        </Text>
        <Card animated animationDelay={100} shadow="md" style={{ marginBottom: spacing.lg }}>
          <View style={styles.settingRow}>
            <ThemeToggle />
          </View>
        </Card>

        {/* Voice & Notifications */}
        <Text variant="h6" color="text" style={styles.sectionTitle}>
          Voice & Notifications
        </Text>
        <Card animated animationDelay={200} shadow="md" style={{ marginBottom: spacing.lg }}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setVoiceModalVisible(true)}
          >
            <View>
              <Text variant="body" color="text">Default Voice</Text>
              <Text variant="bodySmall" color="textSecondary">
                {selectedVoice?.name || 'Select voice'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: theme.colors.textSecondary + '10' }]}>
            <View>
              <Text variant="body" color="text">Push Notifications</Text>
              <Text variant="bodySmall" color="textSecondary">
                Get notified about reminders
              </Text>
            </View>
            <Switch
              value={settings.enableNotifications}
              onValueChange={(value) => handleToggleSetting('enableNotifications', value)}
              trackColor={{ false: theme.colors.textSecondary + '30', true: theme.colors.primary + '50' }}
              thumbColor={settings.enableNotifications ? theme.colors.primary : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: theme.colors.textSecondary + '10' }]}>
            <View>
              <Text variant="body" color="text">Silent Mode</Text>
              <Text variant="bodySmall" color="textSecondary">
                Use notifications instead of calls
              </Text>
            </View>
            <Switch
              value={settings.enableSilentMode}
              onValueChange={(value) => handleToggleSetting('enableSilentMode', value)}
              trackColor={{ false: theme.colors.textSecondary + '30', true: theme.colors.primary + '50' }}
              thumbColor={settings.enableSilentMode ? theme.colors.primary : '#f4f3f4'}
            />
          </View>
        </Card>

        {/* Data & Privacy */}
        <Text variant="h6" color="text" style={styles.sectionTitle}>
          Data & Privacy
        </Text>
        <Card animated animationDelay={300} shadow="md" style={{ marginBottom: spacing.lg }}>
          <Button
            title="Clear Call History"
            variant="outline"
            size="md"
            onPress={handleClearCallHistory}
            style={{ marginBottom: spacing.md }}
            accessibilityHint="Clears all call history and recordings"
          />
          <Button
            title="Reset Streaks"
            variant="outline"
            size="md"
            onPress={handleResetStreaks}
            style={{ marginBottom: spacing.md }}
            accessibilityHint="Resets all achievement streaks to zero"
          />
          <Button
            title="Delete All Notes"
            variant="outline"
            size="md"
            onPress={handleDeleteAllNotes}
            style={{ marginBottom: spacing.md }}
            accessibilityHint="Permanently deletes all saved notes"
          />
          <Button
            title="Export Data"
            variant="outline"
            size="md"
            onPress={handleExportData}
            accessibilityHint="Downloads a copy of your data"
          />
        </Card>

        {/* Account Actions */}
        <Text variant="h6" color="text" style={styles.sectionTitle}>
          Account
        </Text>
        <Card animated animationDelay={400} shadow="md" style={{ marginBottom: spacing.xl }}>
          <Button
            title="Sign Out"
            variant="outline"
            size="md"
            onPress={signOut}
            style={{ marginBottom: spacing.md }}
            leftIcon={<Ionicons name="log-out-outline" size={18} color={theme.colors.textSecondary} />}
            accessibilityHint="Signs out of your account"
          />
          <Button
            title="Delete Account"
            variant="danger"
            size="md"
            onPress={handleDeleteAccount}
            leftIcon={<Ionicons name="trash-outline" size={18} color="#ffffff" />}
            accessibilityHint="Permanently deletes your account and all data"
          />
        </Card>
      </ScrollView>

      <VoiceSelectionModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        selectedVoiceId={settings.defaultVoiceId}
        onSelectVoice={handleVoiceSelection}
      />
    </SafeAreaView>
  );
}; 