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
import { colors, fontSize, spacing, borderRadius } from '../styles/theme';
import { Card, Badge } from '../components/ui';
import { CalendarDay, Task } from '../types';

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - spacing.lg * 2 - spacing.sm * 6) / 7;

// Mock data for demonstration
const mockCalendarData: CalendarDay[] = [
  { dateString: '2024-01-01', status: 'completed', tasks: [] },
  { dateString: '2024-01-02', status: 'completed', tasks: [] },
  { dateString: '2024-01-03', status: 'missed', tasks: [] },
  { dateString: '2024-01-04', status: 'completed', tasks: [] },
  { dateString: '2024-01-05', status: 'completed', tasks: [] },
  { dateString: '2024-01-06', status: 'completed', tasks: [] },
  { dateString: '2024-01-07', status: 'missed', tasks: [] },
  { dateString: '2024-01-08', status: 'completed', tasks: [] },
  { dateString: '2024-01-09', status: 'completed', tasks: [] },
  { dateString: '2024-01-10', status: 'completed', tasks: [] },
  { dateString: '2024-01-11', status: 'completed', tasks: [] },
  { dateString: '2024-01-12', status: 'completed', tasks: [] },
  { dateString: '2024-01-13', status: 'completed', tasks: [] },
  { dateString: '2024-01-14', status: 'completed', tasks: [] },
  { dateString: '2024-01-15', status: 'pending', tasks: [] },
];

const mockStreakData = {
  currentStreak: 7,
  longestStreak: 15,
  streakStartDate: '2024-01-08',
  totalDaysTracked: 15,
  completionRate: 87,
};

export const CalendarScreen: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>(mockCalendarData);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatDateString = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getDateStatus = (date: Date) => {
    const dateString = formatDateString(date);
    const dayData = calendarData.find(d => d.dateString === dateString);
    return dayData?.status || 'no-task';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success[500];
      case 'missed':
        return colors.danger[500];
      case 'pending':
        return colors.warning[500];
      default:
        return colors.gray[200];
    }
  };

  const getStatusBackgroundColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success[100];
      case 'missed':
        return colors.danger[100];
      case 'pending':
        return colors.warning[100];
      default:
        return 'transparent';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate === formatDateString(date);
  };

  const handleDatePress = (date: Date) => {
    const dateString = formatDateString(date);
    setSelectedDate(selectedDate === dateString ? null : dateString);
  };

  const days = getDaysInMonth(currentDate);

  const completedDays = calendarData.filter(d => d.status === 'completed').length;
  const missedDays = calendarData.filter(d => d.status === 'missed').length;
  const totalTrackedDays = completedDays + missedDays;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Streak Calendar</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Streak Stats */}
        <Card style={styles.streakCard} shadow="lg">
          <View style={styles.streakHeader}>
            <View style={styles.streakMain}>
              <View style={styles.streakIconContainer}>
                <Ionicons name="flame" size={32} color={colors.warning[500]} />
              </View>
              <View style={styles.streakInfo}>
                <Text style={styles.streakNumber}>{mockStreakData.currentStreak}</Text>
                <Text style={styles.streakLabel}>Day Streak</Text>
              </View>
            </View>
            <View style={styles.streakSecondary}>
              <Text style={styles.streakSecondaryNumber}>{mockStreakData.longestStreak}</Text>
              <Text style={styles.streakSecondaryLabel}>Best</Text>
            </View>
          </View>

          <View style={styles.streakStats}>
            <View style={styles.streakStat}>
              <Text style={styles.streakStatNumber}>{mockStreakData.completionRate}%</Text>
              <Text style={styles.streakStatLabel}>Success Rate</Text>
            </View>
            <View style={styles.streakStat}>
              <Text style={styles.streakStatNumber}>{completedDays}</Text>
              <Text style={styles.streakStatLabel}>Completed</Text>
            </View>
            <View style={styles.streakStat}>
              <Text style={styles.streakStatNumber}>{missedDays}</Text>
              <Text style={styles.streakStatLabel}>Missed</Text>
            </View>
          </View>
        </Card>

        {/* Calendar */}
        <Card style={styles.calendarCard} shadow="md">
          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              style={styles.monthNavButton}
              onPress={() => navigateMonth('prev')}
            >
              <Ionicons name="chevron-back" size={20} color={colors.gray[600]} />
            </TouchableOpacity>
            
            <Text style={styles.monthTitle}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
            
            <TouchableOpacity
              style={styles.monthNavButton}
              onPress={() => navigateMonth('next')}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          {/* Day Names */}
          <View style={styles.dayNamesRow}>
            {dayNames.map((day) => (
              <View key={day} style={styles.dayNameCell}>
                <Text style={styles.dayNameText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {days.map((date, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarCell,
                  date && isToday(date) && styles.todayCell,
                  date && isSelected(date) && styles.selectedCell,
                ]}
                onPress={() => date && handleDatePress(date)}
                disabled={!date}
              >
                {date && (
                  <>
                    <Text style={[
                      styles.calendarCellText,
                      isToday(date) && styles.todayCellText,
                      isSelected(date) && styles.selectedCellText,
                    ]}>
                      {date.getDate()}
                    </Text>
                    
                    {/* Status Indicator */}
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(getDateStatus(date)) }
                    ]} />
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Legend */}
        <Card style={styles.legendCard} shadow="sm">
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success[500] }]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.danger[500] }]} />
              <Text style={styles.legendText}>Missed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning[500] }]} />
              <Text style={styles.legendText}>Pending</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.gray[300] }]} />
              <Text style={styles.legendText}>No Tasks</Text>
            </View>
          </View>
        </Card>

        {/* Selected Date Details */}
        {selectedDate && (
          <Card style={styles.detailCard} shadow="md">
            <View style={styles.detailHeader}>
              <Text style={styles.detailDate}>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <Badge 
                variant={
                  getDateStatus(new Date(selectedDate)) === 'completed' ? 'success' :
                  getDateStatus(new Date(selectedDate)) === 'missed' ? 'danger' :
                  getDateStatus(new Date(selectedDate)) === 'pending' ? 'warning' : 'secondary'
                }
              >
                {getDateStatus(new Date(selectedDate)).replace('-', ' ')}
              </Badge>
            </View>
            
            <View style={styles.detailContent}>
              {getDateStatus(new Date(selectedDate)) === 'no-task' ? (
                <Text style={styles.noTasksText}>No tasks scheduled for this day</Text>
              ) : (
                <View style={styles.taskSummary}>
                  <Text style={styles.taskSummaryText}>
                    Task completion status for this day
                  </Text>
                  {/* In a real app, this would show the actual tasks */}
                </View>
              )}
            </View>
          </Card>
        )}

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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  streakCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  streakMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.warning[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  streakInfo: {
    alignItems: 'flex-start',
  },
  streakNumber: {
    fontSize: fontSize['4xl'],
    fontWeight: '700',
    color: colors.gray[900],
    lineHeight: fontSize['4xl'] * 1.1,
  },
  streakLabel: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    fontWeight: '500',
  },
  streakSecondary: {
    alignItems: 'center',
  },
  streakSecondaryNumber: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[700],
    lineHeight: fontSize['2xl'] * 1.1,
  },
  streakSecondaryLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  streakStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  streakStat: {
    alignItems: 'center',
  },
  streakStatNumber: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs / 2,
  },
  streakStatLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  calendarCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  monthNavButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
  },
  monthTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.gray[900],
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dayNameCell: {
    width: CELL_SIZE,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dayNameText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray[600],
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.xs,
  },
  todayCell: {
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.md,
  },
  selectedCell: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
  },
  calendarCellText: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    fontWeight: '500',
    marginBottom: 4,
  },
  todayCellText: {
    color: colors.primary[700],
    fontWeight: '700',
  },
  selectedCellText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 6,
  },
  legendCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  legendTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  detailCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detailDate: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  detailContent: {
    paddingTop: spacing.sm,
  },
  noTasksText: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    fontStyle: 'italic',
  },
  taskSummary: {
    alignItems: 'center',
  },
  taskSummaryText: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    textAlign: 'center',
  },
  bottomSpacing: {
    height: spacing.xl,
  },
}); 