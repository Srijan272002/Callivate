// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Task types
export interface Task {
  id: string;
  userId: string;
  title: string;
  scheduledTime: string;
  isCompleted: boolean;
  isRecurring: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'custom';
  recurrencePattern?: string;
  voiceId?: string;
  isSilentMode: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Voice types
export interface Voice {
  id: string;
  name: string;
  isDefault: boolean;
  isCustom: boolean;
  audioUrl?: string;
}

// Streak types
export interface Streak {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Note types
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  createdAt: string;
  updatedAt: string;
}

// Analytics types
export interface MonthlyAnalytics {
  id: string;
  userId: string;
  month: string;
  year: number;
  tasksCompleted: number;
  tasksMissed: number;
  completionRate: number;
  longestStreak: number;
  mostUsedVoice?: string;
  createdAt: string;
}

// Calendar types
export interface CalendarDay {
  dateString: string;
  status: 'completed' | 'missed' | 'pending' | 'no-task';
  tasks: Task[];
}

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Main: undefined;
  Analytics: undefined;
  EditTask: { taskId: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  CreateTask: undefined;
  Notes: undefined;
  Settings: undefined;
};

export type TaskStackParamList = {
  CreateTask: undefined;
  EditTask: { taskId: string };
  TaskDetail: { taskId: string };
};

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Notification types
export interface NotificationData {
  taskId?: string;
  type: 'reminder' | 'follow-up' | 'streak-break' | 'motivation';
  title?: string;
  body?: string;
  action?: string;
  offline?: boolean;
  streakCount?: number;
  [key: string]: any;
}

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    danger: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
}

// Form types
export interface CreateTaskForm {
  title: string;
  scheduledTime: Date;
  isRecurring: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'custom';
  voiceId?: string;
  isSilentMode: boolean;
}

export interface EditTaskForm extends CreateTaskForm {
  id: string;
}

// Settings types
export interface UserSettings {
  id: string;
  userId: string;
  defaultVoiceId?: string;
  enableNotifications: boolean;
  enableSilentMode: boolean;
  preferredTimeFormat: '12h' | '24h';
  createdAt: string;
  updatedAt: string;
} 