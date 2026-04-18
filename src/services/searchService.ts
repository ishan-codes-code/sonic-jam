import { apiClient } from '../api/apiClient';

import { Artist } from '../playbackCore/types';

export interface SearchTrack {
  id: string;
  title: string;
  artist: string;
  image: string | null;
}

export const searchTracks = async (query: string): Promise<SearchTrack[]> => {
  const { data } = await apiClient.get(`/search?q=${encodeURIComponent(query)}`);
  return data;
};
