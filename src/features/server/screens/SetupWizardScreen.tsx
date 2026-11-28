import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useKeyboardAwareScroll } from '@/components/useKeyboardAwareScroll';
import { useSetupWizard, SetupWizardStep } from '../hooks/useSetupWizard';
import { SetupApiKeysStep } from '../components/SetupApiKeysStep';
import { SetupFinishStep } from '../components/SetupFinishStep';
import { SetupPlaybackStep } from '../components/SetupPlaybackStep';
import { SetupStorageStep } from '../components/SetupStorageStep';
import { SetupTokenStep } from '../components/SetupTokenStep';

const ALL_STEPS: { key: SetupWizardStep; title: string }[] = [
  { key: 'token', title: 'Setup token' },
  { key: 'storage', title: 'Storage' },
  { key: 'playback', title: 'Playback' },
  { key: 'apikeys', title: 'API keys' },
  { key: 'finish', title: 'Finish' },
];

export const SetupWizardScreen = () => {
  const {
    scrollViewRef,
    onInputFocus,
    onContentSizeChange,
    keyboardBottomPadding,
  } = useKeyboardAwareScroll();
  const wizard = useSetupWizard();

  // Local mode has no playback step (no worker URL or playback secret), so
  // the indicator and counter follow the active path.
  const STEPS = ALL_STEPS.filter(
    (entry) =>
      entry.key !== 'playback' ||
      wizard.storageMode === 'r2' ||
      wizard.step === 'playback',
  );
  const stepIndex = Math.max(
    0,
    STEPS.findIndex((entry) => entry.key === wizard.step),
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#0a0a0a]"
    >
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center gap-4 px-5 pb-4 pt-3">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.8}
            onPress={wizard.goBack}
            disabled={wizard.isBusy}
            className="h-11 w-11 items-center justify-center rounded-xl border border-white/5 bg-card"
          >
            <Icon as={ArrowLeft} size={24} className="text-foreground" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-display text-foreground">
              Server setup
            </Text>
            <Text className="text-[12px] text-muted-foreground">
              Step {stepIndex + 1} of {STEPS.length} ·{' '}
              {STEPS[stepIndex]?.title}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-1.5 px-6 pb-5">
          {STEPS.map((entry, index) => (
            <View
              key={entry.key}
              className={`h-1 flex-1 rounded-full ${
                index <= stepIndex ? 'bg-amber-300' : 'bg-white/10'
              }`}
            />
          ))}
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 40 + keyboardBottomPadding,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          onContentSizeChange={onContentSizeChange}
        >
          {wizard.serverUrl === null ? (
            <View className="rounded-md border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
              <Text className="text-[13px] text-red-400">
                No server selected. Go back and enter a server URL first.
              </Text>
            </View>
          ) : wizard.step === 'token' ? (
            <SetupTokenStep
              serverUrl={wizard.serverUrl}
              token={wizard.setupToken}
              setToken={wizard.setSetupToken}
              error={wizard.tokenError}
              isBusy={wizard.isValidatingToken}
              onSubmit={wizard.submitToken}
              onInputFocus={onInputFocus}
            />
          ) : wizard.step === 'storage' ? (
            <SetupStorageStep
              r2={wizard.r2}
              setR2Field={wizard.setR2Field}
              error={wizard.storageError}
              isLocked={wizard.isLocked}
              isConfigured={wizard.isConfigured}
              onSubmit={wizard.submitStorage}
              onInputFocus={onInputFocus}
              modes={wizard.storageModes}
              storageMode={wizard.storageMode}
              setStorageMode={wizard.setStorageMode}
              showSelector={wizard.showModeSelector}
              modeLocked={wizard.storageModeLocked}
              currentStorage={wizard.currentStorage}
              switchWarning={wizard.storageSwitchWarning}
            />
          ) : wizard.step === 'playback' ? (
            <SetupPlaybackStep
              playback={wizard.playback}
              setPlaybackField={wizard.setPlaybackField}
              error={wizard.playbackError}
              isLocked={wizard.isLocked}
              isConfigured={wizard.isConfigured}
              onSubmit={wizard.submitPlayback}
              onInputFocus={onInputFocus}
            />
          ) : wizard.step === 'apikeys' ? (
            <SetupApiKeysStep
              apiKeys={wizard.apiKeys}
              setApiKeyField={wizard.setApiKeyField}
              error={wizard.apiKeysError}
              isLocked={wizard.isLocked}
              isConfigured={wizard.isConfigured}
              onSubmit={wizard.submitApiKeys}
              onInputFocus={onInputFocus}
            />
          ) : (
            <SetupFinishStep
              phase={wizard.finishPhase}
              error={wizard.finishError}
              onRetry={wizard.retryFinish}
              onBackToEdit={wizard.goBack}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};
