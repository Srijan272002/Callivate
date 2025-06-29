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
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Button, Card } from '../components/ui';
import { CreateTaskForm, Voice } from '../types';

const { width } = Dimensions.get('window');

interface CreateTaskScreenProps {
  navigation?: any;
}

// Enhanced voices with personality
const mockVoices: (Voice & { personality: string; avatar: string; color: string })[] = [
  { 
    id: '1', 
    name: 'Sarah', 
    isDefault: true, 
    isCustom: false,
    personality: 'Friendly & Professional',
    avatar: '👩',
    color: colors.primary[500]
  },
  { 
    id: '2', 
    name: 'Marcus', 
    isDefault: false, 
    isCustom: false,
    personality: 'Calm & Steady',
    avatar: '👨',
    color: colors.secondary[500]
  },
  { 
    id: '3', 
    name: 'Luna', 
    isDefault: false, 
    isCustom: false,
    personality: 'Gentle & Soothing',
    avatar: '🌙',
    color: colors.success[500]
  },
  { 
    id: '4', 
    name: 'Alex', 
    isDefault: false, 
    isCustom: false,
    personality: 'Energetic & Motivating',
    avatar: '⚡',
    color: colors.warning[500]
  },
];



export const CreateTaskScreen: React.FC<CreateTaskScreenProps> = ({ navigation }) => {
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

  const selectedVoice = mockVoices.find(v => v.id === form.voiceId);

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Schedule AI Reminder</Text>
          <Text style={styles.headerSubtitle}>Your personal reminder assistant</Text>
        </View>
      </View>

      <Animated.View 
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero Task Input */}
          <Card style={[styles.heroCard, titleFocused && styles.heroCardFocused]} shadow="lg">
            <Text style={styles.heroLabel}>What would you like to be reminded about?</Text>
            <TextInput
              style={styles.heroInput}
              placeholder="Call mom, Workout, Take medication..."
              placeholderTextColor={colors.gray[400]}
              value={form.title}
              onChangeText={(text) => setForm(prev => ({ ...prev, title: text }))}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              autoFocus={true}
              multiline={true}
              textAlignVertical="top"
            />
          </Card>

                     {/* Voice Selection - The Star Feature */}
           <Card style={styles.voiceCardContainer} shadow="md">
            <View style={styles.voiceHeader}>
              <Text style={styles.voiceTitle}>🎙️ Your AI Caller</Text>
              <Text style={styles.voiceSubtitle}>Choose who will remind you</Text>
            </View>
            
                         <View style={styles.voiceList}>
               {mockVoices.map((voice) => (
                 <TouchableOpacity
                   key={voice.id}
                   style={[
                     styles.voiceOption,
                     form.voiceId === voice.id && !form.isSilentMode && styles.voiceOptionSelected
                   ]}
                   onPress={() => setForm(prev => ({ 
                     ...prev, 
                     voiceId: voice.id, 
                     isSilentMode: false 
                   }))}
                 >
                   <View style={styles.voiceOptionLeft}>
                     <View style={[styles.voiceAvatarSmall, { backgroundColor: voice.color + '20' }]}>
                       <Text style={styles.voiceEmojiSmall}>{voice.avatar}</Text>
                     </View>
                     <View style={styles.voiceInfo}>
                       <View style={styles.voiceNameRow}>
                         <Text style={styles.voiceName}>{voice.name}</Text>
                         {voice.isDefault && (
                           <View style={styles.defaultBadge}>
                             <Text style={styles.defaultBadgeText}>Default</Text>
                           </View>
                         )}
                       </View>
                       <Text style={styles.voicePersonality}>{voice.personality}</Text>
                     </View>
                   </View>
                   {form.voiceId === voice.id && !form.isSilentMode && (
                     <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
                   )}
                 </TouchableOpacity>
               ))}
               
               {/* Silent Mode Option */}
               <TouchableOpacity
                 style={[
                   styles.voiceOption,
                   form.isSilentMode && styles.voiceOptionSelected
                 ]}
                 onPress={() => setForm(prev => ({ ...prev, isSilentMode: true }))}
               >
                 <View style={styles.voiceOptionLeft}>
                   <View style={[styles.voiceAvatarSmall, { backgroundColor: colors.gray[100] }]}>
                     <Ionicons name="notifications-off" size={20} color={colors.gray[500]} />
                   </View>
                   <View style={styles.voiceInfo}>
                     <Text style={styles.voiceName}>Silent Mode</Text>
                     <Text style={styles.voicePersonality}>Notification only</Text>
                   </View>
                 </View>
                 {form.isSilentMode && (
                   <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
                 )}
               </TouchableOpacity>
             </View>
          </Card>

          {/* Date & Time Selection */}
          <Card style={styles.whenCard} shadow="md">
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={20} color={colors.primary[500]} />
              <Text style={styles.cardTitle}>When should we call?</Text>
            </View>
            
            <View style={styles.dateTimeRow}>
              <TouchableOpacity 
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary[500]} />
                <Text style={styles.dateTimeButtonText}>
                  {formatDate(form.scheduledTime)}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={colors.primary[500]} />
                <Text style={styles.dateTimeButtonText}>
                  {formatTime(form.scheduledTime)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Preview */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>You'll receive a call:</Text>
              <Text style={styles.previewTime}>{formatDateTime(form.scheduledTime)}</Text>
            </View>
          </Card>

          {/* Repeat Option */}
          <Card style={styles.repeatCard} shadow="sm">
            <View style={styles.repeatHeader}>
              <View style={styles.repeatTitleContainer}>
                <Ionicons name="copy-outline" size={20} color={colors.primary[500]} />
                <View>
                  <Text style={styles.repeatTitle}>Make it a habit</Text>
                  <Text style={styles.repeatSubtitle}>Repeat this reminder</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modernToggle}
                onPress={() => setForm(prev => ({ ...prev, isRecurring: !prev.isRecurring }))}
              >
                <View style={[styles.toggleTrack, form.isRecurring && styles.toggleTrackActive]}>
                  <Animated.View style={[styles.toggleThumb, form.isRecurring && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>

            {form.isRecurring && (
              <View style={styles.recurrenceOptions}>
                {(['daily', 'weekly', 'custom'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.recurrenceChip,
                      form.recurrenceType === type && styles.recurrenceChipActive
                    ]}
                    onPress={() => setForm(prev => ({ ...prev, recurrenceType: type }))}
                  >
                    <Text style={[
                      styles.recurrenceChipText,
                      form.recurrenceType === type && styles.recurrenceChipTextActive
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </Animated.View>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!form.title.trim() || saving) && styles.primaryButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!form.title.trim() || saving}
          >
            {saving ? (
              <Text style={styles.primaryButtonText}>Scheduling...</Text>
            ) : (
              <>
                <Ionicons name="call" size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>Schedule AI Call</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Date/Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={form.scheduledTime}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={form.scheduledTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.gray[900],
  },
  headerSubtitle: {
    fontSize: fontSize.base,
    color: colors.gray[700],
  },
  animatedContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  heroCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroCardFocused: {
    borderColor: colors.primary[500],
    borderWidth: 2,
  },
  heroLabel: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  heroInput: {
    fontSize: fontSize.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginLeft: spacing.sm,
  },
  voiceCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  voiceHeader: {
    marginBottom: spacing.md,
  },
  voiceTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  voiceSubtitle: {
    fontSize: fontSize.base,
    color: colors.gray[700],
  },
  voiceGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  voiceCardContainer: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  voiceCardItem: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  voiceCardSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[300],
  },
  silentCard: {
    backgroundColor: colors.gray[50],
  },
  voiceAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceEmoji: {
    fontSize: 24,
  },
  voiceName: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    fontWeight: '500',
  },
  voicePersonality: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  defaultBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  defaultBadgeText: {
    fontSize: fontSize.xs,
    color: colors.primary[700],
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  whenCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  whenTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  suggestionChip: {
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
  },
  suggestionEmoji: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  suggestionText: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    fontWeight: '500',
  },
  customTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
  },
  customTimeLabel: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    fontWeight: '500',
  },
  customTimeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  dateTimeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateTimeText: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    fontWeight: '500',
  },
  previewContainer: {
    marginTop: spacing.md,
  },
  previewLabel: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    fontWeight: '500',
  },
  previewTime: {
    fontSize: fontSize.lg,
    color: colors.gray[900],
    fontWeight: '600',
  },
  repeatCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  repeatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  repeatTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  repeatTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  repeatSubtitle: {
    fontSize: fontSize.base,
    color: colors.gray[700],
  },
  modernToggle: {
    padding: 4,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray[300],
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: colors.primary[500],
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  recurrenceOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  recurrenceChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[300],
    alignItems: 'center',
  },
  recurrenceChipActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  recurrenceChipText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    fontWeight: '500',
  },
  recurrenceChipTextActive: {
    color: colors.primary[700],
  },
  bottomSpacing: {
    height: spacing.xl,
  },
  // Voice Selection Styles
  voiceList: {
    gap: spacing.sm,
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: '#ffffff',
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
  voiceAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  voiceEmojiSmall: {
    fontSize: 18,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  
  // Date/Time Button Styles
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: '#ffffff',
  },
  dateTimeButtonText: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    fontWeight: '500',
  },
  
  // Bottom Button Styles
  bottomContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    fontWeight: '600',
  },
  primaryButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[600],
  },
  primaryButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
  primaryButtonText: {
    fontSize: fontSize.base,
    color: '#ffffff',
    fontWeight: '600',
  },
}); 