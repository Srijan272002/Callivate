import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import types
import { RootStackParamList, MainTabParamList } from '../types';

// Import screens
import {
  SplashScreen,
  OnboardingScreen,
  LoginScreen,
  ToDoListScreen,
  CalendarScreen,
  AnalyticsScreen,
  NotesScreen,
  SettingsScreen,
  CreateTaskScreen,
  PrivacyPolicyScreen,
  TermsOfServiceScreen,
} from '../screens';

// Import hooks and components
import { useAuth } from '../hooks';
import { useTheme } from '../hooks/useTheme';
import { ProtectedRoute } from '../components';
import { Text as ThemedText } from '../components/ui';

const RootStack = createStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const getIconName = (routeName: string, focused: boolean) => {
    switch (routeName) {
      case 'ToDoList':
        return focused ? 'list' : 'list-outline';
      case 'Calendar':
        return focused ? 'calendar' : 'calendar-outline';
      case 'CreateTask':
        return focused ? 'add-circle' : 'add-circle-outline';
      case 'Notes':
        return focused ? 'document-text' : 'document-text-outline';
      case 'Settings':
        return focused ? 'settings' : 'settings-outline';
      default:
        return 'ellipse';
    }
  };

  return (
    <View 
      style={[
        styles.tabBarContainer, 
        { 
          paddingBottom: insets.bottom,
          backgroundColor: theme.colors.surface,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }
      ]}
    >
      <View style={styles.tabButtonsContainer}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel !== undefined 
              ? options.tabBarLabel 
              : options.title !== undefined 
              ? options.title 
              : route.name;

            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                style={[
                  styles.tabButton,
                  isFocused && styles.tabButtonActive,
                  isFocused && {
                    backgroundColor: isDark 
                      ? 'rgba(56, 189, 248, 0.2)' 
                      : 'rgba(14, 165, 233, 0.1)',
                  }
                ]}
              >
                <Ionicons
                  name={getIconName(route.name, isFocused) as any}
                  size={24}
                  color={isFocused ? theme.colors.primary : theme.colors.textSecondary}
                />
                <ThemedText
                  variant="caption"
                  weight="semibold"
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused ? theme.colors.primary : theme.colors.textSecondary,
                    }
                  ]}
                >
                  {label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
      </View>
    </View>
  );
};

const MainTabNavigator = () => {
  return (
    <MainTab.Navigator
      initialRouteName="ToDoList"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <MainTab.Screen name="ToDoList" component={ToDoListScreen} />
      <MainTab.Screen name="Calendar" component={CalendarScreen} />
      <MainTab.Screen name="CreateTask" component={CreateTaskScreen} />
      <MainTab.Screen name="Notes" component={NotesScreen} />
      <MainTab.Screen name="Settings" component={SettingsScreen} />
    </MainTab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: theme.colors.background },
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
            <RootStack.Screen 
              name="PrivacyPolicy" 
              component={PrivacyPolicyScreen}
              options={{
                presentation: 'card',
                headerShown: false,
              }}
            />
            <RootStack.Screen 
              name="TermsOfService" 
              component={TermsOfServiceScreen}
              options={{
                presentation: 'card',
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

// Tab Bar styles
const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 85,
    borderTopWidth: 1,
    // Clean shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  tabButtonsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    minHeight: 60,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    // Active state styling
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default AppNavigator; 