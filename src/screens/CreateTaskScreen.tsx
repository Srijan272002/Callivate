import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Toast } from '../components/ui';
import { useTheme } from '../hooks/useTheme';
import { CallingService, TaskService, VoiceService } from '../services';
import { borderRadius, fontSize, spacing } from '../styles/theme';
import { CreateTaskForm, Voice } from '../types';

const { width } = Dimensions.get('window');

interface CreateTaskScreenProps {
  navigation?: any;
}

// Enhanced voices with personality
const mockVoices: (Voice & { personality: string; avatar: string })[] = [
  { 
    id: 'browser-female-1', 
    name: 'Sarah', 
    isDefault: true, 
    isCustom: false,
    personality: 'Friendly & Professional',
    avatar: '👩',
  },
  { 
    id: 'browser-male-1', 
    name: 'Marcus', 
    isDefault: false, 
    isCustom: false,
    personality: 'Calm & Steady',
    avatar: '👨',
  },
  { 
    id: 'browser-female-2', 
    name: 'Luna', 
    isDefault: false, 
    isCustom: false,
    personality: 'Gentle & Soothing',
    avatar: '🌙',
  },
  { 
    id: 'browser-male-2', 
    name: 'Alex', 
    isDefault: false, 
    isCustom: false,
    personality: 'Energetic & Motivating',
    avatar: '⚡',
  },
];

export const CreateTaskScreen: React.FC<CreateTaskScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [form, setForm] = useState<CreateTaskForm>({
    title: '',
    scheduledTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    isRecurring: false,
    recurrenceType: 'daily',
    voiceId: mockVoices.find(v => v.isDefault)?.id,
    isSilentMode: false,
  });

  const [showCustomDateTime, setShowCustomDateTime] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  // Voice preview states
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [previewTimer, setPreviewTimer] = useState<number>(0);
  const [previewInterval, setPreviewInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  // Create dynamic styles based on current theme
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Cleanup preview timer on unmount
  useEffect(() => {
    return () => {
      if (previewInterval) {
        clearInterval(previewInterval);
      }
    };
  }, [previewInterval]);

  const handleVoicePreview = async (voiceId: string) => {
    try {
      // Stop any current preview
      if (playingVoiceId) {
        await VoiceService.stopCurrentAudio();
        if (previewInterval) {
          clearInterval(previewInterval);
        }
        setPlayingVoiceId(null);
        setPreviewTimer(0);
        
        // If clicking the same voice, just stop
        if (playingVoiceId === voiceId) {
          return;
        }
      }

      // Start new preview
      setPlayingVoiceId(voiceId);
      setPreviewTimer(5);

      // Start countdown timer
      const interval = setInterval(() => {
        setPreviewTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setPlayingVoiceId(null);
            setPreviewTimer(0);
            VoiceService.stopCurrentAudio();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setPreviewInterval(interval);

      // Play voice preview
      const voice = mockVoices.find(v => v.id === voiceId);
      const sampleText = form.title.trim() 
        ? `Hi! This is ${voice?.name}. I'll remind you to: ${form.title}`
        : `Hi! This is your AI assistant ${voice?.name} from Callivate. I'll help you stay on track with your tasks.`;

      await VoiceService.previewVoice(voiceId, sampleText);

    } catch (error) {
      console.error('Failed to preview voice:', error);
      // Stop timer on error
      if (previewInterval) {
        clearInterval(previewInterval);
      }
      setPlayingVoiceId(null);
      setPreviewTimer(0);
      
      // Provide more helpful error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('not available on this device')) {
        // Voice preview not available but voice will work in actual use
        console.log(`Voice ${voiceId} selected - preview not available but will work during calls`);
      } else {
        Alert.alert(
          'Voice Preview', 
          'Preview temporarily unavailable, but your selected voice will work perfectly during AI calls.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    }
  };

  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      Alert.alert('Hold up! 🤔', 'What would you like to be reminded about?');
      return false;
    }

    if (form.scheduledTime < new Date()) {
      Alert.alert('Time Travel? 🕰️', 'Please choose a future time for your AI reminder.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      // Get user's phone number for calling integration
      const userPhone = await CallingService.getUserPhone();
      
      if (userPhone && !form.isSilentMode) {
        // Create task with calling integration
        const task = await TaskService.createTaskWithCalling(form, userPhone);
        
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        
        // Show calling confirmation
        Alert.alert(
          '📞 Task Created with AI Calling!',
          `Your task "${task.title}" has been created. You'll receive an AI phone call at the scheduled time for better accountability!`,
          [
            { 
              text: 'Perfect!', 
              style: 'default',
              onPress: () => navigation?.goBack?.()
            }
          ]
        );
      } else {
        // Create task with notifications only
        const task = await TaskService.createTask(form);
        
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        
        if (!userPhone && !form.isSilentMode) {
          // Suggest adding phone number for better experience
          Alert.alert(
            '✅ Task Created!',
            'Your task has been created with notification reminders. Want even better accountability? Add your phone number in Settings to enable AI voice calls!',
            [
              { text: 'Maybe Later', style: 'cancel', onPress: () => navigation?.goBack?.() },
              { 
                text: 'Add Phone Number', 
                style: 'default',
                onPress: () => {
                  navigation?.goBack?.();
                  navigation?.navigate?.('Settings');
                }
              }
            ]
          );
        } else {
          setTimeout(() => {
            navigation?.goBack?.();
          }, 1500);
        }
      }
    } catch (error) {
      console.error('❌ Failed to create task:', error);
      Alert.alert(
        'Oops! 😅',
        'Something went wrong creating your task. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      const newDateTime = new Date(form.scheduledTime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setForm(prev => ({ ...prev, scheduledTime: newDateTime }));
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(form.scheduledTime.getHours());
      newDateTime.setMinutes(form.scheduledTime.getMinutes());
      setForm(prev => ({ ...prev, scheduledTime: newDateTime }));
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getVoiceColor = (index: number) => {
    const colors = [theme.colors.primary, theme.colors.secondary, theme.colors.success, theme.colors.warning];
    return colors[index % colors.length];
  };

  const selectedVoice = mockVoices.find(v => v.id === form.voiceId);

  return (
    <SafeAreaView style={styles.container}>
      {/* Success Toast */}
      <Toast
        message="🎉 Task created successfully!"
        visible={showSuccessToast}
        onHide={() => setShowSuccessToast(false)}
        type="success"
        duration={1500}
      />

      {/* Modern Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}></Text>
        <Text style={styles.headerSubtitle}></Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Title */}
        <Card style={styles.titleCard} shadow="md">
          <View style={styles.cardHeader}>
            <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>What should we remind you about?</Text>
          </View>
          
          <TextInput
            style={[styles.titleInput, titleFocused && styles.titleInputFocused]}
            placeholder="e.g., Take a break, Call mom, Go for a walk..."
            placeholderTextColor={theme.colors.textSecondary}
            value={form.title}
            onChangeText={(title) => setForm(prev => ({ ...prev, title }))}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            multiline
            maxLength={100}
          />
          
          <Text style={styles.characterCount}>
            {form.title.length}/100 characters
          </Text>
        </Card>

        {/* Voice Selection */}
        <Card style={styles.voiceCard} shadow="md">
          <View style={styles.cardHeader}>
            <Ionicons name="mic" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Choose your AI assistant</Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.voiceSlider}
          >
            {mockVoices.map((voice, index) => (
              <TouchableOpacity
                key={voice.id}
                style={styles.voiceSliderItem}
                onPress={() => {
                  setForm(prev => ({ ...prev, voiceId: voice.id, isSilentMode: false }));
                  handleVoicePreview(voice.id);
                }}
              >
                <View style={[
                  styles.voiceSliderAvatar,
                  form.voiceId === voice.id && styles.voiceSliderAvatarSelected,
                  playingVoiceId === voice.id && styles.voiceSliderAvatarPlaying,
                  { backgroundColor: getVoiceColor(index) + '20' }
                ]}>
                  {playingVoiceId === voice.id ? (
                    <View style={styles.playingIndicator}>
                      <Text style={styles.timerText}>{previewTimer}</Text>
                      <Ionicons name="volume-high" size={16} color={theme.colors.primary} />
                    </View>
                  ) : (
                    <>
                      <Text style={styles.voiceSliderAvatarText}>{voice.avatar}</Text>
                      <Ionicons 
                        name="play-circle-outline" 
                        size={16} 
                        color={theme.colors.primary} 
                        style={styles.playIcon}
                      />
                    </>
                  )}
                </View>
                <Text style={[
                  styles.voiceSliderName,
                  form.voiceId === voice.id && styles.voiceSliderNameSelected
                ]}>
                  {voice.name}
                </Text>
                <Text style={styles.voiceSliderPersonality}>
                  {voice.personality}
                </Text>
              </TouchableOpacity>
            ))}
            
            {/* Silent Mode Option */}
            <TouchableOpacity
              style={styles.voiceSliderItem}
              onPress={() => setForm(prev => ({ ...prev, isSilentMode: true, voiceId: undefined }))}
            >
              <View style={[
                styles.voiceSliderAvatar,
                form.isSilentMode && styles.voiceSliderAvatarSelected,
                { backgroundColor: theme.colors.textSecondary + '20' }
              ]}>
                <Ionicons name="notifications-off" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={[
                styles.voiceSliderName,
                form.isSilentMode && styles.voiceSliderNameSelected
              ]}>
                Silent
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Card>

        {/* Voice Preview Instructions */}
        <View style={styles.previewInfo}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.previewInfoText}>
            Tap any voice to hear a 5-second preview
          </Text>
        </View>

        {/* Date & Time Selection */}
        <Card style={styles.whenCard} shadow="md">
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>When should we call?</Text>
          </View>
          
          <View style={styles.dateTimeRow}>
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.dateTimeButtonText}>
                {formatDate(form.scheduledTime)}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.dateTimeButtonText}>
                {formatTime(form.scheduledTime)}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scheduledInfo}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.scheduledInfoText}>
              Scheduled for {formatDateTime(form.scheduledTime)}
            </Text>
          </View>
        </Card>

        {/* Recurrence Options */}
        <Card style={styles.recurrenceCard} shadow="md">
          <View style={styles.cardHeader}>
            <Ionicons name="repeat" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Repeat this reminder?</Text>
          </View>
          
          <TouchableOpacity
            style={styles.recurrenceToggle}
            onPress={() => setForm(prev => ({ ...prev, isRecurring: !prev.isRecurring }))}
          >
            <View style={styles.recurrenceLeft}>
              <Text style={styles.recurrenceLabel}>Make this a recurring reminder</Text>
              <Text style={styles.recurrenceSubtext}>
                Perfect for daily habits and routines
              </Text>
            </View>
            <View style={[
              styles.toggle,
              form.isRecurring && styles.toggleActive
            ]}>
              <View style={[
                styles.toggleKnob,
                form.isRecurring && styles.toggleKnobActive
              ]} />
            </View>
          </TouchableOpacity>

          {form.isRecurring && (
            <View style={styles.recurrenceOptions}>
              {['daily', 'weekly'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.recurrenceOption,
                    form.recurrenceType === type && styles.recurrenceOptionSelected
                  ]}
                  onPress={() => setForm(prev => ({ 
                    ...prev, 
                    recurrenceType: type as 'daily' | 'weekly' | 'custom'
                  }))}
                >
                  <Text style={[
                    styles.recurrenceOptionText,
                    form.recurrenceType === type && styles.recurrenceOptionTextSelected
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <Button
            title={saving ? "Scheduling..." : "Schedule Reminder"}
            onPress={handleSave}
            loading={saving}
            disabled={!form.title.trim() || saving}
            size="lg"
            fullWidth
          />
          
          <Text style={styles.saveSubtext}>
            {selectedVoice?.name || 'AI'} will call you at the scheduled time
          </Text>
        </View>
      </ScrollView>

      {/* Date/Time Pickers */}
      {showTimePicker && (
        <DateTimePicker
          value={form.scheduledTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

      {showDatePicker && (
        <DateTimePicker
          value={form.scheduledTime}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? theme.colors.textSecondary + '20' : theme.colors.textSecondary + '10',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surface,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: theme.colors.text,
    marginLeft: spacing.md,
  },
  titleCard: {
    marginBottom: spacing.lg,
  },
  titleInput: {
    fontSize: fontSize.lg,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  titleInputFocused: {
    borderColor: theme.colors.primary,
  },
  characterCount: {
    fontSize: fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  voiceCard: {
    marginBottom: spacing.lg,
  },
  voiceSlider: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  voiceSliderItem: {
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  voiceSliderAvatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  voiceSliderAvatarSelected: {
    borderColor: theme.colors.primary,
    transform: [{ scale: 1.05 }],
  },
  voiceSliderAvatarPlaying: {
    borderColor: theme.colors.primary,
    transform: [{ scale: 1.05 }],
  },
  voiceSliderAvatarText: {
    fontSize: fontSize.xl,
  },
  voiceSliderName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  voiceSliderNameSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  voiceSliderPersonality: {
    fontSize: fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs / 2,
  },
  whenCard: {
    marginBottom: spacing.lg,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: isDark ? theme.colors.textSecondary + '20' : theme.colors.textSecondary + '10',
  },
  dateTimeButtonText: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: theme.colors.text,
    marginLeft: spacing.md,
  },
  scheduledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: borderRadius.md,
  },
  scheduledInfoText: {
    fontSize: fontSize.sm,
    color: theme.colors.primary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  recurrenceCard: {
    marginBottom: spacing.lg,
  },
  recurrenceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  recurrenceLeft: {
    flex: 1,
  },
  recurrenceLabel: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: spacing.xs / 2,
  },
  recurrenceSubtext: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: isDark ? theme.colors.textSecondary + '30' : theme.colors.textSecondary + '20',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  recurrenceOptions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  recurrenceOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  recurrenceOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  recurrenceOptionText: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  recurrenceOptionTextSelected: {
    color: theme.colors.primary,
  },
  saveSection: {
    marginTop: spacing.xl,
    marginBottom: spacing['3xl'],
  },
  saveSubtext: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  previewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  previewInfoText: {
    fontSize: fontSize.sm,
    color: theme.colors.primary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  playingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    borderRadius: borderRadius.xl,
  },
  timerText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: spacing.xs / 2,
  },
  playIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    opacity: 0.8,
  },
}); 