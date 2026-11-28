import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useKeyboardAwareScroll } from '@/components/useKeyboardAwareScroll';
import {
  AlertTriangle,
  ArrowLeft,
  Cloud,
  HardDrive,
} from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminStorageModeLabel } from '../api/adminStorageApi';
import { SetupPlaybackStep } from '../components/SetupPlaybackStep';
import { SetupStorageStep } from '../components/SetupStorageStep';
import { useAdminStorage } from '../hooks/useAdminStorage';

const BUSY_LABELS = {
  saving: 'Saving settings…',
  'unknown-checking': 'Checking what the server saved…',
  polling: 'Waiting for the server to restart…',
  'worker-wait': 'Waiting for the worker to restart…',
} as const;

export const AdminStorageScreen = () => {
  const {
    scrollViewRef,
    onInputFocus,
    onContentSizeChange,
    keyboardBottomPadding,
  } = useKeyboardAwareScroll();
  const admin = useAdminStorage();

  const showSelector =
    admin.info !== null &&
    !admin.info.modeLocked &&
    admin.modes.length > 1;
  const showPlayback = admin.effectiveMode === 'r2';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#0a0a0a]">
      {/* Header (Back is blocked while busy, like the save confirm below) */}
      <View className="flex-row items-center gap-4 px-5 pb-6 pt-3">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.8}
          onPress={admin.leave}
          disabled={admin.busy}
          className="h-11 w-11 items-center justify-center rounded-xl border border-white/5 bg-card"
          style={{ opacity: admin.busy ? 0.4 : 1 }}
        >
          <Icon as={ArrowLeft} size={24} className="text-foreground" />
        </TouchableOpacity>
        <Text className="text-xl font-display text-foreground">Storage</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 110 + keyboardBottomPadding,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          onContentSizeChange={onContentSizeChange}
        >
          {admin.loadPhase === 'loading' ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#FFD54F" />
              <Text className="mt-4 text-[13px] text-muted-foreground">
                Loading storage settings…
              </Text>
            </View>
          ) : admin.loadPhase === 'load-error' ? (
            <>
              <View className="mb-4 rounded-md border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
                <Text className="text-[13px] text-red-400">
                  {admin.loadError?.message ??
                    'Something went wrong. Try again.'}
                </Text>
              </View>
              {admin.loadError?.retryable ? (
                <Pressable
                  onPress={admin.reload}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading storage settings"
                  className="mt-2 h-[52px] w-full items-center justify-center rounded-md bg-amber-300"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text className="text-[15px] font-display text-secondary">
                    Try again
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={admin.leave}
                accessibilityRole="button"
                accessibilityLabel="Back to Settings"
                className="mt-3 h-[52px] w-full items-center justify-center rounded-md border border-border bg-card"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text className="text-[15px] font-display text-foreground">
                  Back to Settings
                </Text>
              </Pressable>
            </>
          ) : admin.info !== null ? (
            <>
              {/* Current mode */}
              <Text className="mb-3 text-[10px] font-heading-medium uppercase text-muted-foreground">
                Current mode
              </Text>
              <View className="mb-6 w-full flex-row items-center gap-3.5 rounded-2xl border border-muted bg-card px-[18px] py-4">
                <View className="h-9 w-9 items-center justify-center rounded-[10px] border border-amber-300/15 bg-amber-300/[0.07]">
                  <Icon
                    as={admin.info.mode === 'local' ? HardDrive : Cloud}
                    className="text-amber-300"
                    size={16}
                    strokeWidth={1.8}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-[14px] font-semibold text-foreground"
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {adminStorageModeLabel(admin.info.mode)}
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-muted-foreground">
                    Configured
                  </Text>
                </View>
                <View className="h-2 w-2 rounded-full bg-amber-300" />
              </View>

              {/* Storage (mode + R2 fields): the wizard's own step */}
              <SetupStorageStep
                r2={admin.r2}
                setR2Field={admin.setR2Field}
                error={admin.storageError}
                isLocked={admin.isLocked}
                isConfigured={admin.isConfigured}
                onSubmit={admin.requestSave}
                onInputFocus={onInputFocus}
                modes={admin.modes}
                storageMode={admin.selectedMode}
                setStorageMode={admin.setSelectedMode}
                showSelector={showSelector}
                modeLocked={admin.info.modeLocked}
                currentStorage={admin.info.mode}
                switchWarning={admin.switchWarning}
                hideSubmit
                description={
                  showSelector || admin.info.modeLocked
                    ? 'Choose where your music files live. Saving restarts the server.'
                    : 'Cloudflare R2 holds your music files for streaming. Every field is required.'
                }
                localNote="No storage keys needed — the server keeps its own music folder and manages the playback secret automatically."
              />

              {/* Playback (worker + secret): the wizard's own step, r2 only */}
              {showPlayback ? (
                <View className="mt-8">
                  <SetupPlaybackStep
                    playback={admin.playback}
                    setPlaybackField={admin.setPlaybackField}
                    error={admin.playbackError}
                    isLocked={admin.isLocked}
                    isConfigured={admin.isConfigured}
                    onSubmit={admin.requestSave}
                    onInputFocus={onInputFocus}
                    hideSubmit
                    description="Your Cloudflare worker streams music to the app."
                    configuredNote={
                      admin.info.playbackSecretRequired
                        ? 'The playback secret is required — enter it even though a value is already saved. Other blank fields keep their saved values.'
                        : undefined
                    }
                  />
                </View>
              ) : null}

              {/* Save-level error (rejected, forbidden, outdated, …) */}
              {admin.saveError ? (
                <View className="mb-4 mt-5 rounded-md border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
                  <Text className="text-[13px] text-red-400">
                    {admin.saveError}
                  </Text>
                </View>
              ) : null}

              {/* Busy status */}
              {admin.busy ? (
                <View className="mb-4 mt-5 flex-row items-center gap-3 rounded-md border border-white/5 bg-card px-4 py-3.5">
                  <ActivityIndicator size="small" color="#FFD54F" />
                  <Text className="flex-1 text-[13px] text-foreground">
                    {
                      BUSY_LABELS[
                        admin.savePhase as keyof typeof BUSY_LABELS
                      ]
                    }
                  </Text>
                </View>
              ) : null}

              {/* Save */}
              {admin.savePhase === 'idle' ? (
                <Pressable
                  onPress={admin.requestSave}
                  disabled={!admin.hasChanges}
                  accessibilityRole="button"
                  accessibilityLabel="Save storage settings"
                  accessibilityState={{ disabled: !admin.hasChanges }}
                  className="mt-5 h-[52px] w-full items-center justify-center rounded-md bg-amber-300"
                  style={{ opacity: admin.hasChanges ? 1 : 0.4 }}
                >
                  <Text className="text-[15px] font-display text-secondary">
                    Save
                  </Text>
                </Pressable>
              ) : null}

              {/* Confirm */}
              {admin.savePhase === 'confirm' ? (
                <View className="mt-5">
                  <View className="mb-4 flex-row gap-2.5 rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3">
                    <Icon
                      as={AlertTriangle}
                      size={15}
                      className="mt-0.5 shrink-0 text-amber-300"
                      strokeWidth={1.8}
                    />
                    <Text className="flex-1 text-[12px] leading-relaxed text-amber-200/90">
                      {"Songs aren't moved. Missing songs download again when played. Playback and active downloads will stop."}
                    </Text>
                  </View>
                  <View className="gap-3">
                    <Pressable
                      onPress={admin.confirmSave}
                      accessibilityRole="button"
                      accessibilityLabel="Confirm save storage settings"
                      className="h-[52px] w-full items-center justify-center rounded-md bg-red-600"
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text className="text-[15px] font-display text-white">
                        Save & restart
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={admin.cancelConfirm}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel save"
                      className="h-[52px] w-full items-center justify-center rounded-md border border-border bg-card"
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text className="text-[15px] font-display text-foreground">
                        Cancel
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {/* Unknown POST result: resubmit or leave */}
              {admin.savePhase === 'unknown' ? (
                <View className="mt-5">
                  <View className="mb-4 flex-row gap-2.5 rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3">
                    <Icon
                      as={AlertTriangle}
                      size={15}
                      className="mt-0.5 shrink-0 text-amber-300"
                      strokeWidth={1.8}
                    />
                    <Text className="flex-1 text-[12px] leading-relaxed text-amber-200/90">
                      {admin.unknownMessage ??
                        'The save may or may not have applied. You can save again.'}
                    </Text>
                  </View>
                  <View className="gap-3">
                    <Pressable
                      onPress={admin.retrySave}
                      accessibilityRole="button"
                      accessibilityLabel="Save again"
                      className="h-[52px] w-full items-center justify-center rounded-md bg-amber-300"
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text className="text-[15px] font-display text-secondary">
                        Save again
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={admin.leave}
                      accessibilityRole="button"
                      accessibilityLabel="Back to Settings"
                      className="h-[52px] w-full items-center justify-center rounded-md border border-border bg-card"
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text className="text-[15px] font-display text-foreground">
                        Back to Settings
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {/* Poll timeout: check again (no resubmit) or leave */}
              {admin.savePhase === 'poll-failed' ? (
                <View className="mt-5">
                  <View className="mb-4 flex-row gap-2.5 rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3">
                    <Icon
                      as={AlertTriangle}
                      size={15}
                      className="mt-0.5 shrink-0 text-amber-300"
                      strokeWidth={1.8}
                    />
                    <Text className="flex-1 text-[12px] leading-relaxed text-amber-200/90">
                      {admin.pollError ??
                        'The server is still starting. Check again in a moment.'}
                    </Text>
                  </View>
                  <View className="gap-3">
                    <Pressable
                      onPress={admin.checkAgain}
                      accessibilityRole="button"
                      accessibilityLabel="Check again"
                      className="h-[52px] w-full items-center justify-center rounded-md bg-amber-300"
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text className="text-[15px] font-display text-secondary">
                        Check again
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={admin.leave}
                      accessibilityRole="button"
                      accessibilityLabel="Back to Settings"
                      className="h-[52px] w-full items-center justify-center rounded-md border border-border bg-card"
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text className="text-[15px] font-display text-foreground">
                        Back to Settings
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
