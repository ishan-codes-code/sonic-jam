import { ConfirmProvider } from '@/src/context/ConfirmProvider';
import { BottomSheetProvider } from '@/src/hooks/useDrawer';
import { toastConfig } from '@/src/hooks/useToast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { useAuth } from '../src/hooks/useAuth';
import { theme } from '../src/theme';
import TrackPlayer from 'react-native-track-player';
import { PlaybackService, setupPlayer, PlaybackSync, usePlayer } from '@/src/playbackCore';
import { GlobalPlayer } from '@/src/components/features/GlobalPlayer/GlobalPlayer';
import { useVersionCheck } from '../src/hooks/useVersionCheck';
import { useVersionStore } from '../src/store/versionStore';
import { ForceUpdateScreen } from '../src/components/VersionControl/ForceUpdateScreen';
import { OptionalUpdateModal } from '../src/components/VersionControl/OptionalUpdateModal';






TrackPlayer.registerPlaybackService(() => PlaybackService);

// --------------------------------------------------------------------------
// Guard: redirects based on auth state after it is known
// --------------------------------------------------------------------------
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status, checkAuth } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { stop } = usePlayer();

  // Run once on app boot
  useEffect(() => {
    checkAuth();
  }, []);

  // React to auth state changes
  useEffect(() => {
    if (status === 'idle' || status === 'loading') return;

    const isAuthPath = segments[0] === 'login' || segments[0] === 'signup';

    if (status === 'authenticated' && isAuthPath) {
      // Logged in users should be moved to the app
      router.replace('/(tabs)/home');
    } else if (status === 'unauthenticated') {
      // Stop playback on logout
      stop();

      if (!isAuthPath) {
        // Unauthenticated users are only allowed on login/signup
        router.replace('/login');
      }
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

  return (
    <>
      {children}
      {status === 'authenticated' && (
        <>
          <GlobalPlayer />
          <PlaybackSync />
        </>
      )}
    </>
  );
}

// --------------------------------------------------------------------------
// Guard: checks for app version and forces update if necessary
// --------------------------------------------------------------------------
function VersionGuard({ children }: { children: React.ReactNode }) {
  useVersionCheck();
  const isForce = useVersionStore((s) => s.isForce);
  const hasChecked = useVersionStore((s) => s.hasChecked);

  // If force update is required, block everything else
  if (isForce) {
    return <ForceUpdateScreen />;
  }

  // We only show the content after the first version check is done
  // to prevent a flash of old content if a force update is pending.
  if (!hasChecked) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.secondaryAccent} />
      </View>
    );
  }

  return (
    <>
      {children}
      <OptionalUpdateModal />
    </>
  );
}

const queryClient = new QueryClient();


// --------------------------------------------------------------------------
// Root layout
// --------------------------------------------------------------------------

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.backgroundBase,
  },
};

export default function RootLayout() {
  useEffect(() => {
    setupPlayer();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={customDarkTheme}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ConfirmProvider>
            <BottomSheetProvider>
              <VersionGuard>
                <AuthGuard>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: 'fade',
                      animationDuration: 200,
                      contentStyle: { backgroundColor: theme.colors.backgroundBase },
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
                </AuthGuard>
              </VersionGuard>
            </BottomSheetProvider>
          </ConfirmProvider>
          <Toast config={toastConfig} />
        </GestureHandlerRootView>
      </ThemeProvider>
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
