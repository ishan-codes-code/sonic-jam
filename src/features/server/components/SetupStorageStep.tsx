import { Check, HardDrive, Info } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { R2FieldKey } from '../api/setupApi';
import { SecretInput } from './SecretInput';

interface SetupStorageStepProps {
  r2: Record<R2FieldKey, string>;
  setR2Field: (key: R2FieldKey, next: string) => void;
  error: string | null;
  isLocked: (key: string) => boolean;
  isConfigured: (key: string) => boolean;
  onSubmit: () => void;
  onSkip: () => void;
  onInputFocus: () => void;
}

function PlainField({
  label,
  fieldKey,
  value,
  onChangeText,
  placeholder,
  onInputFocus,
}: {
  label: string;
  fieldKey: R2FieldKey;
  value: string;
  onChangeText: (key: R2FieldKey, next: string) => void;
  placeholder: string;
  onInputFocus: () => void;
}) {
  return (
    <View className="mb-3.5">
      <Text className="mb-1.5 text-[10px] font-heading uppercase tracking-[2px] text-muted-foreground">
        {label}
      </Text>
      <View className="h-[50px] flex-row items-center gap-2.5 rounded-md border border-border bg-card px-3.5">
        <Input
          className="h-full flex-1 border-0 bg-transparent text-[14px] font-display text-foreground shadow-none"
          placeholder={placeholder}
          placeholderTextColor="#252525"
          value={value}
          onChangeText={(next) => onChangeText(fieldKey, next)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onFocus={onInputFocus}
        />
      </View>
    </View>
  );
}

export function SetupStorageStep({
  r2,
  setR2Field,
  error,
  isLocked,
  isConfigured,
  onSubmit,
  onSkip,
  onInputFocus,
}: SetupStorageStepProps) {
  const allLocked =
    isLocked('R2_ACCOUNT_ID') &&
    isLocked('R2_ACCESS_KEY') &&
    isLocked('R2_SECRET_KEY') &&
    isLocked('R2_BUCKET');

  const lockedNote = (key: R2FieldKey, configuredLabel: string) =>
    isLocked(key) ? (
      <View
        key={key}
        className="mb-3.5 flex-row items-center gap-2 rounded-md border border-white/5 bg-card px-3.5 py-3"
      >
        <Icon
          as={Check}
          size={14}
          className="shrink-0 text-emerald-400"
          strokeWidth={2.5}
        />
        <Text className="flex-1 text-[12px] text-muted-foreground">
          {configuredLabel} is managed by the backend environment.
        </Text>
      </View>
    ) : null;

  return (
    <View>
      <Text className="mb-1.5 text-3xl font-display text-foreground">
        Storage <Text className="text-lg text-muted-foreground">(optional)</Text>
      </Text>
      <Text className="mb-7 text-[13px] font-heading leading-relaxed text-muted-foreground">
        Cloudflare R2 holds your music files for streaming. You can add it
        now, or skip it — skipping will not block setup or sign-in.
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
            to finish setup.
          </Text>
        </View>
      ) : (
        <>
          {isLocked('R2_ACCOUNT_ID') ? (
            lockedNote('R2_ACCOUNT_ID', 'Account ID')
          ) : (
            <PlainField
              label="R2 Account ID"
              fieldKey="R2_ACCOUNT_ID"
              value={r2.R2_ACCOUNT_ID}
              onChangeText={setR2Field}
              placeholder="Cloudflare account ID"
              onInputFocus={onInputFocus}
            />
          )}
          {isLocked('R2_ACCESS_KEY') ? (
            lockedNote('R2_ACCESS_KEY', 'Access key')
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
            lockedNote('R2_SECRET_KEY', 'Secret key')
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
            lockedNote('R2_BUCKET', 'Bucket')
          ) : (
            <PlainField
              label="R2 Bucket"
              fieldKey="R2_BUCKET"
              value={r2.R2_BUCKET}
              onChangeText={setR2Field}
              placeholder="Bucket name"
              onInputFocus={onInputFocus}
            />
          )}
          {(isConfigured('R2_ACCOUNT_ID') ||
            isConfigured('R2_ACCESS_KEY') ||
            isConfigured('R2_SECRET_KEY') ||
            isConfigured('R2_BUCKET')) && (
            <View className="mb-4 flex-row gap-2.5 rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3">
              <Icon
                as={Info}
                size={15}
                className="mt-0.5 shrink-0 text-amber-300"
                strokeWidth={1.8}
              />
              <Text className="flex-1 text-[12px] leading-relaxed text-amber-200/90">
                Some storage values are already configured. Fill in every
                remaining field to update them, or skip to keep them.
              </Text>
            </View>
          )}
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
      <Pressable
        onPress={onSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip for now"
        className="mt-3 h-[52px] w-full items-center justify-center rounded-md border border-border bg-card"
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text className="text-[15px] font-display text-foreground">
          Skip for now
        </Text>
      </Pressable>
    </View>
  );
}
