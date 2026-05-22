import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { libraryApi } from "../api/library.api";
import type { PlayListReqPayload } from "../types";

export function useLibrary() {
  const queryClient = useQueryClient();

  const playlistsQuery = useQuery({
    queryKey: ["userPlaylists"],
    queryFn: libraryApi.getUserPlaylists,
  });

  const createPlaylistMutation = useMutation({
    mutationFn: libraryApi.createPlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: libraryApi.deletePlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
    },
  });

  const updatePlaylistMutation = useMutation({
    mutationFn: ({ playlistId, payload }: { playlistId: string; payload: Partial<PlayListReqPayload> }) =>
      libraryApi.updatePlaylist(playlistId, payload),
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ["playlistSongs", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
    },
  });

  const addSongToPlaylistMutation = useMutation({
    mutationFn: libraryApi.addSongToPlaylist,
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ["playlistSongs", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
    },
  });

  return {
    playlists: playlistsQuery.data ?? [],
    isLoading: playlistsQuery.isLoading,
    isFetching: playlistsQuery.isFetching,
    refetch: playlistsQuery.refetch,

    createPlaylist: createPlaylistMutation.mutateAsync,
    isCreating: createPlaylistMutation.isPending,

    updatePlaylist: updatePlaylistMutation.mutateAsync,
    isUpdating: updatePlaylistMutation.isPending,

    deletePlaylist: deletePlaylistMutation.mutateAsync,
    isDeleting: deletePlaylistMutation.isPending,

    addSongToPlaylist: addSongToPlaylistMutation.mutateAsync,
    isAdding: addSongToPlaylistMutation.isPending,
  };
}
