import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Badge, Button, Card, Text } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import { TaskService } from '../services/taskService';
import { borderRadius, fontSize, spacing } from '../styles/theme';
import { MainTabParamList, RootStackParamList, Task } from '../types';

type NavigationProp = CompositeNavigationProp<
  StackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

interface TaskStats {
  tasksCompletedToday: number;
  totalTasksToday: number;
}

export const ToDoListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    tasksCompletedToday: 0,
    totalTasksToday: 0,
  });
  const [loading, setLoading] = useState(true);

  // Create dynamic styles based on current theme
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  // Real-time subscription for task updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('task-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tasks',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Task changed:', payload);
          loadTasks(); // Reload tasks when changes occur
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'task_executions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Task execution changed:', payload);
          loadTasks(); // Reload when executions change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    await loadTasks();
    setLoading(false);
  };

  const loadTasks = async () => {
    try {
      const allTasks = await TaskService.getAllTasks();
      setTasks(allTasks);
      
      // Update stats based on loaded tasks
      const todaysTasks = allTasks.filter(task => {
        const taskDate = new Date(task.scheduledTime).toDateString();
        const today = new Date().toDateString();
        return taskDate === today;
      });
      
      const completed = todaysTasks.filter(task => task.isCompleted).length;
      setStats({
        tasksCompletedToday: completed,
        totalTasksToday: todaysTasks.length
      });
    } catch (error) {
      console.error('Failed to load tasks:', error);
      Alert.alert('Error', 'Failed to load tasks. Please try again.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleCreateTask = () => {
    navigation.navigate('CreateTask');
  };

  const handleTaskToggle = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updatedTask = {
        ...task,
        isCompleted: !task.isCompleted,
        completedAt: !task.isCompleted ? new Date().toISOString() : undefined
      };

      // Optimistically update UI
      setTasks(prevTasks =>
        prevTasks.map(t => t.id === taskId ? updatedTask : t)
      );

      // Update via service
      await TaskService.updateTask(taskId, {
        isCompleted: updatedTask.isCompleted,
        completedAt: updatedTask.completedAt
      });

      // Refresh tasks
      await loadTasks();
    } catch (error) {
      console.error('Failed to toggle task:', error);
      // Revert optimistic update
      await loadTasks();
      Alert.alert('Error', 'Failed to update task. Please try again.');
    }
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
  const progressPercentage = todaysTasks.length > 0 
    ? (completedTasksToday / todaysTasks.length) * 100 
    : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text variant="h6" color="textSecondary">Loading your tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="h4" color="text" style={styles.greeting}>
              {getGreeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
            </Text>
            <Text variant="body" color="textSecondary">
              Let's make today productive
            </Text>
          </View>
        </View>

        {/* Tasks */}
        <Card style={styles.tasksCard} shadow="md">
          <View style={styles.tasksHeader}>
            <Text variant="h6" color="text">All Tasks</Text>
            <TouchableOpacity onPress={handleCreateTask}>
              <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.textSecondary} />
              <Text variant="body" color="textSecondary" style={styles.emptyText}>
                No tasks created yet
              </Text>
              <Button
                title="Create Your First Task"
                onPress={handleCreateTask}
                variant="primary"
                style={styles.createButton}
              />
            </View>
          ) : (
            <View style={styles.tasksList}>
              {tasks.map((task, index) => (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.taskItem,
                    task.isCompleted && styles.taskItemCompleted,
                    index === tasks.length - 1 && styles.taskItemLast
                  ]}
                  onPress={() => handleTaskToggle(task.id)}
                >
                  <View style={styles.taskContent}>
                    <Ionicons
                      name={task.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={task.isCompleted ? theme.colors.success : theme.colors.textSecondary}
                    />
                    <View style={styles.taskDetails}>
                      <Text
                        variant="body"
                        color={task.isCompleted ? 'textSecondary' : 'text'}
                        style={[
                          styles.taskTitle,
                          task.isCompleted && styles.taskTitleCompleted
                        ]}
                      >
                        {task.title}
                      </Text>
                      <View style={styles.taskMeta}>
                        <Text variant="caption" color="textSecondary">
                          {formatTime(task.scheduledTime)}
                        </Text>
                        {task.isRecurring && (
                          <Badge variant="secondary" size="sm" style={styles.taskBadge}>
                            Recurring
                          </Badge>
                        )}
                        {task.isSilentMode && (
                          <Badge variant="warning" size="sm" style={styles.taskBadge}>
                            Silent
                          </Badge>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>
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
  scrollView: {
    flex: 1,
    padding: spacing.lg,
  },
  greeting: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: spacing.xs,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  createButton: {
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
  taskItemLast: {
    borderBottomWidth: 0,
  },
  taskContent: {
    flex: 1,
  },
  taskDetails: {
    flex: 1,
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
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  taskBadge: {
    marginLeft: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 