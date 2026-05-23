import React, { memo, useCallback, useState, useEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import TrackPlayer from "@rntp/player";
import { Text } from "@/components/ui/text";
import { useBottomSheet } from "@/features/drawer";
import { useToast } from "@/features/Toast/hooks/useToast";
import { usePlaybackStore, usePlayer } from "@/features/playback";

type SleepTimerOption =
  | {
    type: "time";
    id: string;
    label: string;
    seconds: number;
  }
  | {
    type: "track";
    id: "end-of-track";
    label: string;
  };

const FADE_OUT_SECONDS = 30;

const SLEEP_TIMER_OPTIONS: SleepTimerOption[] = [
  { type: "time", id: "5-min", label: "5 minutes", seconds: 5 * 60 },
  { type: "time", id: "10-min", label: "10 minutes", seconds: 10 * 60 },
  { type: "time", id: "15-min", label: "15 minutes", seconds: 15 * 60 },
  { type: "time", id: "30-min", label: "30 minutes", seconds: 30 * 60 },
  { type: "time", id: "45-min", label: "45 minutes", seconds: 45 * 60 },
  { type: "time", id: "60-min", label: "1 hour", seconds: 60 * 60 },
  { type: "track", id: "end-of-track", label: "End of track" },
];


const TimerOptionItem = memo(({
  option,
  isActive,
  onPress,
}: {
  option: SleepTimerOption;
  isActive: boolean;
  onPress: (option: SleepTimerOption) => void;
}) => {
  const handlePress = useCallback(() => {
    onPress(option);
  }, [onPress, option]);

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`Set sleep timer for ${option.label}`}
      onPress={handlePress}
      className="min-h-[56px] justify-center py-2"
    >
      <Text className={`text-lg font-medium ${isActive ? 'text-amber-300' : 'text-white'}`}>
        {option.label}
      </Text>
    </TouchableOpacity>
  );
});


export const SleepTimerDrawer = memo(function SleepTimerDrawer() {
  const { close } = useBottomSheet();
  const toast = useToast();
  const { syncSleepTimer } = usePlayer();
  const sleepTimer = usePlaybackStore((state) => state.sleepTimer);
  const setSleepTimer = usePlaybackStore((state) => state.setSleepTimer);
  useEffect(() => {
    syncSleepTimer();
    const interval = setInterval(() => {
      syncSleepTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [syncSleepTimer]);

  const activeLabel = React.useMemo(() => {
    if (!sleepTimer) return null;
    if (sleepTimer.type === "track") return "Timer set for end of track";
    if (sleepTimer.remainingSeconds !== undefined) {
      const minutes = Math.max(1, Math.ceil(sleepTimer.remainingSeconds / 60));
      return `${minutes} min remaining`;
    }
    return null;
  }, [sleepTimer]);

  const isOptionActive = useCallback((option: SleepTimerOption): boolean => {
    if (!sleepTimer) return false;
    if (option.type === "track" && sleepTimer.type === "track") return true;
    if (option.type === "time" && sleepTimer.type === "time") {
      if (sleepTimer.seconds !== undefined) {
        return sleepTimer.seconds === option.seconds;
      }
      if (sleepTimer.remainingSeconds !== undefined) {
        const standardSeconds = [300, 600, 900, 1800, 2700, 3600];
        const matched = standardSeconds.find((s) => s >= sleepTimer.remainingSeconds!);
        return matched === option.seconds;
      }
    }
    return false;
  }, [sleepTimer]);

  const handleSelect = useCallback(
    (option: SleepTimerOption) => {
      try {
        if (isOptionActive(option)) {
          TrackPlayer.cancelSleepTimer?.();
          setSleepTimer(null);
          toast.success("Sleep timer turned off");
          close();
          return;
        }

        if (option.type === "time") {
          TrackPlayer.sleepAfterTime(option.seconds, {
            fadeOutSeconds: FADE_OUT_SECONDS,
          });
          setSleepTimer({
            type: "time",
            seconds: option.seconds,
            remainingSeconds: option.seconds,
          });
        } else {
          TrackPlayer.sleepAfterMediaItemAtIndex();
          setSleepTimer({ type: "track" });
        }

        toast.success(`Sleep timer set: ${option.label}`);
        close();
      } catch (error) {
        console.error("[SleepTimerDrawer] Failed to set sleep timer:", error);
        toast.error("Couldn't set sleep timer");
      }
    },
    [isOptionActive, setSleepTimer, close, toast],
  );

  return (
    <View className="flex-1 bg-[#1A1A1C] px-5 pb-8 pt-3">
      <View className="mb-4 items-center border-b border-white/10 pb-5">
        <Text className="text-2xl font-display text-foreground">
          Sleep Timer
        </Text>
        {activeLabel && (
          <Text className="mt-2 text-xs font-medium text-white/50">
            {activeLabel}
          </Text>
        )}
      </View>

      <View>
        {SLEEP_TIMER_OPTIONS.map((option) => (
          <TimerOptionItem
            key={option.id}
            option={option}
            isActive={isOptionActive(option)}
            onPress={handleSelect}
          />
        ))}
      </View>
    </View>
  );
});
