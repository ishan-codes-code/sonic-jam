import React from 'react';
import { ScrollView, TouchableOpacity, View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { LogOut, User as UserIcon, ShieldCheck } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth';
import { theme } from '@/theme';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 110, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View className="mb-12 items-center">
          <Text className="text-3xl font-extrabold tracking-tight text-white">
            Account
          </Text>
        </View>

        {/* Avatar Section */}
        <View className="mb-8 items-center justify-center relative w-[156px] h-[156px]">
          <LinearGradient
            colors={[theme.colors.secondaryAccent, 'transparent']}
            className="absolute h-[200px] w-[200px] rounded-full opacity-15"
          />
          <View
            className="h-[156px] w-[156px] items-center justify-center rounded-full border border-white/10"
            style={{
              backgroundColor: theme.colors.backgroundCard,
              shadowColor: theme.colors.secondaryAccent,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 20,
              elevation: 8,
            }}
          >
            <UserIcon
              color={theme.colors.secondaryAccent}
              size={64}
              strokeWidth={1.5}
            />
          </View>
        </View>

        {/* User Info */}
        <View className="mb-16 items-center">
          <Text className="mb-1 text-2xl font-bold text-white text-center">
            {user?.name || 'Sonic User'}
          </Text>
          <Text className="text-base font-medium text-white/70">
            {user?.email || 'user@sonicjam.io'}
          </Text>
        </View>

        {/* Status Badge */}
        <View className="mb-10 flex-row items-center rounded-2xl border border-purple-500/20 bg-purple-500/10 px-5 py-3">
          <ShieldCheck color={theme.colors.secondaryAccent} size={18} />
          <Text
            className="ml-2 text-xs font-bold tracking-widest"
            style={{ color: theme.colors.secondaryAccent }}
          >
            VERIFIED ACCOUNT
          </Text>
        </View>

        {/* Actions */}
        <View className="w-full gap-4">
          <TouchableOpacity
            className="w-full flex-row items-center justify-center rounded-[20px] border border-red-500/20 bg-red-500/10 py-[18px]"
            onPress={logout}
            activeOpacity={0.7}
          >
            <LogOut color="#ef4444" size={20} />
            <Text className="ml-3 text-base font-bold text-red-500">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version Footer */}
        <Text className="mt-12 text-xs font-semibold tracking-widest text-white/50">
          SONIC v{appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
