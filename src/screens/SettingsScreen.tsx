import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { PhoneNumberInput } from '../components/forms/PhoneNumberInput';
import { Badge, Button, Card, Text } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { CallingService, Voice, VoiceService } from '../services';
import { borderRadius, fontSize, spacing } from '../styles/theme';
import { UserSettings } from '../types';

// Mock settings data
const mockSettings: UserSettings = {
  id: '1',
  userId: 'user1',
  defaultVoiceId: 'browser-default-female',
  enableNotifications: true,
  enableSilentMode: false,
  preferredTimeFormat: '12h',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

interface PhoneNumberModalProps {
  visible: boolean;
  onClose: () => void;
  currentPhone?: string;
  onSave: (phoneNumber: string) => Promise<void>;
}

const PhoneNumberModal: React.FC<PhoneNumberModalProps> = ({
  visible,
  onClose,
  currentPhone,
  onSave,
}) => {
  const { theme } = useTheme();
  const [phoneNumber, setPhoneNumber] = useState(currentPhone || '');
  const [isValid, setIsValid] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!isValid) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
      return;
    }

    try {
      setSaving(true);
      await onSave(phoneNumber);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save phone number. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!isValid) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number first.');
      return;
    }

    try {
      setSaving(true);
      const result = await CallingService.testCall(phoneNumber);
      
      if (result.success) {
        Alert.alert(
          'Test Call Scheduled! 📞',
          'A test call has been scheduled. Please answer your phone and say hello when it rings!',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Test Call Failed',
          result.error || 'Failed to schedule test call. Your number will still be saved.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      Alert.alert('Test Failed', 'Failed to test calling. Your number will still be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.textSecondary
        }}>
          <Text variant="h3" color="text">Phone Number</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={{ flex: 1, padding: spacing.lg }}>
          <Text variant="body" color="textSecondary" style={{ marginBottom: spacing.lg }}>
            Add your phone number to enable AI voice calls for task reminders. 
            This feature is completely free and helps improve task accountability.
          </Text>

          <PhoneNumberInput
            value={phoneNumber}
            onChangePhoneNumber={(phone, valid) => {
              setPhoneNumber(phone);
              setIsValid(valid);
            }}
            label="Phone Number"
            placeholder="Enter your phone number"
            showPrivacyNotice={true}
            required={true}
          />

          <View style={{ 
            backgroundColor: theme.colors.primary + '20',
            padding: spacing.md,
            borderRadius: borderRadius.md,
            marginVertical: spacing.lg
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
              <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
              <Text variant="bodyLarge" color="primary" style={{ marginLeft: spacing.xs }}>
                AI Calling Benefits
              </Text>
            </View>
            <Text variant="body" color="text" style={{ marginBottom: spacing.xs }}>
              • Personalized AI conversations about your tasks
            </Text>
            <Text variant="body" color="text" style={{ marginBottom: spacing.xs }}>
              • Better accountability than notifications
            </Text>
            <Text variant="body" color="text" style={{ marginBottom: spacing.xs }}>
              • Automatic fallback to notifications if needed
            </Text>
            <Text variant="body" color="text">
              • 100% free - no charges to you ever!
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
            <Button
              title="Test Call"
              onPress={handleTest}
              disabled={!isValid || saving}
              loading={saving}
              variant="secondary"
              style={{ flex: 1 }}
            />
            <Button
              title="Save"
              onPress={handleSave}
              disabled={!isValid || saving}
              loading={saving}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
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
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadVoices();
    }
  }, [visible]);

  const loadVoices = async () => {
    try {
      setLoading(true);
      const [allVoices, recommendations] = await Promise.all([
        VoiceService.getVoices(true), // Include premium voices
        VoiceService.getVoiceRecommendations()
      ]);
      
      // Merge and prioritize recommended voices
      const voiceMap = new Map<string, Voice>();
      
      // Add all voices
      allVoices.forEach(voice => voiceMap.set(voice.id, voice));
      
      // Mark recommended voices
      recommendations.forEach(recVoice => {
        if (voiceMap.has(recVoice.id)) {
          const voice = voiceMap.get(recVoice.id)!;
          voice.is_recommended = true;
          voiceMap.set(recVoice.id, voice);
        }
      });
      
      // Sort: free first, then by recommendation, then by quality
      const sortedVoices = Array.from(voiceMap.values()).sort((a, b) => {
        if (a.is_free !== b.is_free) return a.is_free ? -1 : 1;
        if (a.is_recommended !== b.is_recommended) return a.is_recommended ? -1 : 1;
        return b.quality_score - a.quality_score;
      });
      
      setVoices(sortedVoices);
    } catch (error) {
      console.error('Failed to load voices:', error);
      setVoices(VoiceService.getFallbackVoices());
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVoice = async (voiceId: string) => {
    try {
      await VoiceService.setDefaultVoice(voiceId);
      onSelectVoice(voiceId);
      onClose();
    } catch (error) {
      console.error('Failed to set default voice:', error);
      Alert.alert('Error', 'Failed to set default voice. Please try again.');
    }
  };

  const handleTestVoice = async (voice: Voice) => {
    if (previewing) {
      return; // Already previewing another voice
    }

    try {
      setPreviewing(voice.id);
      await VoiceService.previewVoice(voice.id);
    } catch (error) {
      console.error('Failed to preview voice:', error);
      Alert.alert(
        'Preview Error', 
        voice.is_free 
          ? 'Speech synthesis not available on this device' 
          : 'Failed to generate voice preview. Please check your connection.'
      );
    } finally {
      setPreviewing(null);
    }
  };

  const stopPreview = async () => {
    try {
      await VoiceService.stopCurrentAudio();
      setPreviewing(null);
    } catch (error) {
      console.error('Failed to stop preview:', error);
    }
  };

  const renderVoiceCard = (voice: Voice, index: number) => {
    const isSelected = selectedVoiceId === voice.id;
    const isPreviewing = previewing === voice.id;
    const costText = voice.is_free ? 'Free' : `~$${VoiceService.getVoiceCost(voice, 100).toFixed(4)}/100 chars`;

    return (
      <Card
        key={voice.id}
        animated
        animationDelay={index * 100}
        pressable
        onPress={() => handleSelectVoice(voice.id)}
        variant={isSelected ? 'elevated' : 'default'}
        style={{ 
          marginVertical: spacing.xs,
          borderWidth: isSelected ? 2 : 0,
          borderColor: isSelected ? theme.colors.primary : 'transparent',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons
              name={voice.provider === 'browser' ? 'phone-portrait' : 'cloud'}
              size={20}
              color={voice.is_free ? theme.colors.success : theme.colors.primary}
              style={{ marginRight: spacing.md }}
            />
            <View style={{ flex: 1 }}>
              <Text variant="body" color="text" style={{ marginBottom: 4 }}>
                {voice.name}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                {voice.is_free && (
                  <Badge variant="success" size="sm">Free</Badge>
                )}
                {voice.is_premium && (
                  <Badge variant="secondary" size="sm">Premium</Badge>
                )}
                {voice.is_recommended && (
                  <Badge variant="warning" size="sm">Recommended</Badge>
                )}
                {voice.gender && (
                  <Badge variant="secondary" size="sm">{voice.gender}</Badge>
                )}
              </View>
              <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                {voice.description} • {costText}
              </Text>
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
                backgroundColor: isPreviewing ? theme.colors.warning + '20' : theme.colors.primary + '20',
              }}
              onPress={isPreviewing ? stopPreview : () => handleTestVoice(voice)}
              disabled={previewing !== null && !isPreviewing}
            >
              {isPreviewing ? (
                <>
                  <ActivityIndicator size="small" color={theme.colors.warning} />
                  <Text variant="caption" color="warning" style={{ marginLeft: 4 }}>
                    Stop
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="play" size={14} color={theme.colors.primary} />
                  <Text variant="caption" color="primary" style={{ marginLeft: 4 }}>
                    Test
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            {isSelected && (
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
            )}
          </View>
        </View>
        
        {/* Voice features */}
        {voice.features && voice.features.length > 0 && (
          <View style={{ marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.textSecondary + '20' }}>
            <Text variant="caption" color="textSecondary">
              Features: {voice.features.join(' • ')}
            </Text>
          </View>
        )}
      </Card>
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xl,
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
          {loading ? (
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text variant="body" color="textSecondary" style={{ marginTop: spacing.md }}>
                Loading voices...
              </Text>
            </View>
          ) : (
            <>
              {/* Info card */}
                             <Card variant="outlined" style={{ marginVertical: spacing.md }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                   <Text variant="body" color="textSecondary" style={{ marginLeft: spacing.sm, flex: 1 }}>
                     Free voices use your device's built-in synthesis. Premium voices offer higher quality.
                   </Text>
                 </View>
               </Card>

              {/* Voice list */}
              {voices.map((voice, index) => renderVoiceCard(voice, index))}

              {/* Add custom voice option */}
              <Card
                animated
                animationDelay={voices.length * 100}
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
                    Request Custom Voice
                  </Text>
                </View>
                <Text variant="caption" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing.xs }}>
                  Contact support for custom voice training
                </Text>
              </Card>
            </>
          )}
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