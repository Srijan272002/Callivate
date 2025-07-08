# Callivate Calling System Fix Implementation Plan

## Overview
This document outlines the implementation plan to fix two critical issues:
1. **Voice Differentiation**: All AI agents sound the same despite different names
2. **Calling System Integration**: Timer expiry doesn't trigger calls or notifications

## Current Issues Analysis

### Issue 1: Voice Preview Problems 🎙️
**Problem**: All agents (Sarah, Marcus, Luna, Alex) use identical voice characteristics
- Male agents share same pitch/rate settings
- Female agents share same pitch/rate settings
- Only the spoken name changes, not the actual voice personality

**Root Cause**: Basic voice differentiation in `src/services/voiceService.ts` lines 132-139

### Issue 2: Calling System Disconnection 📞
**Problems**:
- No phone number collection UI
- Frontend task creation doesn't integrate with backend calling service
- Timer expiry only creates local notifications, never actual calls
- Rich backend calling infrastructure exists but is unused

## Implementation Plan

## Phase 1: Voice Differentiation Fix (Priority: HIGH)

### 1.1 Enhanced Voice Profiles
**File**: `src/services/voiceService.ts`

**Implementation**:
```typescript
// Create unique voice profiles for each agent
const VOICE_PROFILES = {
  'sarah': {
    pitch: 1.2,
    rate: 0.9,
    volume: 1.0,
    language: 'en-US',
    personality: 'warm and encouraging'
  },
  'marcus': {
    pitch: 0.7,
    rate: 0.85,
    volume: 1.0,
    language: 'en-US',
    personality: 'confident and motivating'
  },
  'luna': {
    pitch: 1.1,
    rate: 0.95,
    volume: 1.0,
    language: 'en-US',
    personality: 'calm and supportive'
  },
  'alex': {
    pitch: 0.9,
    rate: 0.88,
    volume: 1.0,
    language: 'en-US',
    personality: 'energetic and friendly'
  }
};
```

**Changes Required**:
1. Replace generic male/female detection with specific agent profiles
2. Update `previewReactNativeVoice()` method
3. Update `previewBrowserVoice()` method
4. Add voice personality to spoken text

### 1.2 Personalized Preview Text
**Enhancement**: Make each agent speak with their unique personality

**Implementation**:
```typescript
const AGENT_PREVIEW_TEXTS = {
  'sarah': "Hi! I'm Sarah, your warm and caring AI assistant. I'll help you stay on track with gentle reminders and positive encouragement.",
  'marcus': "Hey there! Marcus here - your motivational coach. I'll keep you accountable and push you to achieve your goals!",
  'luna': "Hello, I'm Luna. I bring calm and balance to your productivity journey. Let me help you find your peaceful focus.",
  'alex': "What's up! I'm Alex, your energetic productivity buddy! Ready to tackle those tasks with enthusiasm?"
};
```

## Phase 2: Phone Number Collection UI (Priority: HIGH)

### 2.1 User Profile Enhancement
**Files to Create/Modify**:
- `src/screens/ProfileSetupScreen.tsx` (new)
- `src/screens/SettingsScreen.tsx` (enhance existing)

**Implementation**:
```typescript
// Add phone number field to user profile
interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string; // NEW FIELD
  timezone: string;
  notificationPreferences: object;
}
```

### 2.2 Phone Number Input Component
**File**: `src/components/forms/PhoneNumberInput.tsx` (new)

**Features**:
- International format validation
- Country code support
- Real-time formatting
- Privacy notice about calling feature

### 2.3 Onboarding Flow Update
**File**: `src/screens/OnboardingScreen.tsx`

**Enhancement**: Add phone number collection step
- Explain calling feature benefits
- Optional step with skip option
- Privacy assurance messaging

## Phase 3: Frontend-Backend Integration (Priority: CRITICAL)

### 3.1 Enhanced Task Service
**File**: `src/services/taskService.ts`

**New Method**:
```typescript
static async createTaskWithCalling(taskForm: CreateTaskForm, userPhone?: string): Promise<Task> {
  // 1. Create task locally
  // 2. If phone number available, schedule backend call
  // 3. Fallback to notifications if calling unavailable
  // 4. Handle offline scenarios
}
```

### 3.2 Calling Service Integration
**File**: `src/services/callingService.ts` (new)

**Implementation**:
```typescript
export class CallingService {
  static async scheduleTaskCall(task: Task, userPhone: string): Promise<CallResult> {
    // Call backend API to schedule actual phone call
    // Handle authentication
    // Process response and scheduling
  }
  
  static async checkCallStatus(callId: string): Promise<CallStatus> {
    // Monitor call progress
  }
}
```

### 3.3 Backend API Integration
**File**: `src/services/api.ts`

**New Endpoints**:
```typescript
// Add calling endpoints
export const callingAPI = {
  scheduleCall: (callData: CallScheduleRequest) => api.post('/calls/schedule', callData),
  getCallStatus: (callId: string) => api.get(`/calls/${callId}/status`),
  getCallHistory: (userId: string) => api.get(`/calls/history/${userId}`)
};
```

## Phase 4: Timer System Enhancement (Priority: CRITICAL)

### 4.1 Enhanced Task Execution Engine Integration
**File**: `src/services/taskExecutionService.ts` (new)

**Implementation**:
```typescript
export class TaskExecutionService {
  static async executeScheduledTask(task: Task): Promise<void> {
    const userProfile = await getUserProfile();
    
    if (userProfile.phoneNumber && !task.isSilentMode) {
      // Attempt backend call first
      const callResult = await CallingService.scheduleTaskCall(task, userProfile.phoneNumber);
      
      if (!callResult.success) {
        // Fallback to notification
        await NotificationService.sendTaskReminder(task);
      }
    } else {
      // Silent mode or no phone - use notifications
      await NotificationService.sendTaskReminder(task);
    }
  }
}
```

### 4.2 Background Task Scheduler
**File**: `src/services/backgroundScheduler.ts` (new)

**Features**:
- Monitor task schedules
- Trigger execution at correct times
- Handle app background states
- Retry logic for failed calls

## Phase 5: Call Fallback Flow (Priority: HIGH)

### 5.1 Call Result Handling
**Implementation Flow**:
```
Timer Expires → 
Try Phone Call → 
  Success: AI conversation about task completion →
    Mark complete/incomplete based on response
  Failed/No Answer: Send notification →
    "Did you complete [task]? Tap to update status"
```

### 5.2 Notification Enhancement
**File**: `src/services/notifications.ts`

**New Notification Types**:
```typescript
// Call fallback notification
static async sendCallFallbackNotification(task: Task): Promise<void> {
  const notification = {
    title: "📞 Missed Call Reminder",
    body: `We tried calling about "${task.title}". Did you complete it?`,
    data: {
      type: 'call_fallback',
      taskId: task.id,
      actions: ['completed', 'pending', 'skip']
    }
  };
}
```

## Phase 6: User Experience Enhancements (Priority: MEDIUM)

### 6.1 Call Settings Screen
**File**: `src/screens/CallSettingsScreen.tsx` (new)

**Features**:
- Enable/disable calling feature
- Set calling hours (7 AM - 10 PM)
- Choose call frequency
- Test call functionality

### 6.2 Call History & Analytics
**File**: `src/screens/CallHistoryScreen.tsx` (new)

**Features**:
- View recent calls
- Call success/failure rates
- Task completion via calls
- Cost transparency (free for users)

### 6.3 Enhanced Privacy Settings
**File**: `src/screens/PrivacySettingsScreen.tsx` (new)

**Features**:
- Call recording preferences
- Data retention settings
- Call transcript access

## Implementation Timeline

### Week 1: Voice Fixes (Immediate)
- [ ] Implement unique voice profiles
- [ ] Add personalized preview texts
- [ ] Test voice differentiation
- [ ] Deploy voice improvements

### Week 2: Phone Number Collection
- [ ] Create phone input component
- [ ] Update onboarding flow
- [ ] Enhance settings screen
- [ ] Test user flow

### Week 3: Backend Integration
- [ ] Create calling service wrapper
- [ ] Integrate with task creation
- [ ] Implement call scheduling
- [ ] Test API connectivity

### Week 4: Timer & Execution
- [ ] Build task execution service
- [ ] Implement background scheduler
- [ ] Create call fallback logic
- [ ] End-to-end testing

### Week 5: UX Polish
- [ ] Call settings screen
- [ ] Call history features
- [ ] Privacy enhancements
- [ ] User acceptance testing

## Testing Strategy

### Voice Testing
- [ ] Test each agent voice on iOS/Android
- [ ] Verify personality differences
- [ ] Test preview timer accuracy
- [ ] Audio quality validation

### Calling System Testing
- [ ] Mock backend call scenarios
- [ ] Test phone number validation
- [ ] Timer accuracy verification
- [ ] Offline/online scenarios
- [ ] Call fallback flows

### Integration Testing
- [ ] Full user journey testing
- [ ] Performance monitoring
- [ ] Error handling validation
- [ ] Privacy compliance verification

## Technical Requirements

### Dependencies to Add
```json
{
  "react-native-phone-input": "^1.3.2",
  "libphonenumber-js": "^1.10.44",
  "@react-native-async-storage/async-storage": "^1.19.3"
}
```

### Backend API Endpoints Required
- `POST /api/v1/calls/schedule`
- `GET /api/v1/calls/{id}/status`
- `POST /api/v1/users/profile/phone`
- `GET /api/v1/calls/history`

### Environment Variables
```env
ENABLE_CALLING_FEATURE=true
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_PHONE=+1234567890
```

## Security Considerations

### Phone Number Privacy
- Encrypt phone numbers in storage
- Limit access to calling service only
- Provide easy deletion option
- Clear privacy policy updates

### Call Security
- Secure webhook endpoints
- Validate Twilio signatures
- Rate limiting on call endpoints
- Audit logging for all calls

## Success Metrics

### Voice Quality
- [ ] Each agent has distinct voice characteristics
- [ ] 5-second preview timer works accurately
- [ ] User can clearly differentiate between agents

### Calling System
- [ ] Successful phone call initiation
- [ ] Proper fallback to notifications
- [ ] Task completion tracking via calls
- [ ] User satisfaction with calling feature

### Integration
- [ ] Seamless task creation → call scheduling
- [ ] Timer accuracy within 30 seconds
- [ ] 95%+ uptime for calling service
- [ ] Clear user feedback on all actions

## Risk Mitigation

### Technical Risks
- **Twilio API Failures**: Implement robust fallback to notifications
- **Phone Number Validation**: Use multiple validation libraries
- **Timer Drift**: Implement server-side scheduling verification

### User Experience Risks
- **Privacy Concerns**: Clear opt-in process and easy opt-out
- **Call Quality**: Provide call settings and test options
- **Battery Usage**: Optimize background processing

## Post-Implementation Monitoring

### Metrics to Track
- Voice preview usage rates
- Phone number collection opt-in rates
- Call success/failure rates
- User retention after calling feature
- Support tickets related to calling

### Performance Monitoring
- API response times
- Call connection success rates
- Notification delivery rates
- Background task efficiency

---

## Notes
- All calling features remain **FREE** for users
- Robust fallback ensures core functionality always works
- Privacy-first approach with clear user controls
- Incremental rollout recommended for safe deployment 