import React from 'react';
import { ScrollView, Pressable, View, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { LogOut, User as UserIcon, Mail, Code, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/ui/icon';
import Animated from 'react-native-reanimated';
import AnimatedPressable from '@/components/AnimatedPressable';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  const router = useRouter();

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
        <Text className="text-xl font-display text-foreground">Account</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 110, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View className="mb-[18px] h-[120px] w-[120px] items-center justify-center rounded-full border border-muted bg-accent/20">
          <UserIcon color="#fbbf24" size={52} strokeWidth={1.4} />
        </View>

        {/* User info */}
        <Text className="mb-1 text-center text-[22px] font-display  text-foreground">
          {user?.name || 'Sonic User'}
        </Text>
        <Text className="mb-8 font-heading text-center text-[13px] text-muted-foreground">
          {user?.email || 'user@sonicjam.io'}
        </Text>

        {/* Verified badge */}
        <View className="mb-10 flex-row items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-4 py-1.5">
          <View className="h-1.5 w-1.5 rounded-full bg-amber-300" />
          <Text className="text-[10px] font-heading-medium uppercase text-amber-300">
            Verified Account
          </Text>
        </View>

        {/* Divider */}
        <View className="mb-6 h-px w-full bg-white/[0.04]" />

        {/* Section label */}
        <Text className="mb-3 w-full text-[10px] font-heading-medium uppercase text-muted-foreground">
          Details
        </Text>

        {/* Name row */}
        <View className="mb-2.5 w-full flex-row items-center gap-3.5 rounded-2xl border border-muted bg-card px-[18px] py-4">
          <View className="h-9 w-9 items-center justify-center rounded-[10px] border border-muted bg-card">
            <Icon as={UserIcon} className='text-foreground' size={16} strokeWidth={1.8} />
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-semibold text-foreground">Full name</Text>
            <Text className="mt-0.5 text-[12px] text-muted-foreground">
              {user?.name || 'Sonic User'}
            </Text>
          </View>
        </View>

        {/* Email row */}
        <View className="mb-2.5 w-full flex-row items-center gap-3.5 rounded-2xl border border-muted bg-card px-[18px] py-4">
          <View className="h-9 w-9 items-center justify-center rounded-[10px] border border-muted bg-card">
            <Icon as={Mail} className='text-foreground' size={16} strokeWidth={1.8} />
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-semibold text-foreground">Email</Text>
            <Text className="mt-0.5 text-[12px] text-muted-foreground">
              {user?.email || 'user@sonicjam.io'}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View className="mb-6 h-px w-full bg-white/[0.04]" />


        {/* More section */}
        <Text className="mb-3 w-full text-[10px] font-heading-medium uppercase text-muted-foreground">
          More
        </Text>

        {/* Meet the dev row */}
        <AnimatedPressable
          onPress={() => router.push('/about/developers')}
          className="mb-6 w-full flex-row items-center gap-3.5 rounded-2xl border border-muted bg-card px-[18px] py-4 "
          feedback="timing"
          pressedOpacity={0.75}
          scaleTo={0.98}
        >
          <View className="h-9 w-9 items-center justify-center rounded-[10px] border border-amber-300/15 bg-amber-300/[0.07]">
            <Icon as={Code} className='text-amber-300' size={16} strokeWidth={1.8} />
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-heading-medium text-amber-300">Meet the dev</Text>
            <Text className="mt-0.5 text-[12px] text-muted-foreground/50">Built with love & too much coffee</Text>
          </View>
          <Icon as={ChevronRight} className='text-muted-foreground' size={16} strokeWidth={1.8} />
        </AnimatedPressable>


        <View className="mb-6 h-px w-full bg-white/[0.04]" />


        {/* Sign out */}
        <AnimatedPressable
          onPress={logout}
          className="mb-6 flex-row  items-center gap-2.5"
          feedback="timing"
          pressedOpacity={0.75}
          scaleTo={0.98}
          pressableStyle={{ width: '100%' }}
        >
          <Icon as={LogOut} className='text-red-600' size={16} strokeWidth={2} />

          <Text className="text-[14px] font-bold text-red-600">
            Sign Out
          </Text>
        </AnimatedPressable>


        {/* Version */}
        <Text className="text-[10px] font-bold uppercase tracking-[3px] text-muted">
          SONIC v{appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}