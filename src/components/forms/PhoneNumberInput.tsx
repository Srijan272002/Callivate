import { Ionicons } from '@expo/vector-icons';
import { CountryCode, isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../styles/theme';

const { width } = Dimensions.get('window');

interface Country {
  code: CountryCode;
  name: string;
  flag: string;
  dialCode: string;
}

const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', dialCode: '+81' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', dialCode: '+55' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', dialCode: '+52' },
];

interface PhoneNumberInputProps {
  value?: string;
  onChangePhoneNumber: (phoneNumber: string, isValid: boolean) => void;
  placeholder?: string;
  label?: string;
  showPrivacyNotice?: boolean;
  required?: boolean;
  error?: string;
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value = '',
  onChangePhoneNumber,
  placeholder = 'Enter your phone number',
  label = 'Phone Number',
  showPrivacyNotice = true,
  required = false,
  error,
}) => {
  const { theme, isDark } = useTheme();
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [focused, setFocused] = useState(false);

  // Create dynamic styles
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  useEffect(() => {
    if (value) {
      try {
        const parsed = parsePhoneNumber(value);
        if (parsed) {
          const country = COUNTRIES.find(c => c.code === parsed.country);
          if (country) {
            setSelectedCountry(country);
          }
          setPhoneNumber(parsed.nationalNumber);
        }
      } catch (error) {
        console.log('Error parsing initial phone number:', error);
      }
    }
  }, [value]);

  const handlePhoneNumberChange = (text: string) => {
    // Remove non-digit characters except spaces and dashes for better UX
    const cleanedText = text.replace(/[^\d\s-]/g, '');
    setPhoneNumber(cleanedText);

    // Validate and format
    try {
      const fullNumber = `${selectedCountry.dialCode}${cleanedText.replace(/[\s-]/g, '')}`;
      const valid = isValidPhoneNumber(fullNumber);
      setIsValid(valid);

      // Parse and format if valid
      if (valid) {
        const parsed = parsePhoneNumber(fullNumber);
        if (parsed) {
          onChangePhoneNumber(parsed.format('E.164'), true);
        }
      } else {
        onChangePhoneNumber(fullNumber, false);
      }
    } catch (error) {
      setIsValid(false);
      onChangePhoneNumber(`${selectedCountry.dialCode}${cleanedText.replace(/[\s-]/g, '')}`, false);
    }
  };

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
    
    // Re-validate with new country code
    if (phoneNumber) {
      handlePhoneNumberChange(phoneNumber);
    }
  };

  const showPrivacyAlert = () => {
    Alert.alert(
      '📞 Calling Feature Privacy',
      'Your phone number is used exclusively for AI task reminders. We:\n\n• Encrypt and securely store your number\n• Only use it for scheduled task calls\n• Never share it with third parties\n• Allow easy deletion anytime\n\nCalls are completely FREE for you!',
      [
        { text: 'Learn More', onPress: () => {}, style: 'default' },
        { text: 'Got It', style: 'cancel' }
      ]
    );
  };

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => handleCountryChange(item)}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <View style={styles.countryInfo}>
        <Text style={styles.countryName}>{item.name}</Text>
        <Text style={styles.countryCode}>{item.dialCode}</Text>
      </View>
      {selectedCountry.code === item.code && (
        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
          {showPrivacyNotice && (
            <TouchableOpacity onPress={showPrivacyAlert} style={styles.privacyButton}>
              <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
              <Text style={styles.privacyText}>Privacy</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={[
        styles.inputContainer,
        focused && styles.inputContainerFocused,
        error && styles.inputContainerError,
        isValid && phoneNumber && styles.inputContainerValid
      ]}>
        {/* Country Selector */}
        <TouchableOpacity
          style={styles.countrySelector}
          onPress={() => setShowCountryPicker(true)}
        >
          <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
          <Text style={styles.dialCode}>{selectedCountry.dialCode}</Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Phone Number Input */}
        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={handlePhoneNumberChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="phone-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete="tel"
          textContentType="telephoneNumber"
        />

        {/* Status Icon */}
        {phoneNumber && (
          <View style={styles.statusIcon}>
            <Ionicons
              name={isValid ? "checkmark-circle" : "alert-circle"}
              size={20}
              color={isValid ? theme.colors.success : theme.colors.danger}
            />
          </View>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Validation Message */}
      {phoneNumber && !error && (
        <Text style={[styles.validationText, isValid ? styles.validText : styles.invalidText]}>
          {isValid ? '✓ Valid phone number' : '⚠️ Please enter a valid phone number'}
        </Text>
      )}

      {/* Benefits Notice */}
      {showPrivacyNotice && (
        <View style={styles.benefitsContainer}>
          <Ionicons name="call" size={16} color={theme.colors.primary} />
          <Text style={styles.benefitsText}>
            Enable AI voice calls for better task accountability (100% free!)
          </Text>
        </View>
      )}

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCountryPicker(false)}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={COUNTRIES}
            renderItem={renderCountryItem}
            keyExtractor={(item) => item.code}
            style={styles.countryList}
          />
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  required: {
    color: theme.colors.danger,
  },
  privacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: isDark ? theme.colors.surface : theme.colors.primaryLight,
  },
  privacyText: {
    fontSize: fontSize.sm,
    color: theme.colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: spacing.sm,
    minHeight: 52,
  },
  inputContainerFocused: {
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: theme.colors.danger,
  },
  inputContainerValid: {
    borderColor: theme.colors.success,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    marginRight: spacing.sm,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  dialCode: {
    fontSize: fontSize.md,
    color: theme.colors.text,
    fontWeight: '500',
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: theme.colors.text,
    paddingVertical: spacing.sm,
  },
  statusIcon: {
    marginLeft: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: theme.colors.danger,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  validationText: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  validText: {
    color: theme.colors.success,
  },
  invalidText: {
    color: theme.colors.danger,
  },
  benefitsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  benefitsText: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  countryList: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  countryInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  countryName: {
    fontSize: fontSize.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
  countryCode: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
}); 