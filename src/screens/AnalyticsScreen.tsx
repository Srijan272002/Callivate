import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fontSize, spacing, borderRadius } from '../styles/theme';
import { useTheme } from '../hooks/useTheme';
import { Card, Badge, ProgressBar } from '../components/ui';
import { MonthlyAnalytics } from '../types';

const { width } = Dimensions.get('window');

// Mock analytics data
const mockAnalytics: MonthlyAnalytics = {
  id: '1',
  userId: 'user1',
  month: 'January',
  year: 2024,
  tasksCompleted: 28,
  tasksMissed: 5,
  completionRate: 85,
  longestStreak: 15,
  mostUsedVoice: 'Default Female',
  createdAt: '2024-01-31T00:00:00Z',
};

const mockWeeklyData = [
  { week: 'Week 1', completed: 6, missed: 1, rate: 86 },
  { week: 'Week 2', completed: 7, missed: 0, rate: 100 },
  { week: 'Week 3', completed: 5, missed: 2, rate: 71 },
  { week: 'Week 4', completed: 6, missed: 1, rate: 86 },
  { week: 'Week 5', completed: 4, missed: 1, rate: 80 },
];

const mockCategoryData = [
  { category: 'Health & Fitness', completed: 12, total: 15 },
  { category: 'Learning', completed: 8, total: 10 },
  { category: 'Personal', completed: 6, total: 6 },
  { category: 'Work', completed: 2, total: 2 },
];

const mockTimeSlots = [
  { time: '6AM - 9AM', count: 8, percentage: 29 },
  { time: '9AM - 12PM', count: 3, percentage: 11 },
  { time: '12PM - 3PM', count: 2, percentage: 7 },
  { time: '3PM - 6PM', count: 5, percentage: 18 },
  { time: '6PM - 9PM', count: 8, percentage: 29 },
  { time: '9PM - 12AM', count: 2, percentage: 7 },
];

const mockVoiceUsage = [
  { voice: 'Default Female', usage: 15, percentage: 54 },
  { voice: 'Calm Voice', usage: 8, percentage: 29 },
  { voice: 'Default Male', usage: 3, percentage: 11 },
  { voice: 'Silent Mode', usage: 2, percentage: 7 },
];

export const AnalyticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'week' | 'year'>('month');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Create dynamic styles based on current theme
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const totalTasks = mockAnalytics.tasksCompleted + mockAnalytics.tasksMissed;

  const renderChart = () => {
    const maxValue = Math.max(...mockWeeklyData.map(d => Math.max(d.completed, d.missed)));
    const chartHeight = 120;
    const barWidth = (width - spacing.lg * 4) / mockWeeklyData.length - spacing.sm;

    return (
      <View style={styles.chart}>
        <View style={styles.chartBars}>
          {mockWeeklyData.map((week, index) => (
            <View key={index} style={styles.chartBar}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: (week.completed / maxValue) * chartHeight,
                      backgroundColor: theme.colors.success,
                      width: barWidth / 2 - 2,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    {
                      height: (week.missed / maxValue) * chartHeight,
                      backgroundColor: theme.colors.danger,
                      width: barWidth / 2 - 2,
                    },
                  ]}
                />
              </View>
              <Text style={styles.chartLabel}>{week.week.replace('Week ', 'W')}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
            <Text style={styles.legendText}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
            <Text style={styles.legendText}>Missed</Text>
          </View>
        </View>
      </View>
    );
  };

  const getCategoryColor = (index: number) => {
    const colors = [theme.colors.success, theme.colors.primary, theme.colors.warning, theme.colors.secondary];
    return colors[index % colors.length];
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Badge variant="info" size="sm">
          {mockAnalytics.month} {mockAnalytics.year}
        </Badge>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Stats */}
        <Card style={styles.overviewCard} shadow="lg">
          <Text style={styles.cardTitle}>Monthly Overview</Text>
          
          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewNumber}>{mockAnalytics.completionRate}%</Text>
              <Text style={styles.overviewLabel}>Success Rate</Text>
              <View style={styles.overviewProgress}>
                <ProgressBar
                  progress={mockAnalytics.completionRate}
                  height={4}
                  color={theme.colors.success}
                />
              </View>
            </View>
            
            <View style={styles.overviewItem}>
              <Text style={styles.overviewNumber}>{mockAnalytics.tasksCompleted}</Text>
              <Text style={styles.overviewLabel}>Completed</Text>
              <Text style={styles.overviewSubtext}>of {totalTasks} total</Text>
            </View>
            
            <View style={styles.overviewItem}>
              <Text style={styles.overviewNumber}>{mockAnalytics.longestStreak}</Text>
              <Text style={styles.overviewLabel}>Best Streak</Text>
              <View style={styles.overviewIcon}>
                <Ionicons name="flame" size={16} color={theme.colors.warning} />
              </View>
            </View>
            
            <View style={styles.overviewItem}>
              <Text style={styles.overviewNumber}>{mockAnalytics.tasksMissed}</Text>
              <Text style={styles.overviewLabel}>Missed</Text>
              <Text style={styles.overviewSubtext}>opportunities</Text>
            </View>
          </View>
        </Card>

        {/* Weekly Progress Chart */}
        <Card style={styles.chartCard} shadow="md">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Weekly Breakdown</Text>
            <TouchableOpacity>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {renderChart()}
        </Card>

        {/* Performance by Category */}
        <Card style={styles.categoryCard} shadow="md">
          <Text style={styles.cardTitle}>Performance by Category</Text>
          
          <View style={styles.categoryList}>
            {mockCategoryData.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.category && styles.categoryItemSelected
                ]}
                onPress={() => setSelectedCategory(
                  selectedCategory === category.category ? null : category.category
                )}
              >
                <View style={styles.categoryInfo}>
                  <View style={styles.categoryRow}>
                    <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(index) }]} />
                    <Text style={styles.categoryName}>{category.category}</Text>
                    <Text style={styles.categoryRatio}>
                      {category.completed}/{category.total}
                    </Text>
                  </View>
                  <View style={styles.categoryProgress}>
                    <ProgressBar
                      progress={(category.completed / category.total) * 100}
                      height={6}
                      color={getCategoryColor(index)}
                    />
                  </View>
                </View>
                <Text style={styles.categoryPercentage}>
                  {Math.round((category.completed / category.total) * 100)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Time Analysis */}
        <Card style={styles.timeCard} shadow="md">
          <Text style={styles.cardTitle}>Peak Performance Times</Text>
          
          <View style={styles.timeSlots}>
            {mockTimeSlots.map((slot, index) => (
              <View key={index} style={styles.timeSlot}>
                <View style={styles.timeSlotHeader}>
                  <Text style={styles.timeSlotTime}>{slot.time}</Text>
                  <Text style={styles.timeSlotCount}>{slot.count} tasks</Text>
                </View>
                <View style={styles.timeSlotBar}>
                  <View 
                    style={[
                      styles.timeSlotProgress,
                      { 
                        width: `${slot.percentage}%`,
                        backgroundColor: theme.colors.primary + '60'
                      }
                    ]}
                  />
                </View>
                <Text style={styles.timeSlotPercentage}>{slot.percentage}%</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Voice Usage */}
        <Card style={styles.voiceCard} shadow="md">
          <Text style={styles.cardTitle}>Voice Usage Statistics</Text>
          
          <View style={styles.voiceList}>
            {mockVoiceUsage.map((voice, index) => (
              <View key={index} style={styles.voiceItem}>
                <View style={styles.voiceInfo}>
                  <Text style={styles.voiceName}>{voice.voice}</Text>
                  <Text style={styles.voiceUsage}>{voice.usage} times</Text>
                </View>
                <View style={styles.voicePercentage}>
                  <Text style={styles.voicePercentageText}>{voice.percentage}%</Text>
                </View>
              </View>
            ))}
          </View>
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
    backgroundColor: theme.colors.surface,
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
  overviewCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  overviewItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  overviewNumber: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  overviewLabel: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: spacing.sm,
  },
  overviewSubtext: {
    fontSize: fontSize.xs,
    color: theme.colors.textSecondary,
  },
  overviewProgress: {
    width: '100%',
    marginTop: spacing.sm,
  },
  overviewIcon: {
    marginTop: spacing.sm,
  },
  chartCard: {
    marginBottom: spacing.lg,
  },
  chart: {
    alignItems: 'center',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    width: '100%',
    marginBottom: spacing.lg,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  bar: {
    borderRadius: borderRadius.sm,
    marginHorizontal: 1,
  },
  chartLabel: {
    fontSize: fontSize.xs,
    color: theme.colors.textSecondary,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
  },
  categoryCard: {
    marginBottom: spacing.lg,
  },
  categoryList: {
    gap: spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  categoryName: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '500',
    color: theme.colors.text,
  },
  categoryRatio: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
  },
  categoryProgress: {
    marginTop: spacing.sm,
  },
  categoryPercentage: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: spacing.md,
  },
  timeCard: {
    marginBottom: spacing.lg,
  },
  timeSlots: {
    gap: spacing.md,
  },
  timeSlot: {
    paddingVertical: spacing.sm,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  timeSlotTime: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: theme.colors.text,
  },
  timeSlotCount: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
  },
  timeSlotBar: {
    height: 6,
    backgroundColor: isDark ? theme.colors.textSecondary + '20' : theme.colors.textSecondary + '10',
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  timeSlotProgress: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  timeSlotPercentage: {
    fontSize: fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  voiceCard: {
    marginBottom: spacing.lg,
  },
  voiceList: {
    gap: spacing.md,
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
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
  voiceUsage: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
  },
  voicePercentage: {
    marginLeft: spacing.md,
  },
  voicePercentageText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
}); 