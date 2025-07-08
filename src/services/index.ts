// API Services
export * from './api';
export * from './auth';
export * from './callingService';
export * from './notifications';
export * from './offlineService';
export * from './realtimeService';
export * from './storage';
export * from './supabase';
export * from './syncService';
export * from './taskExecutionService';
export * from './taskService';
export * from './voiceService';

// Services are now available:
// - Storage service (SecureStore wrapper)
// - Supabase client configuration
// - Authentication service
// - Notification service (local notifications, permissions, scheduling)
// - Offline service (data persistence, sync queue, network detection)
// - Task service (integrates offline & notifications for task management)
// - Voice service (voice preview, TTS, voice selection with enhanced agent personalities)
// - Calling service (AI phone call scheduling and management)
// - Task execution service (handles timer expiry, calling, and notification fallback)


// Placeholder for future services:
// - Analytics service 