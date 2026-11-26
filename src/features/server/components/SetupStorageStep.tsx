import { Check, HardDrive } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { R2_FIELD_KEYS, R2FieldKey } from '../api/setupApi';
import { SecretInput } from './SecretInput';
import {
  SetupConfiguredNote,
  SetupLockedNote,
  SetupTextField,
} from './SetupField';

interface SetupStorageStepProps {
  r2: Record<R2FieldKey, string>;
  setR2Field: (key: R2FieldKey, next: string) => void;
  error: string | null;
  isLocked: (key: string) => boolean;
  isConfigured: (key: string) => boolean;
  onSubmit: () => void;
  onInputFocus: () => void;
}

export function SetupStorageStep({
  r2,
  setR2Field,
  error,
  isLocked,
  isConfigured,
  onSubmit,
  onInputFocus,
}: SetupStorageStepProps) {
  const allLocked = R2_FIELD_KEYS.every((key) => isLocked(key));
  const anyKeepable = R2_FIELD_KEYS.some(
    (key) => !isLocked(key) && isConfigured(key),
  );

  return (
    <View>
      <Text className="mb-1.5 text-3xl font-display text-foreground">
        Storage
      </Text>
      <Text className="mb-7 text-[13px] font-heading leading-relaxed text-muted-foreground">
        Cloudflare R2 holds your music files for streaming. Every field is
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
            Storage is already managed by the backend environment. Continue
            to the next step.
          </Text>
        </View>
      ) : (
        <>
          {isLocked('R2_ACCOUNT_ID') ? (
            <SetupLockedNote label="Account ID" />
          ) : (
            <SetupTextField
              label="R2 Account ID"
              value={r2.R2_ACCOUNT_ID}
              onChangeText={(next) => setR2Field('R2_ACCOUNT_ID', next)}
              placeholder="Cloudflare account ID"
              onInputFocus={onInputFocus}
            />
          )}
          {isLocked('R2_ACCESS_KEY') ? (
            <SetupLockedNote label="Access key" />
          ) : (
            <SecretInput
              label="R2 Access Key"
              value={r2.R2_ACCESS_KEY}
              onChangeText={(next) => setR2Field('R2_ACCESS_KEY', next)}
              placeholder="R2 API access key"
              onFocus={onInputFocus}
            />
          )}
          {isLocked('R2_SECRET_KEY') ? (
            <SetupLockedNote label="Secret key" />
          ) : (
            <SecretInput
              label="R2 Secret Key"
              value={r2.R2_SECRET_KEY}
              onChangeText={(next) => setR2Field('R2_SECRET_KEY', next)}
              placeholder="R2 API secret key"
              onFocus={onInputFocus}
            />
          )}
          {isLocked('R2_BUCKET') ? (
            <SetupLockedNote label="Bucket" />
          ) : (
            <SetupTextField
              label="R2 Bucket"
              value={r2.R2_BUCKET}
              onChangeText={(next) => setR2Field('R2_BUCKET', next)}
              placeholder="Bucket name"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              onInputFocus={onInputFocus}
            />
          )}
          {anyKeepable ? (
            <SetupConfiguredNote text="Some storage values are already configured. Leave a field blank to keep its saved value." />
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
          <Icon as={HardDrive} size={16} className="text-secondary" />
          <Text className="text-[15px] font-display text-secondary">
            Continue
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
