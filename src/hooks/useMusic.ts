import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AddSongToPlaylistPayload,
  musicApi,
  PlayListReqPayLoad,
} from "../api/musicApi";
import { getRecommendations } from "../services/recommendationService";

type UseMusicOptions = {
  playlistId?: string | null;
  recommendationSeed?: { title: string; artist: string } | null;
  genre?: string | null;
};

export function useMusic(options: UseMusicOptions = {}) {
  const queryClient = useQueryClient();
  const playlistId = options.playlistId ?? null;
  const recommendationSeed = options.recommendationSeed ?? null;
  const genre = options.genre ?? null;



  const getGenreSongsQuery = useQuery({
    queryKey: ["genreSongs", genre],
    queryFn: () => musicApi.getGenreTracks(genre as string),
    enabled: !!genre,
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

  const recommendationsQuery = useQuery({
    queryKey: ["recommendations", recommendationSeed?.title, recommendationSeed?.artist],
    queryFn: () => getRecommendations({
      title: recommendationSeed!.title,
      artist: recommendationSeed!.artist,
      limit: 10
    }),
    enabled: !!recommendationSeed?.title && !!recommendationSeed?.artist,
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

  const removeSongFromPlaylistMutation = useMutation({
    mutationFn: async ({
      playlistId,
      songId,
    }: {
      playlistId: string;
      songId: string;
    }) => {
      return await musicApi.removeSongFromPlaylist(playlistId, songId);
    },
    onMutate: async ({ playlistId, songId }) => {
      await queryClient.cancelQueries({
        queryKey: ["playlistSongs", playlistId],
      });
      const previousSongs = queryClient.getQueryData([
        "playlistSongs",
        playlistId,
      ]);

      queryClient.setQueryData(["playlistSongs", playlistId], (old: any) => {
        return old?.filter((s: any) => s.id !== songId);
      });

      return { previousSongs };
    },
    onError: (err, { playlistId }, context) => {
      if (context?.previousSongs) {
        queryClient.setQueryData(
          ["playlistSongs", playlistId],
          context.previousSongs,
        );
      }
    },
    onSettled: (data, err, { playlistId }) => {
      queryClient.invalidateQueries({
        queryKey: ["playlistSongs", playlistId],
      });
      queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
    },
  });

  const addSongToPlaylistMutation = useMutation({
    mutationFn: async (payload: AddSongToPlaylistPayload) => {
      return await musicApi.addSongToPlaylist(payload);
    },
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({
        queryKey: ["playlistSongs", playlistId],
      });
      queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
    },
  });




  return {


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

    addSongToPlaylist: addSongToPlaylistMutation.mutateAsync,
    isAddingToPlaylist: addSongToPlaylistMutation.isPending,
    removeSongFromPlaylist: removeSongFromPlaylistMutation.mutateAsync,
    isRemoving: removeSongFromPlaylistMutation.isPending,



    recommendations: recommendationsQuery.data ?? [],
    isFetchingRecommendations: recommendationsQuery.isFetching,
    isLoadingRecommendations: recommendationsQuery.isLoading,

    genreSongs: getGenreSongsQuery.data ?? [],
    isFetchingGenre: getGenreSongsQuery.isFetching,
    isLoadingGenre: getGenreSongsQuery.isLoading,
    genreError: getGenreSongsQuery.error,
    refetchGenre: getGenreSongsQuery.refetch,
  };
}
