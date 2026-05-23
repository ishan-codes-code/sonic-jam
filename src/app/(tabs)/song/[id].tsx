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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { play } = usePlayer();
  const router = useRouter();
  const didRun = useRef(false);

  useEffect(() => {
    // Guard: only run once even in StrictMode double-invocations
    if (didRun.current) return;
    didRun.current = true;

    async function resolve() {
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
