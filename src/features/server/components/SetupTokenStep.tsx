import { Info, KeyRound } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { SecretInput } from './SecretInput';

interface SetupTokenStepProps {
  serverUrl: string | null;
  token: string;
  setToken: (next: string) => void;
  error: string | null;
  isBusy: boolean;
  onSubmit: () => void;
  onInputFocus: () => void;
}

export function SetupTokenStep({
  serverUrl,
  token,
  setToken,
  error,
  isBusy,
  onSubmit,
  onInputFocus,
}: SetupTokenStepProps) {
  return (
    <View>
      <Text className="mb-1.5 text-3xl font-display text-foreground">
        Setup token
      </Text>
      <Text className="mb-7 text-[13px] font-heading leading-relaxed text-muted-foreground">
        This server needs its first-time setup. When the backend started, it
        printed a one-time setup token — enter it to continue.
        {serverUrl ? ` Server: ${serverUrl}` : ''}
      </Text>

      {error ? (
        <View className="mb-4 rounded-md border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
          <Text className="text-[13px] text-red-400">{error}</Text>
        </View>
      ) : null}

      <View className="mb-4 flex-row gap-2.5 rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3">
        <Icon
          as={Info}
          size={15}
          className="mt-0.5 shrink-0 text-amber-300"
          strokeWidth={1.8}
        />
        <Text className="flex-1 text-[12px] leading-relaxed text-amber-200/90">
          In Termux, look for a line starting with “SETUP TOKEN: …”. The token
          is only shown once.
        </Text>
      </View>

      <SecretInput
        label="Setup token"
        value={token}
        onChangeText={setToken}
        placeholder="Paste the token from Termux"
        editable={!isBusy}
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        onFocus={onInputFocus}
      />

      <Pressable
        onPress={onSubmit}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel="Validate and continue"
        accessibilityState={{ disabled: isBusy, busy: isBusy }}
        className="mt-5 h-[52px] w-full items-center justify-center rounded-md bg-amber-300"
        style={({ pressed }) => ({
          opacity: pressed || isBusy ? 0.8 : 1,
        })}
      >
        {isBusy ? (
          <View className="flex-row items-center gap-2.5">
            <ActivityIndicator color="#0a0a0a" size="small" />
            <Text className="text-[15px] font-display text-secondary">
              Validating…
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-2">
            <Icon as={KeyRound} size={16} className="text-secondary" />
            <Text className="text-[15px] font-display text-secondary">
              Validate & continue
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
