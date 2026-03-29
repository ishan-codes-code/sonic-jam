import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AddSongPayload, musicApi } from '../api/musicApi';
import { fetchVideoDetails } from '../services/youtube';

export function useMusic() {
  const queryClient = useQueryClient();

  // 📁 Library Query
  const libraryQuery = useQuery({
    queryKey: ['library'],
    queryFn: musicApi.getLibrary,
  });

  // 🚀 Add Song Mutation
  const addSongMutation = useMutation({
    mutationFn: async (videoId: string) => {
      // Step 1: Fetch full details if needed (duration is mandatory for backend)
      const details = await fetchVideoDetails(videoId);
      if (!details) throw new Error('Video not found');

      const payload: AddSongPayload = {
        youtubeId: videoId,
        title: details.title,
        duration: details.duration || 180,
      };

      return musicApi.addSong(payload);
    },
    onSuccess: () => {
      // Invalidate library on success
      queryClient.invalidateQueries({ queryKey: ['library'] });
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
          throw new Error('Access Denied: You must add this song to your library first.');
        }
        throw error;
      }
    },
  });

  return {
    library: libraryQuery.data ?? [],
    isLoadingLibrary: libraryQuery.isLoading,
    isAdding: addSongMutation.isPending,
    addSong: addSongMutation.mutateAsync,
    libraryError: libraryQuery.error,

    // Streaming
    getStreamUrl: streamMutation.mutateAsync,
    isStreaming: streamMutation.isPending,
    streamError: streamMutation.error,
  };
}
