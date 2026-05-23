import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, TouchableOpacity, ActivityIndicator, Share } from "react-native";
import { Text } from "@/components/ui/text";
import { Image } from "expo-image";
import { MoreVertical, Music2, X, Play, SkipForward, ListMusic, Share2 } from "lucide-react-native";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteHistory } from "../hooks/useHistory";
import { Icon } from "@/components/ui/icon";
import { ListeningEvent } from "../types";
import { CleanedSearchResult } from "@/features/search";
import { useBottomSheet } from "@/features/drawer";
import { OptionsDrawer } from "@/features/drawer/components/OptionsDrawer";
import { usePlayer } from "@/features/playback/hooks/usePlayer";
import * as Haptics from "expo-haptics";




type HistorySongCardProps = {
  onPress: (event: any) => void;
  onRemove?: () => void | Promise<void>;
} & (
    | { event: ListeningEvent; song?: never }
    | { song: CleanedSearchResult; event?: never }
  );







const formatPlayedAt = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const HistorySongCard = React.memo((props: HistorySongCardProps) => {
  const { onPress, onRemove, event, song } = props;

  const trackName = event ? event.song.trackName : song?.title ?? "";
  const artistName = event
    ? (event.song.artists ? event.song.artists.map((a: { name: string }) => a.name).join(", ") : "")
    : song?.artist ?? "";
  const imageUri = event ? event.song.image : song?.artwork;
  const playedAt = event?.playedAt;

  const { open, close } = useBottomSheet();
  const { playNext, addToQueue } = usePlayer();

  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: deleteEvent, isPending: isDeletePending } = useDeleteHistory();
  const [isLocalPending, setIsLocalPending] = useState(false);

  const isPending = isDeletePending || isLocalPending;

  // Latest Ref Pattern to avoid unnecessary re-renders
  const onPressRef = useRef(onPress);
  useEffect(() => {
    onPressRef.current = onPress;
  });

  const handlePress = useCallback(() => {
    onPressRef.current?.(event ?? song);
  }, [event, song]);

  const handlePlayNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    const trackData = event
      ? {
        externalId: event.song.id,
        trackName: event.song.trackName,
        artistName: event.song.artists?.map((a: { name: string }) => a.name).join(", ") ?? "",
        image: event.song.image,
        duration: 0,
      }
      : {
        externalId: song?.id ?? "",
        trackName: song?.title ?? "",
        artistName: song?.artist ?? "",
        image: song?.artwork,
        duration: typeof song?.duration === "string" ? parseInt(song.duration, 10) : song?.duration ?? 0,
      };
    await playNext(trackData);
  }, [playNext, event, song]);

  const handleAddToQueue = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    const trackData = event
      ? {
        externalId: event.song.id,
        trackName: event.song.trackName,
        artistName: event.song.artists?.map((a: { name: string }) => a.name).join(", ") ?? "",
        image: event.song.image,
        duration: 0,
      }
      : {
        externalId: song?.id ?? "",
        trackName: song?.title ?? "",
        artistName: song?.artist ?? "",
        image: song?.artwork,
        duration: typeof song?.duration === "string" ? parseInt(song.duration, 10) : song?.duration ?? 0,
      };
    await addToQueue(trackData);
  }, [addToQueue, event, song]);






  const handleOpenOptions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

    const currentActions = onPressRef.current !== undefined
      ? [
        {
          label: "Play",
          icon: <Icon as={Play} size={18} className="mr-2" />,
          onPress: handlePress,
        },
        {
          label: "Play Next",
          icon: <Icon as={SkipForward} size={18} className="mr-2" />,
          onPress: () => {
            handlePlayNext();
            close();
          },
        },
        {
          label: "Add to Queue",
          icon: <Icon as={ListMusic} size={18} className="mr-2" />,
          onPress: () => {
            handleAddToQueue();
            close();
          }
        },
        {
          label: "Share",
          icon: <Icon as={Share2} size={18} className="mr-2" />,
          onPress: () => { },
        }
      ]
      : [];

    requestAnimationFrame(() => {
      open(
        <OptionsDrawer
          image={imageUri}
          title={trackName}
          subtitle={artistName}
          actions={currentActions}
        />
      );
    });
  }, [handlePress, handlePlayNext, handleAddToQueue, close, open, imageUri, trackName, artistName]);

  const handleDelete = async () => {
    try {
      if (onRemove) {
        setIsLocalPending(true);
        await onRemove();
        setIsLocalPending(false);
      } else {
        if (event && event.id) {
          await deleteEvent(event.id);
        }
      }
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      setIsLocalPending(false);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(event ?? song)}
      className="flex-row items-center px-4 py-3 w-full"
    >
      <View className="w-14 h-14 bg-secondary/50 overflow-hidden mr-4 rounded-md">
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Icon as={Music2} size={28} className="text-primary" />
          </View>
        )}
      </View>

      <View className="flex-1 justify-center mr-2">
        <Text numberOfLines={1} className="text-base text-foreground font-display mb-0.5">
          {trackName}
        </Text>
        <Text numberOfLines={1} className="text-[13px] text-muted-foreground">
          {`Song • ${artistName}`}
        </Text>
        {playedAt && (
          <Text numberOfLines={1} className="text-[12px] text-muted-foreground/80 mt-1">
            {formatPlayedAt(playedAt)}
          </Text>
        )}
      </View>

      <View className="flex-row items-center -mr-2">
        <TouchableOpacity className="p-2" onPress={(e) => { e.stopPropagation?.(); handleOpenOptions(); }}>
          <MoreVertical size={20} color="#9ca3af" />
        </TouchableOpacity>
        {song ? (
          <TouchableOpacity className="p-2" onPress={handleDelete} disabled={isPending}>
            {isPending ? (
              <ActivityIndicator size="small" color="#9ca3af" />
            ) : (
              <X size={20} color="#9ca3af" />
            )}
          </TouchableOpacity>
        ) : (
          <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
              <TouchableOpacity className="p-2">
                <X size={20} color="#9ca3af" />
              </TouchableOpacity>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove from history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove "{trackName}" from your listening history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>
                  <Text>Cancel</Text>
                </AlertDialogCancel>
                <Button onPress={handleDelete} disabled={isPending}>
                  {isPending && <ActivityIndicator size="small" color="#000" className="mr-2" />}
                  <Text>{isPending ? "Deleting..." : "Delete"}</Text>
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </View>
    </TouchableOpacity>
  );
});

HistorySongCard.displayName = "HistorySongCard";
export default HistorySongCard;
