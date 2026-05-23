import React, { memo, useCallback } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
  PlusCircle,
  Repeat,
  Timer,
} from "lucide-react-native";
import { Icon } from "@/components/ui/icon";
import Animated from "react-native-reanimated";
import { usePlaybackStore, type Song } from "@/features/playback";
import { PlayerSeek } from "./PlayerSeek";
import { PlaybackLoadingIndicator } from "./PlaybackLoadingIndicator";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import ProcessingPlaylistDrawer from "@/features/library/components/AddToPlaylistDrawer";
import { useBottomSheet } from "@/features/drawer";
import type { ExtendedRepeatMode } from "../types";
import { SleepTimerDrawer } from "./SleepTimerDrawer";
import AddToPlaylistDrawer from "@/features/library/components/AddToPlaylistDrawer";

interface PlayerControlsProps {
  currentSong: Song;
  isPlaying: boolean;
  status: string;
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  repeatMode: ExtendedRepeatMode;
  onToggleRepeat: () => void;
  animatedStyle?: any;
}

export const PlayerControls = memo(function PlayerControls({
  currentSong,
  isPlaying,
  status,
  onToggle,
  onNext,
  onPrev,
  repeatMode,
  onToggleRepeat,
  animatedStyle,
}: PlayerControlsProps) {
  const { open } = useBottomSheet();
  const sleepTimer = usePlaybackStore((state) => state.sleepTimer);

  const handleOpenAddToPlaylist = useCallback(() => {
    if (currentSong) {
      open(
        <AddToPlaylistDrawer
          songId={currentSong.id}
          title={currentSong.trackName}
          subtitle={currentSong.artists?.map((a: any) => a.name).join(", ")}
          image={currentSong.image}
        />,
        ["55%", "82%"],
      );
    }
  }, [currentSong, open]);

  const handleOpenSleepTimer = useCallback(() => {
    open(<SleepTimerDrawer />, ["62%"]);
  }, [open]);

  return (
    <Animated.View className="w-full pt-2" style={animatedStyle}>
      {/* 1. Meta Info & Action Row */}
      <View className="mb-2 flex-row items-center justify-between px-1">
        <View className="flex-1 pr-2.5">
          <Text
            className="text-[22px] font-bold tracking-tight text-foreground"
            numberOfLines={1}
          >
            {currentSong.trackName}
          </Text>
          <Text
            className="mt-0.5 text-[15px] font-medium text-foreground/50"
            numberOfLines={1}
          >
            {currentSong.artists?.map((a: any) => a.name).join(", ")}
          </Text>
        </View>

        <View className="flex-row items-center gap-4">

          <TouchableOpacity
            className="items-center justify-center"
            onPress={handleOpenAddToPlaylist}
          >
            <Icon
              as={PlusCircle}
              className="text-foreground opacity-80"
              size={30}
              strokeWidth={1.5}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Seek Bar */}
      <View className="mt-1">
        <PlayerSeek />
      </View>

      {/* 3. Main Playback Controls */}
      <View className="mt-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={onToggleRepeat}
          className="h-11 w-11 items-center justify-center"
        >
          <Icon
            as={Repeat}
            className={
              repeatMode === "track"
                ? "text-amber-300"
                : "text-muted-foreground"
            }
            size={22}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPrev}
          className="h-12 w-12 items-center justify-center"
        >
          <Icon
            as={SkipBack}
            className="text-foreground fill-foreground"
            size={30}
          />
        </TouchableOpacity>

        <AnimatedPressable
          onPress={onToggle}
          pressableStyle={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "white",
            alignItems: "center",
            justifyContent: "center",
          }}
          scaleTo={0.9}
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <PlaybackLoadingIndicator color="black" size={32} />
          ) : isPlaying ? (
            <Icon as={Pause} className="text-black fill-black" size={32} />
          ) : (
            <Icon as={Play} className="text-black fill-black ml-1" size={32} />
          )}
        </AnimatedPressable>

        <TouchableOpacity
          onPress={onNext}
          className="h-12 w-12 items-center justify-center"
        >
          <Icon
            as={SkipForward}
            className="text-foreground fill-foreground"
            size={30}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleOpenSleepTimer}
          className="h-11 w-11 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Open sleep timer"
        >
          <Icon
            as={Timer}
            className={sleepTimer ? "text-amber-300" : "text-muted-foreground"}
            size={22}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});
