import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import types
import { RootStackParamList, MainTabParamList } from '../types';

// Import screens
import {
  SplashScreen,
  OnboardingScreen,
  LoginScreen,
  DashboardScreen,
  CalendarScreen,
  AnalyticsScreen,
  NotesScreen,
  SettingsScreen,
  CreateTaskScreen,
} from '../screens';

// Import hooks and components
import { useAuth } from '../hooks';
import { ProtectedRoute } from '../components';
import { colors } from '../styles/theme';

const RootStack = createStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  return (
    <MainTab.Navigator
      initialRouteName="CreateTask"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Calendar':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'CreateTask':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'Notes':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: colors.gray[200],
          paddingTop: 12,
          paddingBottom: 24,
          height: 85,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          marginBottom: 4,
        },
        headerShown: false,
      })}
    >
      <MainTab.Screen name="Dashboard" component={DashboardScreen} />
      <MainTab.Screen name="Calendar" component={CalendarScreen} />
      <MainTab.Screen name="CreateTask" component={CreateTaskScreen} />
      <MainTab.Screen name="Notes" component={NotesScreen} />
      <MainTab.Screen name="Settings" component={SettingsScreen} />
    </MainTab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#ffffff' },
        }}
      >
        {loading ? (
          // Show splash screen while checking authentication
          <RootStack.Screen name="Splash" component={SplashScreen} />
        ) : isAuthenticated ? (
          // User is authenticated, show main app with modal screens
          <>
            <RootStack.Screen name="Main">
              {() => (
                <ProtectedRoute>
                  <MainTabNavigator />
                </ProtectedRoute>
              )}
            </RootStack.Screen>
            <RootStack.Screen 
              name="Analytics" 
              component={AnalyticsScreen}
              options={{
                presentation: 'card',
                headerShown: false,
              }}
            />
            <RootStack.Screen 
              name="EditTask" 
              component={CreateTaskScreen}
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
          </>
        ) : (
          // User is not authenticated, show auth flow
          <>
            <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
            <RootStack.Screen name="Login" component={LoginScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 