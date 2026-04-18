import { apiClient } from '../api/apiClient';
import { Artist } from '../playbackCore/types';

export interface RecommendationTrack {
  title: string;
  artist: string;
  image: string | null;
  duration?: number | null;
}

/**
 * Fetches song recommendations based on a seed song.
 * Pure API layer, returns an empty array on error.
 */
export const getRecommendations = async (params: {
  title: string;
  artists: Artist[];
  limit?: number;
}): Promise<RecommendationTrack[]> => {
  try {
    // The apiClient interceptor will automatically attach the Bearer token.
    const { data } = await apiClient.get('/recommendations', { 
      params: {
        ...params,
        artists: JSON.stringify(params.artists),
      },
    });

    const recommendations = (data || []).map((item: any) => {
      return {
        title: item.trackName || item.title,
        artist: item.artistName || item.artist || 'Unknown',
        image: item.image,
        duration: item.duration,
      };
    });

    return recommendations;
  } catch (error: any) {
    if (error?.response?.status === 429) {
        console.warn('[recommendationService] Rate limited (429). Returning empty.');
    } else {
        console.error('[recommendationService] Error fetching recommendations:', error?.response?.status || error.message);
    }
    return [];
  }
};
