import { Check, Play } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { PLAYBACK_FIELD_KEYS, PlaybackFieldKey } from '../api/setupApi';
import { SecretInput } from './SecretInput';
import {
  SetupConfiguredNote,
  SetupLockedNote,
  SetupTextField,
} from './SetupField';

interface SetupPlaybackStepProps {
  playback: Record<PlaybackFieldKey, string>;
  setPlaybackField: (key: PlaybackFieldKey, next: string) => void;
  error: string | null;
  isLocked: (key: string) => boolean;
  isConfigured: (key: string) => boolean;
  onSubmit: () => void;
  onInputFocus: () => void;
}

export function SetupPlaybackStep({
  playback,
  setPlaybackField,
  error,
  isLocked,
  isConfigured,
  onSubmit,
  onInputFocus,
}: SetupPlaybackStepProps) {
  const allLocked = PLAYBACK_FIELD_KEYS.every((key) => isLocked(key));
  const anyKeepable = PLAYBACK_FIELD_KEYS.some(
    (key) => !isLocked(key) && isConfigured(key),
  );

  return (
    <View>
      <Text className="mb-1.5 text-3xl font-display text-foreground">
        Playback
      </Text>
      <Text className="mb-7 text-[13px] font-heading leading-relaxed text-muted-foreground">
        Your Cloudflare worker streams music to the app. Every field is
        required — nothing is saved until the final step.
      </Text>

      {error ? (
        <View className="mb-4 rounded-md border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
          <Text className="text-[13px] text-red-400">{error}</Text>
        </View>
      ) : null}

      {allLocked ? (
        <View className="mb-4 flex-row gap-2.5 rounded-md border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3">
          <Icon
            as={Check}
            size={15}
            className="mt-0.5 shrink-0 text-emerald-300"
            strokeWidth={2.5}
          />
          <Text className="flex-1 text-[12px] leading-relaxed text-emerald-200/90">
            Playback is already managed by the backend environment. Continue
            to the next step.
          </Text>
        </View>
      ) : (
        <>
          {isLocked('WORKER_STREAM_URL') ? (
            <SetupLockedNote label="Worker stream URL" />
          ) : (
            <SetupTextField
              label="Worker Stream URL"
              value={playback.WORKER_STREAM_URL}
              onChangeText={(next) =>
                setPlaybackField('WORKER_STREAM_URL', next)
              }
              placeholder="https://your-worker.workers.dev"
              keyboardType="url"
              onInputFocus={onInputFocus}
            />
          )}
          {isLocked('JWT_PLAYBACK_SECRET') ? (
            <SetupLockedNote label="Playback secret" />
          ) : (
            <SecretInput
              label="Playback Secret"
              value={playback.JWT_PLAYBACK_SECRET}
              onChangeText={(next) =>
                setPlaybackField('JWT_PLAYBACK_SECRET', next)
              }
              placeholder="Playback secret from your worker"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              onFocus={onInputFocus}
              hint="This secret must match the one set in your Cloudflare worker."
            />
          )}
          {anyKeepable ? (
            <SetupConfiguredNote text="Some playback values are already configured. Leave a field blank to keep its saved value." />
          ) : null}
        </>
      )}

      <Pressable
        onPress={onSubmit}
        accessibilityRole="button"
        accessibilityLabel="Continue"
        className="mt-5 h-[52px] w-full items-center justify-center rounded-md bg-amber-300"
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View className="flex-row items-center gap-2">
          <Icon as={Play} size={16} className="text-secondary" />
          <Text className="text-[15px] font-display text-secondary">
            Continue
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
