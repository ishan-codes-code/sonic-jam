import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useBottomSheet } from "@/features/drawer";
import {
  useLibrary,
  usePlaylistIdsBySong,
} from "@/features/library/hooks/useLibrary";
import { useToast } from "@/features/Toast/hooks/useToast";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Check, ListMusic } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, TouchableOpacity, View } from "react-native";
import { PlaylistArtwork } from "./PlaylistArtwork";

type ProcessingPlaylistDrawerProps = {
  songId: string;
  title: string;
  subtitle: string;
  image: string;
};

export default function AddToPlaylistDrawer({
  songId,
  title,
  subtitle,
  image,
}: ProcessingPlaylistDrawerProps) {
  const { close } = useBottomSheet();
  const toast = useToast();
  const {
    playlists: userPlaylist,
    isLoading: isLoadingUserPlaylists,
    addSongToPlaylist,
    isAdding: isAddingToPlaylist,
  } = useLibrary();
  const { data: playlistIdsWithSong, isLoading: isLoadingPlaylistIds } =
    usePlaylistIdsBySong(songId);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const playlistIdsSet = useMemo(
    () => new Set(playlistIdsWithSong ?? []),
    [playlistIdsWithSong],
  );

  const handleAdd = useCallback(
    async (playlistId: string, playlistName: string) => {
      setSelectedPlaylistId(playlistId);

      try {
        await addSongToPlaylist({ playlistId, songId });
        toast.success(`Added ${title} to ${playlistName}`);
        close();
      } catch {
        toast.error("Couldn't add song to playlist");
        setSelectedPlaylistId(null);
      }
    },
    [addSongToPlaylist, close, songId, title, toast]
  );

  return (
    <View className="flex-1 px-5 pb-6 pt-2">
      <View className='flex-row items-center  pb-4'>
        <View className='w-14 h-14 rounded-sm mr-4'>
          <PlaylistArtwork thumbnailUrl={[image]} />
        </View>
        <View className='flex-1 justify-center gap-1'>
          <Text className='text-[18px] font-display text-foreground' numberOfLines={1}>{title}</Text>
          <Text className='text-sm text-muted-foreground font-sans-medium' numberOfLines={1}>Song • {subtitle}</Text>
        </View>
      </View>

      {/* Divider */}
      <View className='w-full border-b border-muted mb-2' />

      {isLoadingUserPlaylists || isLoadingPlaylistIds ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color="#fbbf24" />
          <Text className="text-sm text-muted-foreground">Loading playlists...</Text>
        </View>
      ) : userPlaylist.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Icon as={ListMusic} size={36} className="text-muted-foreground" />
          <Text className="text-center text-sm text-muted-foreground">
            Create a playlist first, then come back to add this song.
          </Text>
        </View>
      ) : (
        <BottomSheetFlatList
          data={userPlaylist}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const isSelected = selectedPlaylistId === item.id;
            const isBusy = isAddingToPlaylist && isSelected;
            const isAlreadyInPlaylist = playlistIdsSet.has(item.id);

            return (
              <TouchableOpacity
                activeOpacity={0.75}
                disabled={isAddingToPlaylist || isAlreadyInPlaylist}
                onPress={() => handleAdd(item.id, item.name)}
                className={`flex-row items-center justify-between border-b border-border/50 py-4${isAlreadyInPlaylist ? " opacity-50" : ""}`}
              >
                <View className='flex-1 justify-start flex-row items-center '>
                  <View className='w-14 h-14 rounded-sm mr-4'>
                    <PlaylistArtwork thumbnailUrl={item.thumbnailUrl} />
                  </View>
                  <View className='flex-1 justify-center gap-1'>
                    <Text className='text-[18px] font-display text-foreground' numberOfLines={1}>{item.name}</Text>
                    <Text className='text-sm text-muted-foreground font-sans-medium' numberOfLines={1}>Playlist • {item.songCount ?? 0} songs</Text>
                  </View>
                </View>
                {isBusy ? (
                  <ActivityIndicator color="#fbbf24" />
                ) : isAlreadyInPlaylist ? (
                  <Text className="text-xs text-muted-foreground font-sans-medium">Added</Text>
                ) : isSelected ? (
                  <Icon as={Check} size={18} className="text-amber-300" />
                ) : (
                  <Icon as={ListMusic} size={18} className="text-muted-foreground" />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
