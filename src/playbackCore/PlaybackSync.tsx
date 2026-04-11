import { useEffect } from 'react';
import { usePlaybackState, useProgress, State, default as TrackPlayer, Event } from 'react-native-track-player';
import { usePlaybackStore } from './usePlaybackStore';
import { usePlayer } from './usePlayer';
import { extractTrackColors } from '../services/trackColorService';

/**
 * Background component that synchronizes React Native Track Player state
 * with our global Zustand store.
 *
 * Also handles:
 * - Track change → update currentSong & extract artwork colors
 * - Queue extension (radio mode auto-fill)
 *
 * Rendered at the root of the app so sync runs everywhere.
 */
export const PlaybackSync = () => {
    const setPosition = usePlaybackStore(s => s.setPosition);
    const setDuration = usePlaybackStore(s => s.setDuration);
    const setStatus = usePlaybackStore(s => s.setStatus);
    const setError = usePlaybackStore(s => s.setError);

    const { state: rnkpState } = usePlaybackState();
    const { position, duration } = useProgress(1000);

    // ── Position & Duration ──────────────────────────────────────
    useEffect(() => {
        setPosition(position);
    }, [position, setPosition]);

    useEffect(() => {
        setDuration(duration);
    }, [duration, setDuration]);

    // ── Playback Status ──────────────────────────────────────────
    useEffect(() => {
        if (rnkpState === undefined) return;

        switch (rnkpState) {
            case State.Playing:
                setStatus('playing');
                break;
            case State.Paused:
                setStatus('paused');
                break;
            case State.Stopped:
                setStatus('stopped');
                break;
            case State.Error:
                setError('Playback error occurred');
                break;
            default:
                break;
        }
    }, [rnkpState, setStatus, setError]);

    // ── Track Change → Sync metadata + Extract colors ────────────
    const { extendQueue } = usePlayer();

    useEffect(() => {
        const sub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event: any) => {
            if (event.track) {
                const store = usePlaybackStore.getState();
                const track = event.track;

                // Update store with new track metadata
                if (track.song) {
                    store.setCurrentSong(track.song, track);
                    if (track.url) {
                        store.setStream(track.url, track.streamUrlExpiresAt || (Date.now() + 300000));
                    }
                }

                // Extract artwork colors for dynamic gradient (non-blocking)
                const artworkUri: string | undefined = track.artwork ?? track.song?.image ?? undefined;
                extractTrackColors(artworkUri).then((colors) => {
                    usePlaybackStore.getState().setTrackColors(colors);
                });

                // Trigger auto-fill if needed
                extendQueue();
            }
        });

        return () => sub.remove();
    }, [extendQueue]);

    return null;
};
