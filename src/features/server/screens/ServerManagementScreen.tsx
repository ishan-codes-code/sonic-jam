import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { ArrowLeft, Info, Server } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useServerSwitch } from '../hooks/useServerSwitch';

export const ServerManagementScreen = () => {
  const router = useRouter();
  const {
    currentUrl,
    url,
    setUrl,
    phase,
    fieldError,
    validatedUrl,
    showLocalhostHint,
    handleValidate,
    handleCancelConfirm,
    handleConfirmSwitch,
  } = useServerSwitch();

  const isBusy = phase === 'validating' || phase === 'switching';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#0a0a0a]">
      {/* Header */}
      <View className="flex-row items-center gap-4 px-5 pb-6 pt-3">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.8}
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-xl border border-white/5 bg-card"
        >
          <Icon as={ArrowLeft} size={24} className="text-foreground" />
        </TouchableOpacity>
        <Text className="text-xl font-display text-foreground">
          Server Management
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 110,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* Current server */}
          <Text className="mb-3 text-[10px] font-heading-medium uppercase text-muted-foreground">
            Current server
          </Text>
          <View className="mb-6 w-full flex-row items-center gap-3.5 rounded-2xl border border-muted bg-card px-[18px] py-4">
            <View className="h-9 w-9 items-center justify-center rounded-[10px] border border-amber-300/15 bg-amber-300/[0.07]">
              <Icon
                as={Server}
                className="text-amber-300"
                size={16}
                strokeWidth={1.8}
              />
            </View>
            <View className="flex-1">
              <Text
                className="text-[14px] font-semibold text-foreground"
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {currentUrl ?? 'Not configured'}
              </Text>
              <Text className="mt-0.5 text-[12px] text-muted-foreground">
                Connected
              </Text>
            </View>
            <View className="h-2 w-2 rounded-full bg-emerald-400" />
          </View>

          {/* Switch warning */}
          <View className="mb-6 flex-row gap-2.5 rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3">
            <Icon
              as={Info}
              size={15}
              className="mt-0.5 shrink-0 text-amber-300"
              strokeWidth={1.8}
            />
            <Text className="flex-1 text-[12px] leading-relaxed text-amber-200/90">
              Switching servers signs you out and stops playback. Your current
              server stays configured until the switch succeeds.
            </Text>
          </View>

          {/* Section label */}
          <Text className="mb-3 text-[10px] font-heading-medium uppercase text-muted-foreground">
            Switch to a different server
          </Text>

          {/* Error */}
          {fieldError ? (
            <View className="mb-4 rounded-md border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
              <Text className="text-[13px] text-red-400">{fieldError}</Text>
            </View>
          ) : null}

          {/* Validated */}
          {phase === 'confirm' && validatedUrl && !fieldError ? (
            <View className="mb-4 rounded-md border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3">
              <Text
                className="text-[13px] text-emerald-300"
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                Verified: {validatedUrl}
              </Text>
            </View>
          ) : null}

          {/* Server URL */}
          <View className="mb-3.5">
            <Text className="mb-1.5 text-[10px] font-heading uppercase tracking-[2px] text-muted-foreground">
              New server URL
            </Text>
            <View className="h-[50px] flex-row items-center gap-2.5 rounded-md border border-border bg-card px-3.5">
              <Icon
                as={Server}
                size={16}
                className="text-muted-foreground"
                strokeWidth={1.8}
              />
              <Input
                className="h-full flex-1 border-0 bg-transparent text-[14px] font-display text-foreground shadow-none"
                placeholder="https://sonic.example.com"
                placeholderTextColor="#252525"
                value={url}
                onChangeText={setUrl}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="URL"
                returnKeyType="go"
                onSubmitEditing={handleValidate}
                editable={!isBusy && phase !== 'confirm'}
              />
            </View>
          </View>

          {/* Localhost hint */}
          {showLocalhostHint && !fieldError ? (
            <View className="mb-4 flex-row gap-2.5 rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3">
              <Icon
                as={Info}
                size={15}
                className="mt-0.5 shrink-0 text-amber-300"
                strokeWidth={1.8}
              />
              <Text className="flex-1 text-[12px] leading-relaxed text-amber-200/90">
                On Android, localhost means this device. To reach a server on
                another machine, use its LAN address instead.
              </Text>
            </View>
          ) : null}

          {/* CTA */}
          {phase === 'confirm' ? (
            <View className="mt-5 gap-3">
              <Pressable
                onPress={handleConfirmSwitch}
                accessibilityRole="button"
                accessibilityLabel="Confirm server switch"
                className="h-[52px] w-full items-center justify-center rounded-md bg-red-600"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text className="text-[15px] font-display text-white">
                  Switch server & sign out
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCancelConfirm}
                accessibilityRole="button"
                accessibilityLabel="Cancel server switch"
                className="h-[52px] w-full items-center justify-center rounded-md border border-border bg-card"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text className="text-[15px] font-display text-foreground">
                  Cancel
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleValidate}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Validate new server"
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
                    {phase === 'switching'
                      ? 'Switching server…'
                      : 'Validating…'}
                  </Text>
                </View>
              ) : (
                <Text className="text-[15px] font-display text-secondary">
                  Validate & continue
                </Text>
              )}
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
