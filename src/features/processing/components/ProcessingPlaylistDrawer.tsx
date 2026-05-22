import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useBottomSheet } from "@/features/drawer";
import { useLibrary } from "@/features/library/hooks/useLibrary";
import { useToast } from "@/hooks/useToast";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Check, ListMusic } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";

type ProcessingPlaylistDrawerProps = {
  songId: string;
  songTitle: string;
};

export default function ProcessingPlaylistDrawer({
  songId,
  songTitle,
}: ProcessingPlaylistDrawerProps) {
  const { close } = useBottomSheet();
  const toast = useToast();
  const { playlists: userPlaylist, isLoading: isLoadingUserPlaylists, addSongToPlaylist, isAdding: isAddingToPlaylist } = useLibrary();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const handleAdd = useCallback(
    async (playlistId: string, playlistName: string) => {
      setSelectedPlaylistId(playlistId);

      try {
        await addSongToPlaylist({ playlistId, songId });
        toast.success(`Added ${songTitle} to ${playlistName}`);
        close();
      } catch {
        toast.error("Couldn't add song to playlist");
        setSelectedPlaylistId(null);
      }
    },
    [addSongToPlaylist, close, songId, songTitle, toast]
  );

  return (
    <View className="flex-1 px-5 pb-6 pt-2">
      <View className="mb-4">
        <Text className="text-xl font-bold text-foreground">Add to playlist</Text>
        <Text className="mt-1 text-sm text-muted-foreground" numberOfLines={1}>
          {songTitle}
        </Text>
      </View>

      {isLoadingUserPlaylists ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color="#818cf8" />
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

            return (
              <TouchableOpacity
                activeOpacity={0.75}
                disabled={isAddingToPlaylist}
                onPress={() => handleAdd(item.id, item.name)}
                className="flex-row items-center justify-between border-b border-border/50 py-4"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    {item.songCount ?? 0} songs
                  </Text>
                </View>
                {isBusy ? (
                  <ActivityIndicator color="#818cf8" />
                ) : isSelected ? (
                  <Icon as={Check} size={18} className="text-indigo-400" />
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
