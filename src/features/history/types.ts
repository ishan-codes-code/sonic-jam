export interface HistoryArtist {
  id: string;
  name: string;
  normalizedName: string;
}

export interface HistorySong {
  id: string;
  trackName: string;
  albumName: string;
  image: string;
  duration: number;
  youtubeId: string;
  artists: HistoryArtist[];
}

export interface ListeningEvent {
  id: string;
  userId: string;
  songId: string;
  playedAt: string;
  durationListenedSeconds: number;
  completed: boolean;
  song: HistorySong;
}
