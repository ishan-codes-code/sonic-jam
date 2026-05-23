import React, { useEffect, useRef } from 'react';
import { StatusBar, Text, View, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVersionStore } from '../store/versionStore';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AntDesign from '@expo/vector-icons/AntDesign';
import AnimatedPressable from '@/components/AnimatedPressable';
import * as Linking from 'expo-linking';
import { SOCIALS } from '@/features/about/utils/developersSocials';

// const SOCIALS = [
//   { icon: Ionicons, name: 'logo-linkedin', link: "https://www.linkedin.com/in/ishan-srivastava-14309833b" },
//   { icon: AntDesign, name: 'x', link: "https://x.com/itsIshanS" },
//   { icon: Ionicons, name: 'logo-instagram', link: "https://www.instagram.com/srivastava.ishan80" },
//   { icon: AntDesign, name: 'github', link: "https://github.com/ishan-codes-code" },

// ] as const;

export const MaintenanceScreen = () => {
  const { maintenanceMessage } = useVersionStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <SafeAreaView className="flex-1 items-center justify-center px-8">
        <Animated.View
          className="w-full items-center"
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* Logo */}
          <Text
            className="text-4xl text-white font-display mb-10"
          >
            Sonic
          </Text>

          {/* Icon */}
          <Image
            source={require('../../../../assets/images/maintenance.png')}
            style={{ width: 220, height: 220 }}
            contentFit="contain"
          />

          {/* Headline */}
          <Text className="mb-4 text-center text-2xl font-heading  text-white">
            We’re fixing the things we broke while fixing the things we broke.
          </Text>

          {/* Message — only from config */}
          <Text className="mb-14 max-w-[300px] text-center font-sans text-sm text-neutral-700">
            {maintenanceMessage ||
              'Our servers are currently undergoing scheduled maintenance. We will be back shortly. Thank you for your patience.'}
          </Text>

          {/* Socials */}
          <View className="mb-9 flex-row gap-2.5 ">
            {SOCIALS.map(({ icon: Icon, iconName, name, link }) => {
              return (
                <AnimatedPressable
                  key={name}
                  onPress={() => Linking.openURL(link)}
                  hitSlopSize={12}
                  scaleTo={0.82}
                  feedback="snappy"
                  className="h-[42px] w-[42px] items-center justify-center rounded-xl border border-border bg-card"
                >
                  <Icon name={iconName as any} size={17} color="#ccc" />
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Footer */}
          <Text className="mb-3 text-xs font-display text-neutral-800">
            dev.srivastava.ishan@gmail.com
          </Text>
          <Text className="text-[9px] font-heading uppercase tracking-[3px] text-amber-300/60">
            Better Performance · New Features
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};