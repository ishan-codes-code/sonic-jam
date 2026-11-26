import { Check, Info } from 'lucide-react-native';
import React from 'react';
import { TextInput, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';

/**
 * Shared wizard field idioms (storage / playback / API-key steps): a plain
 * labeled field matching the auth/server style, the environment-managed note
 * for locked keys, and the keep-saved-value note for configured keys.
 */

interface SetupTextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  returnKeyType?: React.ComponentProps<typeof TextInput>['returnKeyType'];
  onSubmitEditing?: () => void;
  onInputFocus: () => void;
  hint?: string;
}

export function SetupTextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  returnKeyType = 'next',
  onSubmitEditing,
  onInputFocus,
  hint,
}: SetupTextFieldProps) {
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
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={onInputFocus}
        />
      </View>
      {hint ? (
        <Text className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function SetupLockedNote({ label }: { label: string }) {
  return (
    <View className="mb-3.5 flex-row items-center gap-2 rounded-md border border-white/5 bg-card px-3.5 py-3">
      <Icon
        as={Check}
        size={14}
        className="shrink-0 text-emerald-400"
        strokeWidth={2.5}
      />
      <Text className="flex-1 text-[12px] text-muted-foreground">
        {label} is managed by the backend environment.
      </Text>
    </View>
  );
}

export function SetupConfiguredNote({ text }: { text: string }) {
  return (
    <View className="mb-4 flex-row gap-2.5 rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3">
      <Icon
        as={Info}
        size={15}
        className="mt-0.5 shrink-0 text-amber-300"
        strokeWidth={1.8}
      />
      <Text className="flex-1 text-[12px] leading-relaxed text-amber-200/90">
        {text}
      </Text>
    </View>
  );
}
