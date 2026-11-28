import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ArrowLeft, Database, Server, User as UserIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/features/auth/store/authStore';
import { isAdmin, useServerStore } from '@/features/server';
import { SettingsRow } from '../components/SettingsRow';

export function SettingsScreen() {
  const router = useRouter();
  const serverUrl = useServerStore((s) => s.serverUrl);
  const user = useAuthStore((s) => s.user);
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
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
        <Text className="text-xl font-display text-foreground">Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-3 w-full text-[10px] font-heading-medium uppercase text-muted-foreground">
          General
        </Text>

        <SettingsRow
          icon={UserIcon}
          label="Account & Profile"
          description="Account details & sign out"
          onPress={() => router.push('/settings/account')}
        />

        <SettingsRow
          icon={Server}
          tone="amber"
          label="Server Management"
          description={serverUrl ?? 'Configure your server'}
          onPress={() => router.push('/settings/server')}
        />

        {isAdmin(user) ? (
          <SettingsRow
            icon={Database}
            label="Storage"
            description="Storage mode & credentials"
            onPress={() => router.push('/settings/storage')}
          />
        ) : null}

        {/* Version */}
        <Text className="mt-10 text-center text-[10px] font-bold uppercase tracking-[3px] text-muted">
          SONIC v{appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
