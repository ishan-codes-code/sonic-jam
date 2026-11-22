import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Check, Info, Server } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeyboardAwareScroll } from '@/components/useKeyboardAwareScroll';
import { useServerSetup } from '../hooks/useServerSetup';

export const ServerSetupScreen = () => {
  const {
    scrollViewRef,
    onInputFocus,
    onContentSizeChange,
    keyboardBottomPadding,
  } = useKeyboardAwareScroll();
  const {
    url,
    setUrl,
    fieldError,
    isConnecting,
    showLocalhostHint,
    handleConnect,
    isUrlUnchanged,
  } = useServerSetup();

  // The input already holds the verified, configured URL → continue with it.
  // Anything else → validate + connect (first launch or a changed URL).
  const connectLabel = isUrlUnchanged ? 'Continue' : 'Connect';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#0a0a0a]"
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 40 + keyboardBottomPadding,
            flexGrow: 1,
            justifyContent: 'center',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          onContentSizeChange={onContentSizeChange}
        >
          {/* Brand */}
          <View className="mb-8 items-center">
            <View className="mb-5 h-[68px] w-[68px] items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10">
              <Icon
                as={Server}
                size={30}
                className="text-amber-300"
                strokeWidth={1.8}
              />
            </View>
            <Text className="font-display text-4xl text-foreground">
              Sonic
            </Text>
          </View>

          {/* Heading */}
          <Text className="mb-1.5 text-3xl font-display text-foreground">
            Connect your server
          </Text>
          <Text className="mb-7 text-[13px] font-heading leading-relaxed text-muted-foreground">
            Sonic streams from your own server. Enter its address below to
            connect — hosted, tunneled, or on your local network.
          </Text>

          {/* Error */}
          {fieldError ? (
            <View className="mb-4 rounded-md border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
              <Text className="text-[13px] text-red-400">{fieldError}</Text>
            </View>
          ) : null}

          {/* Server URL */}
          <View className="mb-3.5">
            <Text className="mb-1.5 text-[10px] font-heading uppercase tracking-[2px] text-muted-foreground">
              Server URL
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
                onSubmitEditing={handleConnect}
                editable={!isConnecting}
                onFocus={onInputFocus}
              />
              {isUrlUnchanged ? (
                <Icon
                  as={Check}
                  size={18}
                  className="shrink-0 text-emerald-400"
                  strokeWidth={2.5}
                />
              ) : null}
            </View>
            <Text className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              Examples: https://backend-sonic.onrender.com ·{'\n'}
              http://192.168.1.10:3000
            </Text>
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
          <Pressable
            onPress={handleConnect}
            disabled={isConnecting}
            accessibilityRole="button"
            accessibilityLabel={connectLabel}
            accessibilityState={{ disabled: isConnecting, busy: isConnecting }}
            className="mt-5 h-[52px] w-full items-center justify-center rounded-md bg-amber-300"
            style={({ pressed }) => ({
              opacity: pressed || isConnecting ? 0.8 : 1,
            })}
          >
            {isConnecting ? (
              <View className="flex-row items-center gap-2.5">
                <ActivityIndicator color="#0a0a0a" size="small" />
                <Text className="text-[15px] font-display text-secondary">
                  Connecting…
                </Text>
              </View>
            ) : (
              <Text className="text-[15px] font-display text-secondary">
                {connectLabel}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};
