# 🔐 Phase 2 Setup Guide - Authentication & User Management

## ✅ What's Been Implemented

### 2.1 Supabase Integration
- ✅ Supabase client configuration (`src/services/supabase.ts`)
- ✅ Environment variable setup (`.env.example`)
- ✅ OAuth redirect URL configuration
- ✅ Authentication service (`src/services/auth.ts`)

### 2.2 Authentication Screens
- ✅ **Splash Screen** - Animated logo with loading states and auto-navigation
- ✅ **Onboarding Carousel** - 4 slides showcasing app features with smooth navigation
- ✅ **Login Screen** - Google OAuth integration with error handling and loading states
- ✅ **Protected Route** - Wrapper component for authenticated routes

### 2.3 User State Management
- ✅ Authentication context (`src/hooks/useAuth.tsx`)
- ✅ User session persistence with secure storage
- ✅ Auto-login for returning users
- ✅ Comprehensive error handling
- ✅ Loading states throughout auth flow

## 🚀 Setup Instructions

### 1. Environment Configuration

1. Copy the environment example:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 2. Supabase Project Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **Authentication** > **Providers** and enable Google OAuth
3. Configure your OAuth redirect URLs for mobile:
   - Add: `io.supabase.{your-project-ref}://login-callback/`
   - For Expo dev: `exp://192.168.1.XXX:8081` (your dev machine IP)
4. Copy your project URL and anon key from **Settings** > **API**

### 3. Google OAuth Setup for Mobile Apps

#### For Android:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable **Google Sign-In API** (not Google+ API)
4. Go to **Credentials** and create **OAuth 2.0 Client ID**
5. Select **Android** as application type
6. Configure Android client:
   ```
   Package name: host.exp.exponent (for Expo Go)
   SHA-1 certificate fingerprint: See instructions below
   ```

**Getting SHA-1 for Expo Development:**
```bash
# For Expo development build
expo credentials:manager -p android
# Select "Keystore" > "View all" to get SHA-1

# For Expo Go (development)
# Use this SHA-1: 25:E7:81:84:73:96:4C:D9:48:F6:3A:95:1D:27:B5:1A:7E:95:8F:50
```

#### For iOS:

1. In the same Google Cloud Console project
2. Create another **OAuth 2.0 Client ID**
3. Select **iOS** as application type
4. Configure iOS client:
   ```
   Bundle ID: host.exp.Exponent (for Expo Go)
   App Store ID: (leave empty for development)
   ```

#### Configure Supabase with Google Credentials:

1. In your Supabase dashboard, go to **Authentication** > **Providers** > **Google**
2. Add both client IDs:
   - **Client ID (for web server)**: Your Android OAuth client ID
   - **Client Secret**: Your Android OAuth client secret
3. **Authorized redirect URLs**: `https://jrfdbapxsjcauloijbxl.supabase.co/auth/v1/callback`

### 4. App Configuration

Add to your `app.json`:
```json
{
  "expo": {
    "scheme": "callivate",
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

### 5. Running the App

```bash
# Install dependencies (already done)
npm install

# Start the development server
npm start

# Run on specific platform
npm run ios
npm run android
```

## 📱 Authentication Flow

1. **App Launch** → Splash Screen (checks authentication)
2. **New User** → Onboarding Carousel → Login Screen
3. **Returning User** → Automatic login → Main App
4. **Google Sign-in** → Mobile OAuth flow → Session stored → Main App

## 🔧 Key Features

### Smart Navigation
- Authentication state automatically determines which screens to show
- Smooth transitions between auth states
- Loading states prevent flickering

### Secure Session Management
- User data stored securely with Expo SecureStore
- Automatic session refresh
- Proper cleanup on logout

### Error Handling
- Comprehensive error messages for failed authentication
- Network error handling
- Graceful fallbacks for edge cases

### User Experience
- Beautiful onboarding with smooth animations
- Loading indicators for all async operations
- Intuitive navigation flow

## 🎯 Next Steps (Phase 3)

- Dashboard implementation
- Task creation and management
- Calendar integration
- Settings screen with logout functionality

## 📋 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJ0eXAiOiJKV1QiLCJhbGc...` |

## 🔍 Testing Authentication

1. **Test New User Flow**:
   - Clear app data
   - Launch app → Should see Onboarding
   - Complete onboarding → Should see Login
   - Sign in with Google → Should reach Main app

2. **Test Returning User**:
   - After signing in once
   - Close and reopen app → Should auto-login to Main app

3. **Test Error Scenarios**:
   - Try signing in without internet
   - Cancel Google OAuth flow
   - Check error messages display correctly

## 🚨 Common Mobile OAuth Issues

### Android Issues:
- **Wrong SHA-1**: Make sure you're using the correct SHA-1 for your keystore
- **Package name mismatch**: Ensure package name matches your app
- **Google Services**: Download `google-services.json` and place in project root

### iOS Issues:
- **Bundle ID mismatch**: Ensure bundle ID matches your app
- **URL Schemes**: Make sure URL scheme is properly configured
- **GoogleService-Info.plist**: Download and place in project root

### Expo-Specific:
- **Development**: Use Expo Go package names during development
- **Production**: Update package names when building standalone apps
- **Redirect URLs**: Different for development vs production

---

✅ **Phase 2 Complete!** The mobile authentication system is fully implemented and ready for use. 