import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { AddSongPayload, musicApi, PlayListReqPayLoad } from "../api/musicApi";
import { fetchVideoDetails } from "../services/youtube";

type UseMusicOptions = {
  playlistId?: string | null;
};

export function useMusic(options: UseMusicOptions = {}) {
  const queryClient = useQueryClient();
  const playlistId = options.playlistId ?? null;

  const allSongsQuery = useQuery({
    queryKey: ["allSongs"],
    queryFn: musicApi.getAllSongs,
  });

  const getUserPlaylistsQuery = useQuery({
    queryKey: ["userPlaylists"],
    queryFn: musicApi.getUserPlaylists,
  });

  const getPlaylistSongsQuery = useQuery({
    queryKey: ["playlistSongs", playlistId],
    queryFn: () => musicApi.getPlaylistSongs(playlistId as string),
    enabled: !!playlistId,
  });

  const createPlaylistMutation = useMutation({
    mutationFn: async (payload: PlayListReqPayLoad) => {
      return await musicApi.addPlayList(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: async (playlistId: string) => {
      return await musicApi.deletePlaylist(playlistId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
    },
  });

  // 🚀 Add Song Mutation
  const addSongMutation = useMutation({
    mutationFn: async (videoId: string) => {
      // Step 1: Fetch full details if needed (duration is mandatory for backend)
      const details = await fetchVideoDetails(videoId);
      if (!details) throw new Error("Video not found");

      const payload: AddSongPayload = {
        youtubeId: videoId,
        title: details.title,
        duration: details.duration || 180,
      };

      return musicApi.addSong(payload);
    },
    onSuccess: () => {
      // Invalidate library on success
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });

  const removeSongFromPlaylistMutation = useMutation({
    mutationFn: async ({ playlistId, songId }: { playlistId: string; songId: string }) => {
      return await musicApi.removeSongFromPlaylist(playlistId, songId);
    },
    onMutate: async ({ playlistId, songId }) => {
      await queryClient.cancelQueries({ queryKey: ["playlistSongs", playlistId] });
      const previousSongs = queryClient.getQueryData(["playlistSongs", playlistId]);

      queryClient.setQueryData(["playlistSongs", playlistId], (old: any) => {
        return old?.filter((s: any) => s.id !== songId);
      });

      return { previousSongs };
    },
    onError: (err, { playlistId }, context) => {
      if (context?.previousSongs) {
        queryClient.setQueryData(["playlistSongs", playlistId], context.previousSongs);
      }
    },
    onSettled: (data, err, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ["playlistSongs", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
    },
  });

  // 🎧 Stream URL Mutation (Fetch fresh on play)
  const streamMutation = useMutation({
    mutationFn: async (songId: string) => {
      try {
        const response = await musicApi.getStreamUrl(songId);
        return response.streamUrl;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          throw new Error(
            "Access Denied: You must add this song to your library first.",
          );
        }
        throw error;
      }
    },
  });

  return {
    allSongs: allSongsQuery.data ?? [],
    refetchAllSongs: allSongsQuery.refetch,
    isFetchingSongs: allSongsQuery.isFetching,
    isLoadingAllSongs: allSongsQuery.isLoading,

    userPlaylist: getUserPlaylistsQuery.data ?? [],
    refetchUserPlaylists: getUserPlaylistsQuery.refetch,
    isFetchingUserPlaylists: getUserPlaylistsQuery.isFetching,
    isLoadingUserPlaylists: getUserPlaylistsQuery.isLoading,

    playlistSongs: getPlaylistSongsQuery.data ?? [],
    refetchPlaylistSongs: getPlaylistSongsQuery.refetch,
    isFetchingPlaylistSongs: getPlaylistSongsQuery.isFetching,
    isLoadingPlaylistSongs: getPlaylistSongsQuery.isLoading,

    createPlaylist: createPlaylistMutation.mutateAsync,
    isCreatingPlaylist: createPlaylistMutation.isPending,

    deletePlaylist: deletePlaylistMutation.mutateAsync,
    isDeletingPlaylist: deletePlaylistMutation.isPending,

    isAdding: addSongMutation.isPending,
    addSong: addSongMutation.mutateAsync,
    removeSongFromPlaylist: removeSongFromPlaylistMutation.mutateAsync,
    isRemoving: removeSongFromPlaylistMutation.isPending,
    libraryError: allSongsQuery.error,

    // Streaming
    getStreamUrl: streamMutation.mutateAsync,
    isStreaming: streamMutation.isPending,
    streamError: streamMutation.error,
  };
}
