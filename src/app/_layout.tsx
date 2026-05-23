import { BottomSheetProvider } from '@/features/drawer';
import { ToastProvider } from '@/features/Toast/components/ToastProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import { ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '@/features/auth';
import TrackPlayer from '@rntp/player';
import { PlaybackService, setupPlayer, PlaybackSync, usePlayer } from '@/features/playback';
import { useVersionCheck } from '@/features/app-validations/hooks/useVersionCheck';

import { PortalHost } from "@rn-primitives/portal";

import "../global.css"
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import { NAV_THEME } from '@/lib/theme';
import MiniplayerScreen from '@/features/miniplayer/screens/MiniplayerScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useVersionStore } from '@/features/app-validations/store/versionStore';
import { MaintenanceScreen } from '@/features/app-validations/screens/MaintenanceScreen';
import { UpdateScreen } from '@/features/app-validations/screens/UpdateScreen';
import { OTAUpdateScreen } from '@/features/app-validations/screens/OTAUpdateScreen';





SplashScreen.preventAutoHideAsync();

TrackPlayer.registerBackgroundEventHandler(() => PlaybackService);

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

    const isAuthPath = segments[0] === '(auth)';

    if (status === 'authenticated' && isAuthPath) {
      // Logged in users should be moved to the app
      router.replace('/home');
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
        <ActivityIndicator size="large" color={"#FFD54F"} />
      </View>
    );
  }

  return (
    <>
      {children}
      {status === 'authenticated' && (
        <>
          <MiniplayerScreen />
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

  const isMaintenance = useVersionStore(s => s.isMaintenance);
  const isForce = useVersionStore((s) => s.isForce);
  const isOptional = useVersionStore((s) => s.isOptional);
  const isOtaForce = useVersionStore(s => s.isOtaForce);
  const isOtaOptional = useVersionStore(s => s.isOtaOptional);
  const hasDismissedOptional = useVersionStore(s => s.hasDismissedOptional);
  const dismissOptional = useVersionStore(s => s.dismissOptional);
  const isOtaUpdating = useVersionStore(s => s.isOtaUpdating);
  const hasChecked = useVersionStore((s) => s.hasChecked);

  // Priority 1: Maintenance
  if (isMaintenance) {
    return <MaintenanceScreen />;
  }

  // Priority 2: Native force update
  if (isForce) {
    return <UpdateScreen isOptional={false} />;
  }

  // Priority 3: OTA force update (foreground download directly)
  if (isOtaForce) {
    return <OTAUpdateScreen />;
  }

  // Priority 4: OTA updating in progress (user clicked update on optional OTA prompt)
  if (isOtaUpdating) {
    return <OTAUpdateScreen />;
  }


  // We only show the content after the first version check is done
  // to prevent a flash of old content if a force update is pending.
  if (!hasChecked) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={"#FFD54F"} />
      </View>
    );
  }

  // Priority 5: Native optional update
  if (isOptional && !hasDismissedOptional) {
    return (
      <UpdateScreen
        isOptional={true}
        onSkip={dismissOptional}
        onLater={dismissOptional}
      />
    );
  }

  // Priority 6: OTA optional update (show UpdateScreen with isOta prop, user can skip or update)
  if (isOtaOptional && !hasDismissedOptional) {
    return (
      <UpdateScreen
        isOptional={true}
        isOta={true}
        onSkip={dismissOptional}
        onLater={dismissOptional}
      />
    );
  }

  return (
    <>
      {children}
    </>
  );
}

const queryClient = new QueryClient();

// --------------------------------------------------------------------------
// Root layout
// --------------------------------------------------------------------------
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    'Satoshi_500Medium': require('../../assets/fonts/Satoshi-Medium.otf'),
    'Satoshi_700Bold': require('../../assets/fonts/Satoshi-Bold.otf'),
    'ClashDisplay_700Bold': require('../../assets/fonts/ClashDisplay-Bold.otf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    setupPlayer();
  }, []);

  // useEffect(() => {
  //   if (Platform.OS === 'android') {
  //     NavigationBar.setBackgroundColorAsync('#121212');
  //     NavigationBar.setButtonStyleAsync('light'); // makes the nav buttons white/light
  //   }
  // }, []);

  // Force dark mode for the entire app regardless of OS theme.
  // Use Nativewind's API so it works on native and web.
  useEffect(() => {
    try {
      nativewindColorScheme.set('dark');
    } catch (e) {
      // noop if unavailable
    }
  }, []);

  const colorScheme = 'dark';
  const navTheme = NAV_THEME['dark'];

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navTheme}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <ToastProvider>
              <BottomSheetProvider>
                <VersionGuard>
                  <AuthGuard>
                    <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        animation: 'fade',
                        animationDuration: 200,
                        contentStyle: { backgroundColor: navTheme.colors.background },
                      }}
                    >
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="(auth)" />

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

              <PortalHost />

            </ToastProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: 'center',
    alignItems: 'center',
  },
});
