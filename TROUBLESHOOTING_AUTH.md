# 🔧 Authentication Troubleshooting Guide

## 🚨 **CRITICAL FIX: "Missing OAuth Secret" Error**

### **Issue:** `validation_failed` - `Unsupported provider - missing OAuth secret`

**Root Cause:** Android OAuth clients don't have client secrets, but Supabase requires them.

### **✅ Solution: Create Web Application OAuth Client**

**Step 1: Google Cloud Console**
1. Go to **APIs & Services** → **Credentials**
2. Create **OAuth 2.0 Client ID**
3. Select **Web application** (NOT Android!)
4. Name: "Callivate Web Client for Supabase"
5. **Authorized redirect URIs:**
   ```
   https://jrfdbapxsjcauloijbxl.supabase.co/auth/v1/callback
   ```
6. **Copy both Client ID and Client Secret** (visible for web clients)

**Step 2: Supabase Configuration**
1. Go to **Authentication** → **Providers** → **Google**
2. **Enable** the provider
3. Use **Web Client** credentials:
   - Client ID: From web client
   - Client Secret: From web client
4. Save configuration

**Important:** Keep your Android client for future use, but use the Web client for Supabase!

---

## 🚨 Common Issue: "Authentication was cancelled or failed"

### **Root Cause Analysis**
The error occurs due to several potential issues in the mobile OAuth flow:

1. **Missing Google OAuth Configuration in Supabase**
2. **Incorrect Redirect URLs for mobile apps**
3. **Wrong OAuth implementation for React Native**
4. **Supabase provider not properly configured**

---

## ✅ **Improved Solution Implemented**

### **New Multi-Layered Authentication Approach:**

#### **Layer 1: Enhanced Supabase OAuth**
- Proper mobile redirect URL handling
- Better error handling and logging
- Support for both development and production environments

#### **Layer 2: Direct Google OAuth (Future)**
- Fallback method using expo-auth-session directly
- PKCE flow for enhanced security
- Currently configured as placeholder for future implementation

#### **Layer 3: Web Browser Fallback**
- Original implementation as final fallback
- Maintains backward compatibility
- Works as last resort if other methods fail

---

## 🔧 **Required Supabase Configuration**

### **1. Google OAuth Provider Setup**

In your Supabase dashboard:

1. Go to **Authentication** > **Providers**
2. Enable **Google** provider
3. Configure Google OAuth credentials:

```
Client ID: [Your Google OAuth Client ID]
Client Secret: [Your Google OAuth Client Secret]
```

### **2. Redirect URLs Configuration**

Add these redirect URLs in Supabase:

**For Development (Expo Go):**
```
exp://192.168.1.XXX:8081/--/auth
exp://localhost:8081/--/auth
```

**For Production:**
```
callivate://auth
io.supabase.jrfdbapxsjcauloijbxl://login-callback/
```

### **3. Google Cloud Console Setup**

1. Create **Android** OAuth 2.0 Client:
   - Package name: `com.callivate.app` (or `host.exp.exponent` for Expo Go)
   - SHA-1: Get from `expo credentials:manager`

2. Create **iOS** OAuth 2.0 Client:
   - Bundle ID: `com.callivate.app` (or `host.exp.Exponent` for Expo Go)

3. **Add these redirect URIs in Google Console:**
   ```
   https://jrfdbapxsjcauloijbxl.supabase.co/auth/v1/callback
   ```

---

## 📱 **How the New Implementation Works**

### **Method 1: Enhanced Supabase OAuth**
```typescript
// Attempts proper mobile OAuth with Supabase
// Uses dynamic redirect URL based on environment
// Handles both development and production scenarios
```

### **Method 2: Direct Google OAuth (Placeholder)**
```typescript
// Future implementation for direct Google OAuth
// Would bypass Supabase for OAuth flow
// Currently returns failure to proceed to next method
```

### **Method 3: Original Fallback**
```typescript
// Original implementation as final fallback
// Maintains backward compatibility
// Ensures something works even if new methods fail
```

---

## 🔍 **Debugging Steps**

### **1. Check Console Logs**
The new implementation provides detailed logging:
```
🚀 Starting Google OAuth flow...
📍 Using redirect URL: [URL]
⚠️ Supabase OAuth error: [Error details]
🔄 Trying original implementation as final fallback...
```

### **2. Verify Environment Variables**
```bash
# Check if .env file exists and has correct values
cat .env

# Should show:
EXPO_PUBLIC_SUPABASE_URL=https://jrfdbapxsjcauloijbxl.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **3. Test Redirect URLs**
```javascript
// In development, this should show your Expo development URL
import * as Linking from 'expo-linking';
console.log('Development URL:', Linking.createURL('auth'));
```

---

## 🚀 **Testing the Fix**

### **1. Clear App Data**
```bash
# Clear Expo cache
expo r -c

# Or clear app data on device
```

### **2. Test Authentication Flow**
1. Launch app
2. Go through onboarding
3. Tap "Continue with Google"
4. Check console logs for detailed error information
5. Should see the multi-layered fallback attempts

### **3. Expected Behavior**
- **Success**: User signed in and navigated to main app
- **Partial Success**: Detailed error logs showing which methods were attempted
- **Failure**: Clear error message indicating what went wrong

---

## ⚡ **Quick Fixes**

### **If Still Getting "Missing OAuth Secret":**
1. Double-check Google OAuth credentials in Supabase
2. Ensure Google Cloud Console project has correct redirect URIs
3. Verify the OAuth client type (should be Android/iOS, not Web)

### **If Getting "Invalid Redirect URI":**
1. Check if redirect URLs match between app.json scheme and Supabase config
2. For development, ensure your local IP is correct in redirect URLs
3. Try both `exp://` and `callivate://` schemes

### **If Authentication Still Fails:**
1. Check if Google OAuth provider is enabled in Supabase
2. Verify Google Cloud Console API is enabled
3. Ensure app.json has correct URL scheme configuration

---

## 📋 **Checklist for Working Authentication**

- [ ] Google OAuth provider enabled in Supabase
- [ ] Google Client ID and Secret added to Supabase
- [ ] Correct redirect URLs in Supabase settings
- [ ] Google Cloud Console OAuth clients configured
- [ ] Correct redirect URIs in Google Console
- [ ] Environment variables set correctly
- [ ] App.json has proper URL scheme
- [ ] App cleared and restarted after changes

---

## 🆘 **Still Having Issues?**

1. **Check Supabase logs** in dashboard for detailed error information
2. **Verify Google Console** OAuth consent screen is configured
3. **Test with a simple web OAuth** to ensure Supabase config is correct
4. **Use Expo development build** instead of Expo Go for more control
5. **Enable debug mode** in the authentication service for verbose logging

The new implementation provides multiple fallback methods and detailed logging to help identify and resolve authentication issues quickly. 