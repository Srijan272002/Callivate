import React, { useEffect, useState } from 'react';
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { 
  GowunDodum_400Regular,
} from '@expo-google-fonts/gowun-dodum';
import { AuthProvider } from './src/hooks/useAuth';
import AppNavigator from './src/navigation/AppNavigator';
import './src/styles/globalStyles'; // Apply global font styles
import { NotificationService, OfflineService, TaskService } from './src/services';

// Prevent the splash screen from auto-hiding before App component declaration
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontLoaded, setFontLoaded] = useState(false);

  useEffect(() => {
    async function initializeApp() {
      try {
        // Load fonts
        await Font.loadAsync({
          'GowunDodum': GowunDodum_400Regular,
        });
        
        // Initialize services
        console.log('🚀 Initializing Callivate services...');
        
        // Initialize notification service
        await NotificationService.initialize();
        
        // Initialize offline service (includes network monitoring)
        await OfflineService.initialize();
        
        // Initialize task service (depends on notification & offline services)
        await TaskService.initialize();
        
        console.log('✅ All services initialized successfully');
        
        setFontLoaded(true);
      } catch (error) {
        console.warn('App initialization error:', error);
        setFontLoaded(true); // Continue even if some services fail to load
      } finally {
        // Hide the native splash screen after everything is loaded
        await SplashScreen.hideAsync();
      }
    }

    initializeApp();
    
    // Handle deep links for OAuth callbacks
    const handleDeepLink = (event: { url: string }) => {
      console.log('🔗 Deep link received:', event.url);
      // The auth service will handle the callback automatically
    };

    // Listen for incoming deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle initial URL if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 Initial URL:', url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  if (!fontLoaded) {
    return null; // Show nothing while fonts are loading
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
