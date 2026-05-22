import React, { useState } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Image } from "expo-image";
import { MoreVertical, Music2, X } from "lucide-react-native";
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

// interface HistorySongCardProps {
//   event: {
//     id?: string;
//     song: {
//       id: string;
//       trackName: string;
//       image?: string;
//       artists: { name: string }[];
//     };
//     playedAt?: string;
//   };
//   onPress: (event: any) => void;
//   onRemove?: () => void | Promise<void>;
// }
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

  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: deleteEvent, isPending: isDeletePending } = useDeleteHistory();
  const [isLocalPending, setIsLocalPending] = useState(false);

  const isPending = isDeletePending || isLocalPending;

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
        <TouchableOpacity className="p-2">
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
