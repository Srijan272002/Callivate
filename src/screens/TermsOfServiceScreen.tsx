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

interface TermsOfServiceScreenProps {
  navigation?: any;
}

export const TermsOfServiceScreen: React.FC<TermsOfServiceScreenProps> = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Last updated: January 15, 2024</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agreement to Terms</Text>
          <Text style={styles.paragraph}>
            By accessing and using Callivate, you accept and agree to be bound by the terms and provision of this agreement.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Use License</Text>
          <Text style={styles.paragraph}>
            Permission is granted to temporarily use Callivate for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </Text>
          <Text style={styles.bulletPoint}>• Modify or copy the materials</Text>
          <Text style={styles.bulletPoint}>• Use the materials for any commercial purpose</Text>
          <Text style={styles.bulletPoint}>• Attempt to reverse engineer any software</Text>
          <Text style={styles.bulletPoint}>• Remove any copyright or proprietary notations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Accounts</Text>
          <Text style={styles.paragraph}>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceptable Use</Text>
          <Text style={styles.paragraph}>You agree not to use the service:</Text>
          <Text style={styles.bulletPoint}>• For any unlawful purpose or to solicit others to unlawful acts</Text>
          <Text style={styles.bulletPoint}>• To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</Text>
          <Text style={styles.bulletPoint}>• To infringe upon or violate our intellectual property rights or the intellectual property rights of others</Text>
          <Text style={styles.bulletPoint}>• To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</Text>
          <Text style={styles.bulletPoint}>• To submit false or misleading information</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Availability</Text>
          <Text style={styles.paragraph}>
            We reserve the right to withdraw or amend our service, and any service or material we provide, in our sole discretion without notice. We do not warrant that our service will be uninterrupted, timely, secure, or error-free.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            In no event shall Callivate, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have any questions about these Terms of Service, please contact us at:
          </Text>
          <Text style={styles.contactInfo}>legal@callivate.com</Text>
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