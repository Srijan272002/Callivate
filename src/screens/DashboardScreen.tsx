import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
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
import { colors, fontSize, spacing, fontWeight, borderRadius } from '../styles/theme';
import { useAuth } from '../hooks/useAuth';
import { Button, Card, Badge, ProgressBar } from '../components/ui';
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
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

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
                <Ionicons name="flame" size={24} color={colors.warning[500]} />
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
                <Ionicons name="checkmark-circle" size={24} color={colors.success[500]} />
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
            color={colors.primary[500]}
          />
          <Text style={styles.progressSubtext}>
            {completedTasksToday} of {todaysTasks.length} tasks completed
          </Text>
        </Card>

        {/* Today's Tasks */}
        <Card style={styles.tasksCard} shadow="md">
          <View style={styles.tasksHeader}>
            <Text style={styles.tasksTitle}>Today's Tasks</Text>
            <Button
              title="Create Task"
              size="sm"
              onPress={handleCreateTask}
              style={styles.createTaskButton}
            />
          </View>

          {todaysTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={colors.gray[400]} />
              <Text style={styles.emptyStateText}>No tasks scheduled for today</Text>
              <Text style={styles.emptyStateSubtext}>Create your first task to get started!</Text>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {todaysTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.taskItem,
                    task.isCompleted && styles.taskItemCompleted
                  ]}
                  onPress={() => handleTaskToggle(task.id)}
                >
                  <View style={styles.taskLeft}>
                    <View style={[
                      styles.taskCheckbox,
                      task.isCompleted && styles.taskCheckboxCompleted
                    ]}>
                      {task.isCompleted && (
                        <Ionicons name="checkmark" size={16} color="#ffffff" />
                      )}
                    </View>
                    <View style={styles.taskInfo}>
                      <Text style={[
                        styles.taskTitle,
                        task.isCompleted && styles.taskTitleCompleted
                      ]}>
                        {task.title}
                      </Text>
                      <View style={styles.taskMeta}>
                        <Text style={styles.taskTime}>{formatTime(task.scheduledTime)}</Text>
                        {task.isSilentMode && (
                          <View style={styles.taskMetaItem}>
                            <Ionicons name="notifications-off" size={12} color={colors.gray[500]} />
                            <Text style={styles.taskMetaText}>Silent</Text>
                          </View>
                        )}
                        {task.isRecurring && (
                          <View style={styles.taskMetaItem}>
                            <Ionicons name="repeat" size={12} color={colors.gray[500]} />
                            <Text style={styles.taskMetaText}>{task.recurrenceType}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.taskOptions}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.gray[400]} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Quick Analytics Preview */}
        <Card style={styles.analyticsCard} shadow="md">
          <View style={styles.analyticsHeader}>
            <Text style={styles.analyticsTitle}>This Month</Text>
            <TouchableOpacity onPress={handleAnalytics}>
              <Text style={styles.analyticsLink}>View Details</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsNumber}>{mockStats.completionRate}%</Text>
              <Text style={styles.analyticsLabel}>Completion Rate</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsNumber}>{mockStats.longestStreak}</Text>
              <Text style={styles.analyticsLabel}>Best Streak</Text>
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  greetingSection: {
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  subGreeting: {
    fontSize: fontSize.lg,
    color: colors.gray[600],
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs / 2,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  progressCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  progressSubtext: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    marginTop: spacing.sm,
  },
  tasksCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  tasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  tasksTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  createTaskButton: {
    paddingHorizontal: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    color: colors.gray[600],
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  tasksList: {
    gap: spacing.sm,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[50],
  },
  taskItemCompleted: {
    opacity: 0.7,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.base,
    borderWidth: 2,
    borderColor: colors.gray[300],
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxCompleted: {
    backgroundColor: colors.success[500],
    borderColor: colors.success[500],
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.gray[900],
    marginBottom: spacing.xs / 2,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.gray[600],
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  taskTime: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  taskMetaText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  taskOptions: {
    padding: spacing.sm,
  },
  analyticsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  analyticsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
  },
  analyticsLink: {
    fontSize: fontSize.sm,
    color: colors.primary[600],
    fontWeight: '500',
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
  },
  analyticsNumber: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.xs / 2,
  },
  analyticsLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
  },
  bottomSpacing: {
    height: spacing.xl,
  },
}); 