import { Check, RotateCcw, ServerCog } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { InitializePhase } from '../hooks/useSetupWizard';

interface SetupInitializeStepProps {
  phase: InitializePhase;
  error: string | null;
  onRetry: () => void;
  onBackToStorage: () => void;
}

export function SetupInitializeStep({
  phase,
  error,
  onRetry,
  onBackToStorage,
}: SetupInitializeStepProps) {
  const isWorking = phase === 'saving' || phase === 'polling';

  return (
    <View>
      <Text className="mb-1.5 text-3xl font-display text-foreground">
        Initialize
      </Text>
      <Text className="mb-7 text-[13px] font-heading leading-relaxed text-muted-foreground">
        {phase === 'saving'
          ? 'Saving your settings to the server…'
          : phase === 'polling'
            ? 'The server is restarting with its new settings. This usually takes a few seconds.'
            : phase === 'done'
              ? 'Your server is ready.'
              : 'Applying your settings and waiting for the server…'}
      </Text>

      {error ? (
        <View className="mb-4 rounded-md border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
          <Text className="text-[13px] text-red-400">{error}</Text>
        </View>
      ) : null}

      <View className="items-center py-8">
        {phase === 'done' ? (
          <View className="h-[68px] w-[68px] items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
            <Icon
              as={Check}
              size={30}
              className="text-emerald-400"
              strokeWidth={2.5}
            />
          </View>
        ) : (
          <View className="h-[68px] w-[68px] items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10">
            {isWorking ? (
              <ActivityIndicator color="#FCD34D" size="large" />
            ) : (
              <Icon
                as={ServerCog}
                size={30}
                className="text-amber-300"
                strokeWidth={1.8}
              />
            )}
          </View>
        )}
        {isWorking ? (
          <Text className="mt-4 text-[13px] font-heading text-muted-foreground">
            {phase === 'saving'
              ? 'Saving settings…'
              : 'Waiting for the server…'}
          </Text>
        ) : null}
      </View>

      {phase === 'failed' ? (
        <View className="gap-3">
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            className="h-[52px] w-full items-center justify-center rounded-md bg-amber-300"
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View className="flex-row items-center gap-2">
              <Icon as={RotateCcw} size={16} className="text-secondary" />
              <Text className="text-[15px] font-display text-secondary">
                Retry
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={onBackToStorage}
            accessibilityRole="button"
            accessibilityLabel="Back to storage"
            className="h-[52px] w-full items-center justify-center rounded-md border border-border bg-card"
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text className="text-[15px] font-display text-foreground">
              Back to storage
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
