import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fontSize, spacing, borderRadius } from '../styles/theme';
import { useTheme } from '../hooks/useTheme';
import { Button, Card } from '../components/ui';
import { CreateTaskForm, Voice } from '../types';

const { width } = Dimensions.get('window');

interface CreateTaskScreenProps {
  navigation?: any;
}

// Enhanced voices with personality
const mockVoices: (Voice & { personality: string; avatar: string })[] = [
  { 
    id: '1', 
    name: 'Sarah', 
    isDefault: true, 
    isCustom: false,
    personality: 'Friendly & Professional',
    avatar: '👩',
  },
  { 
    id: '2', 
    name: 'Marcus', 
    isDefault: false, 
    isCustom: false,
    personality: 'Calm & Steady',
    avatar: '👨',
  },
  { 
    id: '3', 
    name: 'Luna', 
    isDefault: false, 
    isCustom: false,
    personality: 'Gentle & Soothing',
    avatar: '🌙',
  },
  { 
    id: '4', 
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

    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const selectedVoice = mockVoices.find(v => v.id === form.voiceId);
      Alert.alert(
        '🎉 Reminder Scheduled!',
        `${selectedVoice?.name || 'Your AI'} will call you about "${form.title}" on ${formatDateTime(form.scheduledTime)}.`,
        [{ text: 'Perfect!', onPress: () => navigation?.goBack() }]
      );
    } catch (error) {
      Alert.alert('Oops! 😅', 'Something went wrong. Please try again.');
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
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Schedule AI Reminder</Text>
          <Text style={styles.headerSubtitle}>Your personal reminder assistant</Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation?.goBack()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
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
          
          <View style={styles.voiceGrid}>
            {mockVoices.map((voice, index) => (
              <TouchableOpacity
                key={voice.id}
                style={[
                  styles.voiceOption,
                  form.voiceId === voice.id && styles.voiceOptionSelected
                ]}
                onPress={() => setForm(prev => ({ ...prev, voiceId: voice.id, isSilentMode: false }))}
              >
                <View style={styles.voiceContent}>
                  <View style={[styles.voiceAvatar, { backgroundColor: getVoiceColor(index) + '20' }]}>
                    <Text style={styles.voiceAvatarText}>{voice.avatar}</Text>
                  </View>
                  <View style={styles.voiceInfo}>
                    <Text style={styles.voiceName}>{voice.name}</Text>
                    <Text style={styles.voicePersonality}>{voice.personality}</Text>
                  </View>
                </View>
                {form.voiceId === voice.id && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            
            {/* Silent Mode Option */}
            <TouchableOpacity
              style={[
                styles.voiceOption,
                form.isSilentMode && styles.voiceOptionSelected
              ]}
              onPress={() => setForm(prev => ({ ...prev, isSilentMode: true, voiceId: undefined }))}
            >
              <View style={styles.voiceContent}>
                <View style={[styles.voiceAvatar, { backgroundColor: theme.colors.textSecondary + '20' }]}>
                  <Ionicons name="notifications-off" size={20} color={theme.colors.textSecondary} />
                </View>
                <View style={styles.voiceInfo}>
                  <Text style={styles.voiceName}>Silent Mode</Text>
                  <Text style={styles.voicePersonality}>Notification only</Text>
                </View>
              </View>
              {form.isSilentMode && (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </Card>

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
  voiceGrid: {
    gap: spacing.md,
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voiceOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  voiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voiceAvatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  voiceAvatarText: {
    fontSize: fontSize.lg,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: spacing.xs / 2,
  },
  voicePersonality: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
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
}); 