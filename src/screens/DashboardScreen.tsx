import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { fontSize, spacing, fontWeight, borderRadius } from '../styles/theme';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Button, Card, Badge, ProgressBar, Text } from '../components/ui';
import { Task, RootStackParamList, MainTabParamList } from '../types';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  StackNavigationProp<RootStackParamList>
>;

// Mock data - in real app this would come from API/state management
const mockTasks: Task[] = [
  {
    id: '1',
    userId: 'user1',
    title: 'Morning workout',
    scheduledTime: '2024-01-15T07:00:00Z',
    isCompleted: false,
    isRecurring: true,
    recurrenceType: 'daily',
    isSilentMode: false,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  {
    id: '2',
    userId: 'user1',
    title: 'Read for 30 minutes',
    scheduledTime: '2024-01-15T20:00:00Z',
    isCompleted: true,
    isRecurring: true,
    recurrenceType: 'daily',
    isSilentMode: false,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-15T20:30:00Z',
    completedAt: '2024-01-15T20:25:00Z',
  },
  {
    id: '3',
    userId: 'user1',
    title: 'Call mom',
    scheduledTime: '2024-01-15T18:00:00Z',
    isCompleted: false,
    isRecurring: false,
    isSilentMode: true,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

const mockStats = {
  currentStreak: 7,
  longestStreak: 15,
  completionRate: 85,
  tasksCompletedToday: 1,
  totalTasksToday: 3,
};

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  // Create dynamic styles based on current theme
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleCreateTask = () => {
    // Navigate to Create Task tab
    console.log('Navigate to Create Task');
    navigation.navigate('CreateTask');
  };

  const handleAnalytics = () => {
    // Navigate to Analytics screen
    navigation.navigate('Analytics');
  };

  const handleTaskToggle = (taskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { 
              ...task, 
              isCompleted: !task.isCompleted,
              completedAt: !task.isCompleted ? new Date().toISOString() : undefined
            }
          : task
      )
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const todaysTasks = tasks.filter(task => {
    const taskDate = new Date(task.scheduledTime).toDateString();
    const today = new Date().toDateString();
    return taskDate === today;
  });

  const completedTasksToday = todaysTasks.filter(task => task.isCompleted).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>
            {getGreeting()}, {user?.name || user?.email?.split('@')[0] || 'there'}!
          </Text>
          <Text style={styles.subGreeting}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>

        {/* Quick Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard} shadow="lg">
            <View style={styles.statContent}>
              <View style={styles.statIcon}>
                <Ionicons name="flame" size={24} color={theme.colors.warning} />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statNumber}>{mockStats.currentStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.statCard} shadow="lg">
            <View style={styles.statContent}>
              <View style={styles.statIcon}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statNumber}>{completedTasksToday}/{todaysTasks.length}</Text>
                <Text style={styles.statLabel}>Today</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Completion Progress */}
        <Card style={styles.progressCard} shadow="md">
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Badge variant="info" size="sm">
              {Math.round((completedTasksToday / Math.max(todaysTasks.length, 1)) * 100)}%
            </Badge>
          </View>
          <ProgressBar 
            progress={(completedTasksToday / Math.max(todaysTasks.length, 1)) * 100}
            height={12}
            showLabel={false}
            color={theme.colors.primary}
          />
          <Text style={styles.progressSubtext}>
            {completedTasksToday} of {todaysTasks.length} tasks completed
          </Text>
        </Card>

        {/* Today's Tasks */}
        <Card style={styles.tasksCard} shadow="md">
          <View style={styles.tasksHeader}>
            <Text style={styles.tasksTitle}>Today's Tasks</Text>
            <TouchableOpacity onPress={handleCreateTask} style={styles.addButton}>
              <Ionicons name="add" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {todaysTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyStateText}>No tasks scheduled for today</Text>
              <Text style={styles.emptyStateSubtext}>Create your first AI reminder!</Text>
              <Button
                title="Create Task"
                size="sm"
                onPress={handleCreateTask}
                style={styles.emptyStateButton}
              />
            </View>
          ) : (
            <View style={styles.tasksList}>
              {todaysTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskItem, task.isCompleted && styles.taskItemCompleted]}
                  onPress={() => handleTaskToggle(task.id)}
                >
                  <View style={styles.taskContent}>
                    <View style={styles.taskMeta}>
                      <View style={[
                        styles.taskStatus,
                        { backgroundColor: task.isCompleted ? theme.colors.success : theme.colors.textSecondary }
                      ]}>
                        <Ionicons
                          name={task.isCompleted ? "checkmark" : "time"}
                          size={12}
                          color="#ffffff"
                        />
                      </View>
                      <Text style={styles.taskTime}>{formatTime(task.scheduledTime)}</Text>
                      {task.isSilentMode && (
                        <View style={styles.silentBadge}>
                          <Ionicons name="notifications-off" size={12} color={theme.colors.textSecondary} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.taskTitle, task.isCompleted && styles.taskTitleCompleted]}>
                      {task.title}
                    </Text>
                    {task.isRecurring && (
                      <View style={styles.recurringBadge}>
                        <Ionicons name="repeat" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.recurringText}>{task.recurrenceType}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity style={styles.taskAction}>
                    <Ionicons
                      name={task.isCompleted ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                      color={task.isCompleted ? theme.colors.success : theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={handleAnalytics}>
            <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '10' }]}>
              <Ionicons name="bar-chart" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.quickActionText}>View Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} onPress={handleCreateTask}>
            <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.success + '10' }]}>
              <Ionicons name="add-circle" size={24} color={theme.colors.success} />
            </View>
            <Text style={styles.quickActionText}>Quick Task</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.warning + '10' }]}>
              <Ionicons name="notifications" size={24} color={theme.colors.warning} />
            </View>
            <Text style={styles.quickActionText}>Reminders</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  greetingSection: {
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  subGreeting: {
    fontSize: fontSize.base,
    color: theme.colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: spacing.md,
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: spacing.xs / 2,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
  },
  progressCard: {
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  progressSubtext: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.sm,
  },
  tasksCard: {
    marginBottom: spacing.lg,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  tasksTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  addButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary + '10',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xl,
  },
  emptyStateButton: {
    paddingHorizontal: spacing.xl,
  },
  tasksList: {
    gap: spacing.md,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: isDark ? theme.colors.textSecondary + '10' : theme.colors.surface,
  },
  taskItemCompleted: {
    opacity: 0.7,
    backgroundColor: isDark ? theme.colors.success + '10' : theme.colors.success + '05',
  },
  taskContent: {
    flex: 1,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  taskStatus: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  taskTime: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    marginRight: spacing.md,
  },
  silentBadge: {
    backgroundColor: theme.colors.textSecondary + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.md,
  },
  taskTitle: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recurringText: {
    fontSize: fontSize.xs,
    color: theme.colors.textSecondary,
    marginLeft: spacing.xs,
    textTransform: 'capitalize',
  },
  taskAction: {
    padding: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
}); 