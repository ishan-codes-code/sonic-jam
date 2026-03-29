import { FlashMessageProvider } from '@/src/hooks/useFlashMessage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GlobalPlayer } from '../src/components/features/GlobalPlayer';
import { useAuth } from '../src/hooks/useAuth';
import { theme } from '../src/theme';

// --------------------------------------------------------------------------
// Guard: redirects based on auth state after it is known
// --------------------------------------------------------------------------
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status, checkAuth } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Run once on app boot
  useEffect(() => {
    checkAuth();
  }, []);

  // React to auth state changes
  useEffect(() => {
    if (status === 'idle' || status === 'loading') return;

    const inAuthGroup = segments[0] === '(tabs)';
    const isPlayer = segments[0] === 'player';
    const isAuthPath = segments[0] === 'login' || segments[0] === 'signup';

    if (status === 'authenticated' && isAuthPath) {
      // Logged in folk shouldn't be at login/signup 
      router.replace('/(tabs)');
    } else if (status === 'unauthenticated' && (inAuthGroup || isPlayer)) {
      // Not logged in folk shouldn't be in tabs or player
      router.replace('/login');
    }
  }, [status, segments]);

  // Show a full-screen loader during the initial auth check
  if (status === 'idle' || status === 'loading') {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.secondaryAccent} />
      </View>
    );
  }

  return <>{children}</>;
}

const queryClient = new QueryClient();

// --------------------------------------------------------------------------
// Root layout
// --------------------------------------------------------------------------
export default function RootLayout() {
  return (
    <FlashMessageProvider>
      <QueryClientProvider client={queryClient}>
        <AuthGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              animationDuration: 200,
            }}
          >
            {/* Tabs group */}
            <Stack.Screen name="(tabs)" />

            <Stack.Screen
              name="addSection"
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.8, 0.9],
                animation: 'slide_from_bottom',
                gestureEnabled: true,
                sheetGrabberVisible: true,
                contentStyle: { backgroundColor: 'transparent' }
              }}
            />


            {/* Player screen (custom config) */}
            <Stack.Screen
              name="player"
              options={{
                presentation: 'formSheet', // 🔥 key part
                animation: 'slide_from_bottom', // nice for player UI
                gestureEnabled: true,
                // sheetGrabberVisible: true
              }}
            />
          </Stack>
          <GlobalPlayer />
        </AuthGuard>
      </QueryClientProvider>
    </FlashMessageProvider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
