import { usePlayer } from '@/features/playback';
import { toastImperative } from '@/features/Toast/utils/toastSingleton';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';

// ─── ID validation ───────────────────────────────────────────────────────────
// Accepts UUID v4, cuid2, and any reasonable alphanumeric id (8–36 chars).
// Anything that doesn't pass gets rejected before hitting the network.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// cuid2: starts with a letter, 24-32 alphanumeric chars
const CUID_RE = /^[a-z][a-z0-9]{7,35}$/i;

// Generic safe id: alphanumeric + hyphens/underscores, length 8-36
const SAFE_ID_RE = /^[a-z0-9_-]{8,36}$/i;

function isValidSongId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const trimmed = id.trim();
  if (!trimmed) return false;
  return UUID_RE.test(trimmed) || CUID_RE.test(trimmed) || SAFE_ID_RE.test(trimmed);
}

// ─── iTunes API helpers ──────────────────────────────────────────────────────

const ITUNES_LOOKUP_BASE = 'https://itunes.apple.com/lookup';

interface ItunesLookupResult {
  wrapperType: 'track';
  kind: 'song';
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl: string;
  artworkUrl100: string;
  trackTimeMillis: number;
  releaseDate: string;
  primaryGenreName: string;
}

interface ItunesLookupResponse {
  resultCount: number;
  results: ItunesLookupResult[];
}

async function fetchItunesSong(id: string): Promise<ItunesLookupResult> {
  const response = await fetch(`${ITUNES_LOOKUP_BASE}?id=${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch from iTunes API');
  }
  const data: ItunesLookupResponse = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error('Song not found on iTunes');
  }
  return data.results[0];
}

function itunesToCleanResult(item: ItunesLookupResult) {
  const artwork = item.artworkUrl100?.replace('100x100bb', '600x600bb');
  const mins = Math.floor(item.trackTimeMillis / 60000);
  const secs = Math.floor((item.trackTimeMillis % 60000) / 1000);
  const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const year = item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : '';

  return {
    id: item.trackId.toString(),
    title: item.trackName,
    artist: item.artistName,
    album: item.collectionName,
    artwork,
    preview: item.previewUrl,
    duration: durationStr,
    year,
    genre: item.primaryGenreName,
    type: 'song' as const,
  };
}

// ─── Route ───────────────────────────────────────────────────────────────────

/**
 * /song/[id] — Deep-link / share resolver for a single song.
 *
 * The `:id` segment is the song's DB id. Any extra query params (trackName,
 * artistName, etc.) are ignored here — they exist for the website only.
 *
 * Flow:
 *   1. Validate id (reject obviously tampered strings before hitting the API)
 *   2. Fire play({ songId: id }) — player shows an optimistic loading state
 *   3. Immediately redirect to /player
 *   4. On any failure → toast + redirect to /home
 *
 * Examples:
 *   sonic://song/cm_abc123xyz
 *   https://music-sonic.vercel.app/song/550e8400-e29b-41d4-a716-446655440000
 */
export default function SongDeepLinkRoute() {
  const { id, isRemote } = useLocalSearchParams<{ id: string; isRemote?: string }>();
  const { play } = usePlayer();
  const router = useRouter();
  const didRun = useRef(false);

  useEffect(() => {
    // Guard: only run once even in StrictMode double-invocations
    if (didRun.current) return;
    didRun.current = true;

    async function resolve() {
      if (isRemote === 'true') {
        // ── Remote (iTunes) path ──────────────────────────────────────────
        if (!id || typeof id !== 'string' || !id.trim()) {
          toastImperative.show({
            type: 'error',
            text1: 'Invalid song link',
            visibilityTime: 4000,
          });
          router.replace('/home');
          return;
        }

        try {
          const itunesResult = await fetchItunesSong(id.trim());
          const song = itunesToCleanResult(itunesResult);

          // Convert duration string ("3:45") back to seconds
          const [mins, secs] = song.duration.split(':').map(Number);
          const durationSeconds = mins * 60 + secs;

          const trackPromise = play({
            trackName: song.title,
            artistName: song.artist,
            image: song.artwork,
            externalId: song.id,
            duration: durationSeconds,
          });

          router.replace('/player');

          const track = await trackPromise;
          if (!track) {
            router.replace('/home');
          }
        } catch (error: any) {
          toastImperative.show({
            type: 'error',
            text1: error?.message ?? 'Could not play song',
            visibilityTime: 4000,
          });
          router.replace('/home');
        }
        return;
      }

      // ── Local path ──────────────────────────────────────────────────────
      // ── 1. Validate ─────────────────────────────────────────────────────
      if (!isValidSongId(id)) {
        toastImperative.show({
          type: 'error',
          text1: 'Invalid link',
          visibilityTime: 4000,
        });
        router.replace('/home');
        return;
      }

      // ── 2. Play + redirect ───────────────────────────────────────────────
      // We fire play() and immediately navigate. The player renders its own
      // loading/error state — we don't need to await the full resolution here.
      const trackPromise = play({ songId: id.trim() });

      // Head to the player right away so the user sees the loading state
      router.replace('/player');

      // Await in background to catch errors and redirect home if needed
      try {
        const track = await trackPromise;
        if (!track) {
          // play() returned undefined — it already showed a toast internally;
          // navigate back to home so the user isn't stuck on a blank player.
          router.replace('/home');
        }
      } catch (error: any) {
        toastImperative.show({
          type: 'error',
          text1: 'Could not play song',
          visibilityTime: 4000,
        });
        router.replace('/home');
      }
    }

    resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Invisible loader — user lands on the player almost instantly
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <ActivityIndicator size="large" color="#FFD54F" />
    </View>
  );
}
