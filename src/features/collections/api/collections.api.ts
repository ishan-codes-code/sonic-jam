import axios from 'axios';
import { Collection, ItunesLookupResponse } from '../types';
import { upgradeArtwork } from '@/features/search/utils/itunesHelpers';

export const fetchRemoteAlbum = async (id: string, signal?: AbortSignal): Promise<Collection> => {
    const response = await axios.get<ItunesLookupResponse>(
        `https://itunes.apple.com/lookup?id=${id}&entity=song`,
        { signal }
    );

    const { results } = response.data;
    if (!results || results.length === 0) {
        throw new Error('Album not found');
    }

    const albumData = results.find(r => r.wrapperType === 'collection');
    if (!albumData) throw new Error('Invalid album data');

    const tracks = results
        .filter(r => r.wrapperType === 'track')
        .map(t => ({
            id: String(t.trackId),
            title: t.trackName || '',
            artist: t.artistName,
            album: t.collectionName,
            artwork: upgradeArtwork(t.artworkUrl100),
            preview: t.previewUrl || '',
            duration: '', // iTunes lookup doesn't provide duration in standard format easily here
            year: t.releaseDate ? new Date(t.releaseDate).getFullYear().toString() : '',
            genre: t.primaryGenreName,
            type: 'song' as const
        }));

    return {
        id: String(albumData.collectionId),
        title: albumData.collectionName,
        artist: albumData.artistName,
        artwork: upgradeArtwork(albumData.artworkUrl100) || '',
        type: 'album',
        isRemote: true,
        tracks,
        releaseDate: albumData.releaseDate,
        genre: albumData.primaryGenreName
    };
};
