import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { fontSize, spacing, borderRadius } from '../styles/theme';
import { Text } from '../components/ui';

interface PrivacyPolicyScreenProps {
  navigation?: any;
}

export const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();

  // Create dynamic styles based on current theme
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Empty Header Section */}
      <View style={{ height: 60, backgroundColor: theme.colors.background }} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation?.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Last updated: January 15, 2024</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Introduction</Text>
          <Text style={styles.paragraph}>
            Welcome to Callivate. We respect your privacy and are committed to protecting your personal data. 
            This privacy policy explains how we collect, use, and safeguard your information when you use our app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.subTitle}>Account Information</Text>
          <Text style={styles.paragraph}>
            When you create an account, we collect your email address, name, and other basic profile information.
          </Text>
          
          <Text style={styles.subTitle}>Usage Data</Text>
          <Text style={styles.paragraph}>
            We collect information about how you use the app, including tasks created, completion rates, and app interactions.
          </Text>

          <Text style={styles.subTitle}>Device Information</Text>
          <Text style={styles.paragraph}>
            We may collect device-specific information such as your device model, operating system, and app version.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.paragraph}>We use your information to:</Text>
          <Text style={styles.bulletPoint}>• Provide and maintain our services</Text>
          <Text style={styles.bulletPoint}>• Send you task reminders and notifications</Text>
          <Text style={styles.bulletPoint}>• Improve our app and develop new features</Text>
          <Text style={styles.bulletPoint}>• Provide customer support</Text>
          <Text style={styles.bulletPoint}>• Ensure the security of our services</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate security measures to protect your personal information against unauthorized access, 
            alteration, disclosure, or destruction. Your data is encrypted in transit and at rest.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sharing</Text>
          <Text style={styles.paragraph}>
            We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, 
            except as described in this policy or as required by law.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.paragraph}>You have the right to:</Text>
          <Text style={styles.bulletPoint}>• Access your personal data</Text>
          <Text style={styles.bulletPoint}>• Correct inaccurate data</Text>
          <Text style={styles.bulletPoint}>• Delete your account and data</Text>
          <Text style={styles.bulletPoint}>• Export your data</Text>
          <Text style={styles.bulletPoint}>• Opt-out of certain communications</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this Privacy Policy, please contact us at:
          </Text>
          <Text style={styles.contactInfo}>privacy@callivate.com</Text>
        </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? theme.colors.textSecondary + '20' : theme.colors.textSecondary + '10',
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  lastUpdated: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  subTitle: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontSize: fontSize.base,
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  bulletPoint: {
    fontSize: fontSize.base,
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: spacing.xs,
    paddingLeft: spacing.md,
  },
  contactInfo: {
    fontSize: fontSize.base,
    color: theme.colors.primary,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
}); 