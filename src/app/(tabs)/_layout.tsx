import { Download, Home, Library, Search, User } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Tabs, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/text';

// ─── Design tokens ────────────────────────────────────────────────────────────

const ACTIVE_COLOR = '#FFFFFF';
const INACTIVE_COLOR = '#E6E6E6';

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { name: 'home', route: '/(tabs)/home', label: 'Home', Icon: Home },
  { name: 'search', route: '/(tabs)/search', label: 'Search', Icon: Search },
  { name: 'library', route: '/(tabs)/library', label: 'Library', Icon: Library },
  { name: 'processing', route: '/(tabs)/processing', label: 'Downloads', Icon: Download },
  // { name: 'profile', route: '/(tabs)/profile', label: 'Profile', Icon: User },
] as const;

// ─── Animated Tab Item ────────────────────────────────────────────────────────

function TabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: (typeof TABS)[number];
  isActive: boolean;
  onPress: () => void;
}) {
  const { Icon } = tab;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: isActive ? 1 : 0.96,
        duration: 200,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: isActive ? 1 : 0.5,
        duration: 200,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.label}
      className="flex-1 items-center justify-center py-1"
    >
      {/* scale + opacity must stay inline — Tailwind can't express Animated values */}
      <Animated.View
        className="items-center justify-center gap-1"
        style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}
      >
        <Icon
          size={23}
          color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
          strokeWidth={isActive ? 2.5 : 1.8}
        />
        <Text
          className="text-[10px] tracking-[0.15px] font-display"
          style={{
            color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
            fontWeight: isActive ? '700' : '400',
          }}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Spotify-style Tab Bar ────────────────────────────────────────────────────

function SpotifyTabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <View
      className="absolute bottom-0 left-0 right-0"
      style={{
        // We keep a subtle shadow so icons stay visible over light content
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
      }}
    >
      <LinearGradient
        // The gradient now starts much higher, providing a smoother fade
        colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View
        className="flex-row pt-14 px-1"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        {TABS.map((tab) => (
          <TabItem
            key={tab.name}
            tab={tab}
            isActive={pathname.includes(tab.name)}
            onPress={() => router.push(tab.route as any)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => <SpotifyTabBar />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="processing" />
      <Tabs.Screen name="profile/index" options={{ href: null }} />
      <Tabs.Screen name="collections/[id]" options={{ href: null }} />
    </Tabs>
  );
}