import { apiClient } from "@/api/apiClient";

export interface RecommendationTrack {
  title: string;
  artist: string;
  image?: string | null;
  duration?: number | null;
  lastfmId: string;
  score: number;
}

/**
 * Fetches personalized song recommendations based on recent listening habits.
 */
export const getRecommendations = async (params?: {
  limit?: number;
}): Promise<RecommendationTrack[]> => {
  try {
    // The apiClient interceptor will automatically attach the Bearer token.
    const { data } = await apiClient.get("/recommend", {
      params: {
        limit: params?.limit || 20,
      },
    });

    const recommendations = (data || []).map((item: any) => {
      return {
        title: item.trackName,
        artist: item.artistName,
        image: item.image,
        duration: item.duration,
        lastfmId: item.lastfmId,
        score: item.score,
      };
    });

    console.log("[recommendationApi] Recommendations:", recommendations.length);

    return recommendations;
  } catch (error: any) {
    if (error?.response?.status === 429) {
      console.warn("[recommendationApi] Rate limited (429). Returning empty.");
    } else {
      console.error(
        "[recommendationApi] Error fetching recommendations:",
        error?.response?.status || error.message,
      );
    }
    return [];
  }
};
