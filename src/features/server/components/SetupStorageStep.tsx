import { AlertTriangle, Check, Cloud, HardDrive } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { R2_FIELD_KEYS, R2FieldKey } from '../api/setupApi';
import type {
  HealthStorage,
  StorageMode,
} from '../api/serverValidation';
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
  /** Advertised modes to offer. Rendered only when `showSelector` is true. */
  modes: StorageMode[];
  storageMode: StorageMode;
  setStorageMode: (mode: StorageMode) => void;
  showSelector: boolean;
  modeLocked: boolean;
  currentStorage: HealthStorage | null;
  /** No-migration warning for an already-configured server, if any. */
  switchWarning: string | null;
}

const MODE_META: Record<
  StorageMode,
  { title: string; blurb: string; icon: typeof Cloud }
> = {
  local: {
    title: 'Local storage',
    blurb: 'Songs live on this server. Simplest setup.',
    icon: HardDrive,
  },
  r2: {
    title: 'Cloudflare R2',
    blurb: 'Songs live in Cloudflare R2 object storage.',
    icon: Cloud,
  },
};

function modeLabel(mode: StorageMode): string {
  return mode === 'local' ? 'Local storage' : 'Cloudflare R2';
}

export function SetupStorageStep({
  r2,
  setR2Field,
  error,
  isLocked,
  isConfigured,
  onSubmit,
  onInputFocus,
  modes,
  storageMode,
  setStorageMode,
  showSelector,
  modeLocked,
  currentStorage,
  switchWarning,
}: SetupStorageStepProps) {
  const allLocked = R2_FIELD_KEYS.every((key) => isLocked(key));
  const anyKeepable = R2_FIELD_KEYS.some(
    (key) => !isLocked(key) && isConfigured(key),
  );
  const isLocal = storageMode === 'local';

  return (
    <View>
      <Text className="mb-1.5 text-3xl font-display text-foreground">
        Storage
      </Text>
      <Text className="mb-7 text-[13px] font-heading leading-relaxed text-muted-foreground">
        {showSelector || modeLocked
          ? 'Choose where your music files live. Nothing is saved until the final step.'
          : 'Cloudflare R2 holds your music files for streaming. Every field is required — nothing is saved until the final step.'}
      </Text>

      {error ? (
        <View className="mb-4 rounded-md border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
          <Text className="text-[13px] text-red-400">{error}</Text>
        </View>
      ) : null}

      {modeLocked ? (
        <View className="mb-4 flex-row gap-2.5 rounded-md border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3">
          <Icon
            as={Check}
            size={15}
            className="mt-0.5 shrink-0 text-emerald-300"
            strokeWidth={2.5}
          />
          <Text className="flex-1 text-[12px] leading-relaxed text-emerald-200/90">
            Storage mode is managed by the backend environment
            {currentStorage === 'local' || currentStorage === 'r2'
              ? ` (${modeLabel(currentStorage)}).`
              : '.'}
          </Text>
        </View>
      ) : showSelector ? (
        <View className="mb-5 gap-2.5">
          {modes.map((mode) => {
            const meta = MODE_META[mode];
            const selected = storageMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setStorageMode(mode)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={meta.title}
                className={`flex-row items-center gap-3.5 rounded-md border bg-card px-4 py-3.5 ${
                  selected ? 'border-amber-300/70' : 'border-white/5'
                }`}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  className={`h-10 w-10 items-center justify-center rounded-md ${
                    selected ? 'bg-amber-300/15' : 'bg-white/5'
                  }`}
                >
                  <Icon
                    as={meta.icon}
                    size={19}
                    className={
                      selected ? 'text-amber-300' : 'text-muted-foreground'
                    }
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-display text-foreground">
                    {meta.title}
                  </Text>
                  <Text className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    {meta.blurb}
                  </Text>
                </View>
                <View
                  className={`h-5 w-5 items-center justify-center rounded-full border ${
                    selected ? 'border-amber-300' : 'border-white/20'
                  }`}
                >
                  {selected ? (
                    <View className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {switchWarning ? (
        <View className="mb-4 flex-row gap-2.5 rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3">
          <Icon
            as={AlertTriangle}
            size={15}
            className="mt-0.5 shrink-0 text-amber-300"
            strokeWidth={1.8}
          />
          <Text className="flex-1 text-[12px] leading-relaxed text-amber-200/90">
            {switchWarning}
          </Text>
        </View>
      ) : null}

      {isLocal ? (
        <View className="mb-4 flex-row gap-2.5 rounded-md border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3">
          <Icon
            as={Check}
            size={15}
            className="mt-0.5 shrink-0 text-emerald-300"
            strokeWidth={2.5}
          />
          <Text className="flex-1 text-[12px] leading-relaxed text-emerald-200/90">
            No storage keys needed — the server keeps its own music folder and
            creates the playback secret automatically. Continue to add your API
            keys.
          </Text>
        </View>
      ) : allLocked ? (
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
