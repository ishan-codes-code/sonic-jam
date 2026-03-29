import { YouTubeVideo } from '../services/youtube';

/**
 * Config + data model for a user-managed dynamic section on the Explore screen.
 *
 * type     — keyword sections use searchVideosIN(); playlist sections use fetchPlaylistItems()
 * value    — the raw keyword or extracted playlistId
 * layout   — controls MediaSection rendering (horizontal strip vs vertical list)
 * variant  — controls MediaCard appearance (large thumbnail or compact row)
 * data     — fetched videos, appended on Load More
 * nextPageToken — YouTube pagination cursor; undefined when no more pages
 * isLoading — currently fetching next page (Load More spinner)
 */
export interface DynamicSection {
  id: string;
  title: string;
  type: 'keyword' | 'playlist' | 'trending';
  value: string;
  layout: 'horizontal' | 'vertical';
  variant: 'large' | 'compact';
  data: YouTubeVideo[];
  nextPageToken?: string;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
}
