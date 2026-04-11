import { ConfirmProvider } from '@/src/context/ConfirmProvider';
import { BottomSheetProvider } from '@/src/hooks/useDrawer';
import { toastConfig } from '@/src/hooks/useToast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { useAuth } from '../src/hooks/useAuth';
import { theme } from '../src/theme';
import TrackPlayer from 'react-native-track-player';
import { PlaybackService, setupPlayer, PlaybackSync } from '@/src/playbackCore';
import { GlobalPlayer } from '@/src/components/features/GlobalPlayer/GlobalPlayer';






TrackPlayer.registerPlaybackService(() => PlaybackService);

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
    const isAuthPath = segments[0] === 'login' || segments[0] === 'signup';

    if (status === 'authenticated' && isAuthPath) {
      // Logged in folk shouldn't be at login/signup 
      router.replace('/(tabs)/home');
    } else if (status === 'unauthenticated' && inAuthGroup) {
      // Not logged in folk shouldn't be in tabs
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
  useEffect(() => {
    setupPlayer();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ConfirmProvider>
          <BottomSheetProvider>
            <AuthGuard>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  animationDuration: 200,
                }}
              >
                <Stack.Screen name="(tabs)" />

                <Stack.Screen
                  name="player"
                  options={{
                    presentation: 'fullScreenModal',
                    animation: 'slide_from_bottom',
                    gestureEnabled: false,
                    headerShown: false,
                    contentStyle: { backgroundColor: 'transparent' }
                  }}
                />
              </Stack>
              <GlobalPlayer />
              <PlaybackSync />
            </AuthGuard>
          </BottomSheetProvider>
        </ConfirmProvider>
        <Toast config={toastConfig} />
      </GestureHandlerRootView>
    </QueryClientProvider>
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
