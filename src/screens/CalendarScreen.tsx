import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Badge, Card } from '../components/ui';
import { useTheme } from '../hooks/useTheme';
import { TaskService } from '../services/taskService';
import { borderRadius, fontSize, spacing } from '../styles/theme';
import { CalendarDay, Task } from '../types';

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - spacing.lg * 2) / 7;

export const CalendarScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    streakStartDate: '',
  });

  // Create dynamic styles based on current theme
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Refresh tasks when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadTasks();
    }, [])
  );

  // Refresh calendar when tasks or current date changes
  useEffect(() => {
    generateCalendarDays();
  }, [currentDate, tasks]);

  const loadTasks = async () => {
    try {
      const allTasks = await TaskService.getAllTasks();
      setTasks(allTasks);
      
      // TODO: Replace with actual streak data from backend
      setStreakData({
        currentStreak: 7,
        longestStreak: 15,
        streakStartDate: '2024-01-09',
      });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    const today = new Date().toDateString();

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      const dayTasks = tasks.filter(task => {
        const taskDate = new Date(task.scheduledTime).toISOString().split('T')[0];
        return taskDate === dateString;
      });

      let status: CalendarDay['status'] = 'no-task';
      if (dayTasks.length > 0) {
        const completedTasks = dayTasks.filter(task => task.isCompleted);
        if (completedTasks.length === dayTasks.length) {
          status = 'completed';
        } else if (date.toDateString() < today) {
          status = 'missed';
        } else {
          status = 'pending';
        }
      }

      days.push({
        dateString,
        status,
        tasks: dayTasks,
      });
    }

    setCalendarDays(days);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).getDate().toString();
  };

  const isToday = (dateString: string) => {
    return new Date(dateString).toDateString() === new Date().toDateString();
  };

  const isCurrentMonth = (dateString: string) => {
    return new Date(dateString).getMonth() === currentDate.getMonth();
  };

  const getStatusColor = (status: CalendarDay['status']) => {
    switch (status) {
      case 'completed':
        return theme.colors.success;
      case 'missed':
        return theme.colors.danger;
      case 'pending':
        return theme.colors.warning;
      default:
        return 'transparent';
    }
  };

  const selectedDay = selectedDate ? calendarDays.find(day => day.dateString === selectedDate) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Empty Header Section */}
      <View style={styles.header} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Stats */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard} shadow="lg">
            <View style={styles.statContent}>
              <Ionicons name="flame" size={24} color={theme.colors.warning} />
              <View style={styles.statInfo}>
                <Text style={styles.streakStatNumber}>{streakData.currentStreak}</Text>
                <Text style={styles.streakStatLabel}>Day Streak</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.statCard} shadow="lg">
            <View style={styles.statContent}>
              <Ionicons name="trophy" size={24} color={theme.colors.success} />
              <View style={styles.statInfo}>
                <Text style={styles.streakStatNumber}>{streakData.longestStreak}</Text>
                <Text style={styles.streakStatLabel}>Best Streak</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Calendar */}
        <Card style={styles.calendarCard} shadow="md">
          <View style={styles.calendarHeader}>
            <TouchableOpacity 
              style={styles.monthNavButton}
              onPress={() => navigateMonth('prev')}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            
            <Text style={styles.monthTitle}>
              {currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </Text>
            
            <TouchableOpacity 
              style={styles.monthNavButton}
              onPress={() => navigateMonth('next')}
            >
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day names */}
          <View style={styles.dayNamesRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <View key={day} style={styles.dayNameCell}>
                <Text style={styles.dayNameText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day) => (
              <TouchableOpacity
                key={day.dateString}
                style={[
                  styles.calendarCell,
                  isToday(day.dateString) && styles.todayCell,
                  selectedDate === day.dateString && styles.selectedCell,
                  !isCurrentMonth(day.dateString) && styles.otherMonthCell,
                ]}
                onPress={() => setSelectedDate(
                  selectedDate === day.dateString ? null : day.dateString
                )}
              >
                <Text style={[
                  styles.calendarCellText,
                  isToday(day.dateString) && styles.todayCellText,
                  selectedDate === day.dateString && styles.selectedCellText,
                  !isCurrentMonth(day.dateString) && styles.otherMonthText,
                ]}>
                  {formatDate(day.dateString)}
                </Text>
                
                {day.status !== 'no-task' && (
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(day.status) }
                  ]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Legend */}
        <Card style={styles.legendCard} shadow="sm">
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
              <Text style={styles.legendText}>Pending</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
              <Text style={styles.legendText}>Missed</Text>
            </View>
          </View>
        </Card>

        {/* Selected Day Details */}
        {selectedDay && (
          <Card style={styles.dayDetailsCard} shadow="md">
            <View style={styles.dayDetailsHeader}>
              <Text style={styles.dayDetailsTitle}>
                {new Date(selectedDay.dateString).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <Badge 
                variant={selectedDay.status === 'completed' ? 'success' : 
                       selectedDay.status === 'missed' ? 'danger' : 
                       selectedDay.status === 'pending' ? 'warning' : 'secondary'}
                size="sm"
              >
                {selectedDay.status === 'no-task' ? 'No Tasks' : 
                 selectedDay.status.charAt(0).toUpperCase() + selectedDay.status.slice(1)}
              </Badge>
            </View>

            {selectedDay.tasks.length > 0 ? (
              <View style={styles.tasksList}>
                {selectedDay.tasks.map((task) => (
                  <View key={task.id} style={styles.taskItem}>
                    <View style={styles.taskLeft}>
                      <Ionicons
                        name={task.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={task.isCompleted ? theme.colors.success : theme.colors.textSecondary}
                      />
                      <View style={styles.taskInfo}>
                        <Text style={[
                          styles.taskTitle,
                          task.isCompleted && styles.taskTitleCompleted
                        ]}>
                          {task.title}
                        </Text>
                        <Text style={styles.taskTime}>
                          {new Date(task.scheduledTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.taskRight}>
                      {task.isRecurring && (
                        <Ionicons name="repeat" size={16} color={theme.colors.textSecondary} />
                      )}
                      {task.isSilentMode && (
                        <Ionicons name="notifications-off" size={16} color={theme.colors.textSecondary} />
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noTasksContainer}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.noTasksText}>No tasks scheduled</Text>
                <Text style={styles.noTasksSubtext}>
                  This day is free for you to enjoy!
                </Text>
              </View>
            )}
          </Card>
        )}

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
    height: 60,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statInfo: {
    marginLeft: spacing.md,
  },
  streakStatNumber: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: spacing.xs / 2,
  },
  streakStatLabel: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
  },
  calendarCard: {
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
    backgroundColor: theme.colors.surface,
  },
  monthTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
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
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.primary + '20',
    borderRadius: borderRadius.md,
  },
  selectedCell: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
  },
  otherMonthCell: {
    opacity: 0.3,
  },
  calendarCellText: {
    fontSize: fontSize.base,
    color: theme.colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  todayCellText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  selectedCellText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  otherMonthText: {
    color: theme.colors.textSecondary,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 6,
  },
  legendCard: {
    marginBottom: spacing.lg,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  dayDetailsCard: {
    marginBottom: spacing.lg,
  },
  dayDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  dayDetailsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  tasksList: {
    gap: spacing.md,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  taskTitle: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: spacing.xs / 2,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  taskTime: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
  },
  taskRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noTasksContainer: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  noTasksText: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  noTasksSubtext: {
    fontSize: fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: spacing.xl,
  },
}); 