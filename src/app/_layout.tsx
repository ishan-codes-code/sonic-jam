import { BottomSheetProvider } from '@/features/drawer';
import { ToastProvider } from '@/features/Toast/components/ToastProvider';
import { toastImperative } from '@/features/Toast/utils/toastSingleton';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import { ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '@/features/auth';
import TrackPlayer from '@rntp/player';
import { PlaybackService, setupPlayer, PlaybackSync, usePlayer } from '@/features/playback';
import {
  authGuardAction,
  checkServerConnection,
  serverGuardAction,
  shouldInitAuth,
  useServerStore,
} from '@/features/server';
import type {
  ServerGuardMemory,
  SetupNavAction,
} from '@/features/server';
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
// Guard: resolves the runtime server before anything backend-dependent runs.
//
// The Stack below stays mounted across every server/auth transition: this
// guard (and AuthGuard) overlay a loader instead of replacing the navigator,
// and route through registered routes. Dispatching navigation while the
// navigator is unmounted drops the action with an "unhandled action"
// warning — the first-launch race that stranded users on Login instead of
// the Setup Wizard — so guards must never remove the navigator their
// redirects depend on.
// --------------------------------------------------------------------------
function ServerGuard({ children }: { children: React.ReactNode }) {
  const status = useServerStore((s) => s.status);
  const serverUrl = useServerStore((s) => s.serverUrl);
  const setupPending = useServerStore((s) => s.setupPending);
  const setupRequestId = useServerStore((s) => s.setupRequestId);
  const loadServer = useServerStore((s) => s.loadServer);
  const router = useRouter();
  const segments = useSegments();

  // Run once on app boot — reads the persisted server (or migrates it)
  useEffect(() => {
    loadServer();
  }, [loadServer]);

  // The native player bakes the progress-sync URL at setup, so it must run
  // only after the server is known (replaces the unconditional boot call).
  useEffect(() => {
    if (status === 'configured') {
      setupPlayer();
    }
  }, [status]);

  // Background setup discovery for a saved server: one non-blocking /health
  // check per URL (never re-arms, so backing out of the wizard can never
  // loop). A valid setupRequired response arms the wizard commit below —
  // even for a signed-in session, which the wizard keeps and re-validates.
  // Offline servers and failed checks keep current behaviour (silence).
  const bootCheckedRef = useRef<Set<string>>(new Set());
  const [bootSetupUrl, setBootSetupUrl] = useState<string | null>(null);
  useEffect(() => {
    if (status !== 'configured' || !serverUrl || setupPending) {
      return;
    }
    if (bootCheckedRef.current.has(serverUrl)) {
      return;
    }
    bootCheckedRef.current.add(serverUrl);
    void (async () => {
      let result: Awaited<ReturnType<typeof checkServerConnection>>;
      try {
        result = await checkServerConnection(serverUrl);
      } catch {
        return;
      }
      // Stale result (server changed or a setup flow started meanwhile):
      // ignore — it must never arm the wizard for the wrong server.
      const live = useServerStore.getState();
      if (live.serverUrl !== serverUrl || live.setupPending) {
        return;
      }
      if (result.ok) {
        if (result.setupRequired) {
          setBootSetupUrl(serverUrl);
        }
      } else if (result.code === 'db-unconfigured') {
        toastImperative.show({
          type: 'info',
          text1: result.message,
          visibilityTime: 6000,
        });
      }
    })();
  }, [status, serverUrl, setupPending]);

  // Commits the armed boot discovery once the navigator has settled past the
  // boot index route, so the wizard always pushes over a real screen (login,
  // home, or setup) and Back lands somewhere meaningful instead of a blank
  // index. The atomic commit (pending + request id) routes exactly once via
  // the guard below; AuthGuard yields while pending, so no auth redirect can
  // override or duplicate it.
  useEffect(() => {
    if (!bootSetupUrl) {
      return;
    }
    if (bootSetupUrl !== serverUrl || setupPending) {
      setBootSetupUrl(null);
      return;
    }
    // Cast: the router types segments as non-empty, but the boot index
    // route genuinely reports [] (see the segment predicates).
    if ((segments as readonly string[]).length === 0) {
      return;
    }
    setBootSetupUrl(null);
    useServerStore.getState().markSetupPending();
  }, [bootSetupUrl, serverUrl, setupPending, segments]);

  // One-shot memory for commit-driven routing (see setupNavigation.ts).
  const [memory] = useState<ServerGuardMemory>(() => ({
    prevStatus: status,
    handledSetupRequestId: setupRequestId,
  }));

  // Owns setup routing: unconfigured → server-setup, wizard-bound commits →
  // setup wizard, first-launch ready commits → Login.
  useEffect(() => {
    // Read the live snapshot so a repeated run (dev StrictMode re-invoke)
    // observes the already-handled commit instead of the stale closure.
    const live = useServerStore.getState();
    const action = serverGuardAction(memory, {
      status: live.status,
      setupPending: live.setupPending,
      setupRequestId: live.setupRequestId,
      segments,
    });
    memory.prevStatus = live.status;
    memory.handledSetupRequestId = live.setupRequestId;
    dispatchNav(router, action);
  }, [status, setupPending, setupRequestId, segments, router, memory]);

  return (
    <>
      {children}
      {status === 'loading' && (
        <View style={styles.guardOverlay}>
          <ActivityIndicator size="large" color={"#FFD54F"} />
        </View>
      )}
    </>
  );
}

// --------------------------------------------------------------------------
// Guard: redirects based on auth state after it is known
// --------------------------------------------------------------------------
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status, checkAuth } = useAuth();
  const serverStatus = useServerStore((s) => s.status);
  const setupPending = useServerStore((s) => s.setupPending);
  const router = useRouter();
  const segments = useSegments();
  const { stop } = usePlayer();

  // Initialize auth once the server is known AND no backend setup is
  // pending: the refresh below must target the active backend, and this
  // guard now mounts at boot (it no longer waits behind the server gate),
  // so an unconditional boot check could refresh against the wrong URL.
  // Runs only from the untouched 'idle' state (see shouldInitAuth): the
  // Setup Wizard validates the kept session itself on completion and
  // resolves the status before clearing the flag, so that transition must
  // NOT start a second refresh here. Abandoning the wizard with auth still
  // idle does re-arm this effect, which resumes boot initialization.
  useEffect(() => {
    if (
      shouldInitAuth({
        serverStatus,
        setupPending,
        authStatus: status,
      })
    ) {
      void checkAuth();
    }
  }, [serverStatus, setupPending, status, checkAuth]);

  // React to auth state changes. Yields while the server is unknown or a
  // backend setup is pending — ServerGuard owns routing then, so Login can
  // never preempt the Setup Wizard.
  useEffect(() => {
    if (status === 'unauthenticated') {
      // Stop playback on logout
      stop();
    }
    dispatchNav(
      router,
      authGuardAction({
        authStatus: status,
        serverStatus,
        setupPending,
        segments,
      }),
    );
  }, [status, serverStatus, setupPending, segments, router, stop]);

  // The loader covers only genuine auth initialization on a ready
  // backend. ServerGuard owns the server-loading and setup screens
  // (unconfigured setup, pending wizard), so this overlay must never cover
  // them — auth legitimately stays 'idle' until setup completes.
  const showAuthLoader =
    serverStatus === 'configured' &&
    !setupPending &&
    (status === 'idle' || status === 'loading');

  return (
    <>
      {children}
      {showAuthLoader && (
        <View style={styles.guardOverlay}>
          <ActivityIndicator size="large" color={"#FFD54F"} />
        </View>
      )}
      {status === 'authenticated' && (
        <>
          <MiniplayerScreen />
          <PlaybackSync />
        </>
      )}
    </>
  );
}

function dispatchNav(
  router: ReturnType<typeof useRouter>,
  action: SetupNavAction | null,
) {
  if (!action) {
    return;
  }
  if (action.method === 'push') {
    router.push(action.href);
  } else {
    router.replace(action.href);
  }
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

  // NOTE: setupPlayer() runs from ServerGuard once the server is known.

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
                  <ServerGuard>
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
                  </ServerGuard>
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
  // Covers the (still mounted) navigator while a guard is undecided: blocks
  // touches and hides the unsettled route without unmounting the Stack, so a
  // redirect dispatched on the resolving commit always finds its navigator.
  guardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0a0a0a",
    justifyContent: 'center',
    alignItems: 'center',
  },
});
