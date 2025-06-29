# Dark Mode Fix Guide

## Issues Identified

The dark mode implementation in the Callivate app has several critical issues that prevent it from working properly across all screens:

### 1. **Static Color Imports**
Most screens import `colors` directly from `theme.ts`, which provides static color values that don't change with theme switching:
```typescript
// ❌ Problematic - Static colors
import { colors } from '../styles/theme';
```

### 2. **StyleSheet.create() with Hardcoded Colors**
All screens use `StyleSheet.create()` with static color references that don't respond to theme changes:
```typescript
// ❌ Problematic - Static styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray[50], // This never changes
  }
});
```

### 3. **Navigation Theme Not Dynamic**
The tab navigator uses static colors and doesn't respond to theme changes.

### 4. **StatusBar Configuration Issues**
Some screens have hardcoded StatusBar styles that override the app-level theme-aware configuration.

## Solution Pattern

### 1. **Convert to Dynamic Theme Usage**

Replace static color imports with the `useTheme()` hook:

```typescript
// ✅ Correct approach
import { useTheme } from '../hooks/useTheme';
import { fontSize, spacing, borderRadius } from '../styles/theme'; // Keep non-color constants

export const ScreenComponent: React.FC = () => {
  const { theme, isDark } = useTheme();
  
  // Create dynamic styles based on current theme
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello World</Text>
      <Ionicons name="home" size={24} color={theme.colors.primary} />
    </View>
  );
};

// Dynamic styles function that accepts theme
const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  text: {
    color: theme.colors.text,
    fontSize: fontSize.base,
  },
});
```

### 2. **Navigation Theme Fix**

Update navigation components to use dynamic theming:

```typescript
const MainTabNavigator = () => {
  const { theme, isDark } = useTheme();
  
  return (
    <MainTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: isDark ? theme.colors.textSecondary + '20' : theme.colors.textSecondary + '10',
        },
      }}
    >
      {/* screens */}
    </MainTab.Navigator>
  );
};
```

### 3. **StatusBar Theme Integration**

Ensure StatusBar adapts to theme changes:

```typescript
// In App.tsx
const AppContent: React.FC = () => {
  const { isDark } = useTheme();
  
  return (
    <>
      <AppNavigator />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
};
```

## Files That Need Updates

### High Priority (Core Navigation & Main Screens)
- ✅ `src/navigation/AppNavigator.tsx` - **FIXED**
- ✅ `App.tsx` - **FIXED** 
- ✅ `src/screens/DashboardScreen.tsx` - **FIXED**
- ✅ `src/screens/AnalyticsScreen.tsx` - **FIXED**

### Medium Priority (Remaining Screens)
- `src/screens/CreateTaskScreen.tsx` - Needs conversion to dynamic theming
- `src/screens/CalendarScreen.tsx` - Needs conversion to dynamic theming
- `src/screens/NotesScreen.tsx` - Needs conversion to dynamic theming
- `src/screens/SettingsScreen.tsx` - Partially converted, needs completion
- `src/screens/LoginScreen.tsx` - Needs conversion to dynamic theming
- `src/screens/SplashScreen.tsx` - Needs StatusBar fix
- `src/screens/OnboardingScreen.tsx` - Needs conversion to dynamic theming
- `src/screens/NotificationPermissionScreen.tsx` - Needs conversion to dynamic theming

### Low Priority (Components)
- `src/components/ProtectedRoute.tsx` - Minor color import cleanup

## Implementation Steps

### Step 1: Update Remaining Screens
For each screen that imports `colors` from theme.ts:

1. Remove the static color import
2. Add `useTheme()` hook usage
3. Convert StyleSheet.create to a dynamic function
4. Update all hardcoded color references to use `theme.colors.*`
5. Replace any direct color values with theme-aware alternatives

### Step 2: Fix Component-Level Issues
Update any remaining components that use static colors.

### Step 3: Test Theme Switching
Verify that:
- Theme toggle works correctly
- All screens adapt to dark/light mode
- Navigation adapts properly
- StatusBar changes appropriately
- Colors are consistent across the app

## Best Practices for Theme Implementation

### ✅ Do's
- Always use `theme.colors.*` for dynamic colors
- Create styles dynamically with `React.useMemo()`
- Use `isDark` flag for conditional styling when needed
- Keep non-color constants (spacing, fontSize) in static imports
- Use semantic color names (text, textSecondary, background, surface)

### ❌ Don'ts
- Don't import static `colors` from theme.ts in screen components
- Don't use hardcoded color values in styles
- Don't create styles with StyleSheet.create at module level
- Don't forget to update icon colors and border colors
- Don't ignore StatusBar configuration

## Example Before/After

### Before (Problematic)
```typescript
import { colors, fontSize, spacing } from '../styles/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray[50],
  },
  text: {
    color: colors.gray[900],
  },
});

export const Screen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Hello</Text>
    <Ionicons name="home" color={colors.primary[500]} />
  </View>
);
```

### After (Fixed)
```typescript
import { fontSize, spacing } from '../styles/theme';
import { useTheme } from '../hooks/useTheme';

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
  },
  text: {
    color: theme.colors.text,
  },
});

export const Screen = () => {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello</Text>
      <Ionicons name="home" color={theme.colors.primary} />
    </View>
  );
};
```

## Theme Colors Available

The theme provides these semantic colors that automatically adapt:

```typescript
theme.colors = {
  primary: string,      // Main brand color
  secondary: string,    // Secondary accent
  background: string,   // Main background
  surface: string,      // Card/component backgrounds
  text: string,         // Primary text
  textSecondary: string,// Secondary text
  success: string,      // Success states
  warning: string,      // Warning states
  danger: string,       // Error states
}
```

## Testing

After implementing these changes:

1. Toggle between light and dark modes
2. Navigate through all screens
3. Verify colors change appropriately
4. Check that icons, borders, and shadows adapt
5. Ensure StatusBar style matches theme
6. Test on both iOS and Android

The core navigation and main screens have been converted successfully. Apply the same pattern to the remaining screens to complete the dark mode implementation. 