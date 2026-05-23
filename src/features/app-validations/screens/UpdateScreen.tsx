import React, { useEffect, useRef } from 'react';
import { StatusBar, Text, View, Animated, Easing, Pressable, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVersionStore } from '../store/versionStore';
import { Image } from 'expo-image';

interface UpdateScreenProps {
  isOptional: boolean;
  isOta?: boolean;
  onSkip?: () => void;
  onLater?: () => void;
}

export const UpdateScreen = ({ isOptional, isOta = false, onSkip, onLater }: UpdateScreenProps) => {
  const { nativeVersion, nativeWhatsNew, nativeMessage, updateUrl, startOtaUpdate } = useVersionStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const latestVersion = nativeVersion || "1.0.0";
  const displayMessage = nativeMessage || "We've tuned the playback engine, squashed some bugs, and made things feel snappier. Worth it.";
  const whatsNew = (nativeWhatsNew && nativeWhatsNew.length > 0)
    ? nativeWhatsNew
    : ["New features and improvements"];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleUpdate = () => {
    if (isOta) {
      // Trigger foreground OTA update
      startOtaUpdate();
    } else if (updateUrl) {
      Linking.openURL(updateUrl).catch(console.error);
    } else {
      alert("Update URL is currently not available. Please try again later.");
    }
  };

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <SafeAreaView className="flex-1">
        <ScrollView>



          {/* Skip — top right, only when optional */}
          {isOptional && (
            <View className="items-end px-5 pt-3">
              <Pressable
                onPress={onSkip}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                {({ pressed }) => (
                  <Text
                    className="text-sm font-semibold text-neutral-700"
                    style={{ opacity: pressed ? 0.5 : 1 }}
                  >
                    Skip
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          <Animated.View
            className="flex-1 items-center justify-center px-7 pb-12"
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          >
            {/* Icon card */}
            <Image
              source={require('../../../../assets/images/upgrade.png')}
              style={{ width: 220, height: 220 }}
              contentFit="contain"
            />

            {/* Version badge */}
            <View className="mb-5 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-1">
              <Text className="text-[11px] font-sans-bold uppercase tracking-[1px] text-amber-300">
                {latestVersion ? `v${latestVersion} available` : 'Update available'}
              </Text>
            </View>

            {/* Headline */}
            <Text className="mb-3.5 text-center text-[26px] font-display text-stone-100">
              A  fresh  update{'\n'}just  dropped
            </Text>

            {/* Subtitle */}
            <Text className="mb-9 max-w-[270px] text-center text-sm text-neutral-700 font-heading">
              {displayMessage}
            </Text>

            {/* What's new card */}
            {whatsNew && whatsNew.length > 0 && (
              <View className="mb-8 w-full rounded-2xl border border-white/[0.06] bg-white/[0.025] px-5 py-4">
                <Text className="mb-3 text-[11px] font-heading uppercase text-neutral-800">
                  What's new
                </Text>
                <View className="gap-2.5">
                  {whatsNew.map((item, i) => (
                    <View key={i} className="flex-row items-start gap-2.5">
                      <Text className="mt-0.5 text-amber-300" style={{ fontSize: 13 }}>✦</Text>
                      <Text className="flex-1 text-[13px] font-sans leading-relaxed text-neutral-600">
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Update CTA */}
            <Pressable
              onPress={handleUpdate}
              className="mb-3 w-full rounded-2xl bg-amber-300 py-[17px]"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Text className="text-center text-[15px] font-display text-[#0a0a0a]">
                Update  now
              </Text>
            </Pressable>

            {/* Later — only when optional */}
            {isOptional && (
              <Pressable
                onPress={onLater}
                className="w-full rounded-2xl border border-white/[0.06] py-[15px]"
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text className="text-center text-sm font-display text-neutral-600">
                  Maybe later
                </Text>
              </Pressable>
            )}
          </Animated.View>

        </ScrollView>

      </SafeAreaView>
    </View>
  );
};