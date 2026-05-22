import type { Song } from "@/features/playback";

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string[] | null;
  isPublic: boolean;
  createdAt: string;
  isSystem: boolean;
  songCount?: number;
}

export interface PlayListReqPayload {
  name: string;
  description: string | null;
  isPublic: boolean;
}

export type PlaylistSong = Song & {
  position?: number;
};

export interface AddSongToPlaylistPayload {
  playlistId: string;
  songId: string;
}

export interface AddSongToPlaylistResponse {
  message: string;
}

export interface PlaylistWithSongs {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | string[] | null
  isPublic: boolean;
  isSystem: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  }
  tracks: Song[]
  playbackToken: string;
  createdAt: string;
  updatedAt: string;
}