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
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
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
  { category: 'Health & Fitness', completed: 12, total: 15, color: colors.success[500] },
  { category: 'Learning', completed: 8, total: 10, color: colors.primary[500] },
  { category: 'Personal', completed: 6, total: 6, color: colors.warning[500] },
  { category: 'Work', completed: 2, total: 2, color: colors.secondary[500] },
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
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'week' | 'year'>('month');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
                      backgroundColor: colors.success[500],
                      width: barWidth / 2 - 2,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    {
                      height: (week.missed / maxValue) * chartHeight,
                      backgroundColor: colors.danger[500],
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
            <View style={[styles.legendDot, { backgroundColor: colors.success[500] }]} />
            <Text style={styles.legendText}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger[500] }]} />
            <Text style={styles.legendText}>Missed</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.gray[600]} />
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
                  color={colors.success[500]}
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
                <Ionicons name="flame" size={16} color={colors.warning[500]} />
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
              <Ionicons name="information-circle-outline" size={20} color={colors.gray[500]} />
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
                  <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
                  <Text style={styles.categoryName}>{category.category}</Text>
                </View>
                
                <View style={styles.categoryStats}>
                  <Text style={styles.categoryStatsText}>
                    {category.completed}/{category.total}
                  </Text>
                  <Text style={styles.categoryPercentage}>
                    {Math.round((category.completed / category.total) * 100)}%
                  </Text>
                </View>
                
                <View style={styles.categoryProgress}>
                  <ProgressBar
                    progress={(category.completed / category.total) * 100}
                    height={6}
                    color={category.color}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Time Analysis */}
        <Card style={styles.timeCard} shadow="md">
          <Text style={styles.cardTitle}>Peak Performance Times</Text>
          <Text style={styles.cardSubtitle}>When you complete tasks most often</Text>
          
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
                      styles.timeSlotFill,
                      { width: `${slot.percentage}%` }
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
          <Text style={styles.cardTitle}>Voice Preferences</Text>
          <Text style={styles.cardSubtitle}>Most used voice: {mockAnalytics.mostUsedVoice}</Text>
          
          <View style={styles.voiceList}>
            {mockVoiceUsage.map((voice, index) => (
              <View key={index} style={styles.voiceItem}>
                <View style={styles.voiceInfo}>
                  <Ionicons
                    name={voice.voice === 'Silent Mode' ? 'notifications-off' : 'volume-high'}
                    size={16}
                    color={colors.gray[600]}
                  />
                  <Text style={styles.voiceName}>{voice.voice}</Text>
                </View>
                
                <View style={styles.voiceStats}>
                  <Text style={styles.voiceUsageText}>{voice.usage} uses</Text>
                  <View style={styles.voiceBar}>
                    <View
                      style={[
                        styles.voiceBarFill,
                        { width: `${voice.percentage}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.voicePercentage}>{voice.percentage}%</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Insights & Recommendations */}
        <Card style={styles.insightsCard} shadow="md">
          <View style={styles.insightsHeader}>
            <Ionicons name="bulb" size={24} color={colors.warning[500]} />
            <Text style={styles.cardTitle}>Insights & Tips</Text>
          </View>
          
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <Ionicons name="trending-up" size={16} color={colors.success[500]} />
              <Text style={styles.insightText}>
                Your completion rate improved by 12% this month!
              </Text>
            </View>
            
            <View style={styles.insightItem}>
              <Ionicons name="time" size={16} color={colors.primary[500]} />
              <Text style={styles.insightText}>
                You're most productive in the morning (6-9 AM) and evening (6-9 PM).
              </Text>
            </View>
            
            <View style={styles.insightItem}>
              <Ionicons name="fitness" size={16} color={colors.warning[500]} />
              <Text style={styles.insightText}>
                Health & Fitness tasks have the highest completion rate. Great job!
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  overviewCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  overviewItem: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
  },
  overviewNumber: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs / 2,
  },
  overviewLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  overviewSubtext: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    textAlign: 'center',
  },
  overviewProgress: {
    width: '100%',
    marginTop: spacing.xs,
  },
  overviewIcon: {
    marginTop: spacing.xs,
  },
  chartCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  chart: {
    alignItems: 'center',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginBottom: spacing.xs,
  },
  bar: {
    borderRadius: 2,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[600],
    textAlign: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  categoryCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  categoryList: {
    gap: spacing.md,
  },
  categoryItem: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[50],
  },
  categoryItemSelected: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  categoryName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.gray[900],
    flex: 1,
  },
  categoryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  categoryStatsText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  categoryPercentage: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray[700],
  },
  categoryProgress: {
    marginTop: spacing.xs,
  },
  timeCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  timeSlots: {
    gap: spacing.md,
  },
  timeSlot: {
    gap: spacing.xs,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSlotTime: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.gray[700],
  },
  timeSlotCount: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  timeSlotBar: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  timeSlotFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 4,
  },
  timeSlotPercentage: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    textAlign: 'right',
  },
  voiceCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  voiceList: {
    gap: spacing.md,
  },
  voiceItem: {
    gap: spacing.sm,
  },
  voiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  voiceName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.gray[700],
  },
  voiceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  voiceUsageText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    width: 60,
  },
  voiceBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  voiceBarFill: {
    height: '100%',
    backgroundColor: colors.secondary[500],
    borderRadius: 3,
  },
  voicePercentage: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    width: 30,
    textAlign: 'right',
  },
  insightsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  insightsList: {
    gap: spacing.md,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
  },
  insightText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    flex: 1,
    lineHeight: fontSize.sm * 1.4,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
}); 