import { Check, KeyRound } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { API_KEY_FIELD_KEYS, ApiKeyFieldKey } from '../api/setupApi';
import { SecretInput } from './SecretInput';
import { SetupConfiguredNote, SetupLockedNote } from './SetupField';

interface SetupApiKeysStepProps {
  apiKeys: Record<ApiKeyFieldKey, string>;
  setApiKeyField: (key: ApiKeyFieldKey, next: string) => void;
  error: string | null;
  isLocked: (key: string) => boolean;
  isConfigured: (key: string) => boolean;
  onSubmit: () => void;
  onInputFocus: () => void;
}

export function SetupApiKeysStep({
  apiKeys,
  setApiKeyField,
  error,
  isLocked,
  isConfigured,
  onSubmit,
  onInputFocus,
}: SetupApiKeysStepProps) {
  const allLocked = API_KEY_FIELD_KEYS.every((key) => isLocked(key));
  const anyKeepable = API_KEY_FIELD_KEYS.some(
    (key) => !isLocked(key) && isConfigured(key),
  );

  return (
    <View>
      <Text className="mb-1.5 text-3xl font-display text-foreground">
        API keys
      </Text>
      <Text className="mb-7 text-[13px] font-heading leading-relaxed text-muted-foreground">
        These keys power search and metadata. Every field is required —
        continuing saves everything at once.
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
            API keys are already managed by the backend environment. Continue
            to finish setup.
          </Text>
        </View>
      ) : (
        <>
          {isLocked('YOUTUBE_API_KEY') ? (
            <SetupLockedNote label="YouTube API key" />
          ) : (
            <SecretInput
              label="YouTube API Key"
              value={apiKeys.YOUTUBE_API_KEY}
              onChangeText={(next) => setApiKeyField('YOUTUBE_API_KEY', next)}
              placeholder="YouTube Data API key"
              onFocus={onInputFocus}
            />
          )}
          {isLocked('LASTFM_API_KEY') ? (
            <SetupLockedNote label="Last.fm API key" />
          ) : (
            <SecretInput
              label="Last.fm API Key"
              value={apiKeys.LASTFM_API_KEY}
              onChangeText={(next) => setApiKeyField('LASTFM_API_KEY', next)}
              placeholder="Last.fm API key"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              onFocus={onInputFocus}
            />
          )}
          {anyKeepable ? (
            <SetupConfiguredNote text="Some API keys are already configured. Leave a field blank to keep its saved value." />
          ) : null}
        </>
      )}

      <Pressable
        onPress={onSubmit}
        accessibilityRole="button"
        accessibilityLabel="Save and finish"
        className="mt-5 h-[52px] w-full items-center justify-center rounded-md bg-amber-300"
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View className="flex-row items-center gap-2">
          <Icon as={KeyRound} size={16} className="text-secondary" />
          <Text className="text-[15px] font-display text-secondary">
            Save & finish
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
