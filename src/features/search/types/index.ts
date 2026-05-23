export interface SearchScreenState {
  searchFocus: boolean;
  setSearchFocus: (searchFocus: boolean) => void;
}

export type ItunesResultType = "song" | "artist" | "album" | "playlist";

export interface BaseItunesResult {
  wrapperType: string;
  kind?: string;
  artistId: number;
  artistName: string;
}

export interface ItunesSongResult extends BaseItunesResult {
  wrapperType: "track";
  kind: "song";
  trackId: number;
  trackName: string;
  collectionName: string;
  previewUrl: string;
  artworkUrl100: string;
  releaseDate: string;
  trackTimeMillis: number;
  primaryGenreName: string;
}

export interface ItunesArtistResult extends BaseItunesResult {
  wrapperType: "artist";
  artistType: string;
  primaryGenreName: string;
  artworkUrl100?: string;
}

export interface CleanedSearchResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string | undefined;
  preview: string;
  duration: string;
  year: string;
  genre: string;
  type: ItunesResultType;
}
