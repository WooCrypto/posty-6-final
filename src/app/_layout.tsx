import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useAppStore } from '@/lib/store';
import { WeatherEffects } from '@/components/WeatherEffects';
import { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { InstallPrompt } from '@/components/InstallPrompt';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Custom light theme for the app
const PostyLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4A90E2',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#1E293B',
    border: '#E2E8F0',
  },
};

function useProtectedRoute() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const isChildMode = useAppStore((s) => s.isChildMode);
  const pendingVerificationEmail = useAppStore((s) => s.pendingVerificationEmail);
  const segments = useSegments();
  const router = useRouter();

  // Get the navigation state to check if navigation is ready
  const navigationState = useRootNavigationState();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Wait for navigation to be ready
  useEffect(() => {
    if (navigationState?.key) {
      // Add a small delay to ensure navigation is fully mounted
      const timeout = setTimeout(() => {
        setIsNavigationReady(true);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [navigationState?.key]);

  useEffect(() => {
    // Don't navigate until the navigation container is ready
    if (!isNavigationReady) {
      return;
    }

    try {
      const segmentsArray = segments as string[];
      const firstSegment = segmentsArray[0];
      const secondSegment = segmentsArray[1];
      const inAuthGroup = firstSegment === 'auth';
      const inSetupGroup = firstSegment === 'setup';
      const inParentGroup = firstSegment === 'parent';
      const inChildGroup = firstSegment === 'child';
      const isIndex = !firstSegment || firstSegment === 'index';
      const isPublicRoute = firstSegment === 'terms' || firstSegment === 'privacy' || firstSegment === 'paywall';
      const isVerifyEmailScreen = inAuthGroup && secondSegment === 'verify-email';

      // Allow public routes without authentication
      if (isPublicRoute) {
        return;
      }

      // If user has pending email verification, redirect to verify-email screen
      // This check is independent of isAuthenticated to handle stale state edge cases
      if (pendingVerificationEmail) {
        if (!isVerifyEmailScreen && !isIndex && !inAuthGroup) {
          router.replace({
            pathname: '/auth/verify-email',
            params: { email: pendingVerificationEmail }
          });
        }
        return;
      }

      // If not authenticated, redirect to welcome
      if (!isAuthenticated) {
        if (!isIndex && !inAuthGroup) {
          router.replace('/');
        }
        return;
      }

      // If authenticated but not onboarded, redirect to setup
      if (!isOnboarded) {
        if (!inSetupGroup) {
          router.replace('/setup/add-child');
        }
        return;
      }

      // If onboarded, redirect based on mode
      if (isChildMode) {
        if (!inChildGroup && firstSegment !== 'passcode') {
          router.replace('/child/(tabs)');
        }
      } else {
        if (!inParentGroup && firstSegment !== 'passcode') {
          router.replace('/parent/(tabs)');
        }
      }
    } catch (error) {
      // Navigation not ready yet, ignore
      console.log('Navigation not ready:', error);
    }
  }, [isAuthenticated, isOnboarded, isChildMode, pendingVerificationEmail, segments, router, isNavigationReady]);
}

function ThemedApp() {
  useEffect(() => {
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    }
  }, []);

  return (
    <ThemeProvider value={PostyLightTheme}>
      <View style={{ flex: 1 }}>
        <InstallPrompt />
        <Stack screenOptions={{ headerShown: false }}>
          {/* Welcome & Auth */}
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="auth/forgot-password" />

          {/* Setup Flow */}
          <Stack.Screen name="setup/add-child" />
          <Stack.Screen name="setup/select-plan" />
          <Stack.Screen name="setup/shipping" />
          <Stack.Screen name="setup/complete" />

          {/* Parent Screens */}
          <Stack.Screen name="parent/(tabs)" />
          <Stack.Screen name="parent/child-detail" />
          <Stack.Screen name="parent/approve-tasks" />
          <Stack.Screen name="parent/change-plan" />
          <Stack.Screen name="parent/edit-shipping" />
          <Stack.Screen name="parent/change-passcode" />
          <Stack.Screen name="parent/add-task" />
          <Stack.Screen name="parent/edit-profile" />

          {/* Child Screens */}
          <Stack.Screen name="child/(tabs)" />

          {/* Modals */}
          <Stack.Screen name="passcode" options={{ presentation: 'modal' }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="terms" options={{ presentation: 'modal' }} />
          <Stack.Screen name="privacy" options={{ presentation: 'modal' }} />
        </Stack>
        <WeatherEffects />
      </View>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  useProtectedRoute();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return <ThemedApp />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style="dark" />
          <RootLayoutNav />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
