import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';

interface SecretInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  editable?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  returnKeyType?: React.ComponentProps<typeof TextInput>['returnKeyType'];
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  hint?: string;
}

/**
 * Labeled credential field, masked by default with a visibility toggle.
 * Matches the auth/server field idiom (label + 50px card row).
 */
export function SecretInput({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType = 'default',
  returnKeyType = 'next',
  onSubmitEditing,
  onFocus,
  hint,
}: SecretInputProps) {
  const [visible, setVisible] = useState(false);

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
          secureTextEntry={!visible}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={onFocus}
        />
        <Pressable
          onPress={() => setVisible((prev) => !prev)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide value' : 'Show value'}
        >
          {visible ? (
            <Icon
              as={EyeOff}
              size={16}
              className="text-muted-foreground"
              strokeWidth={1.8}
            />
          ) : (
            <Icon
              as={Eye}
              size={16}
              className="text-muted-foreground"
              strokeWidth={1.8}
            />
          )}
        </Pressable>
      </View>
      {hint ? (
        <Text className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
