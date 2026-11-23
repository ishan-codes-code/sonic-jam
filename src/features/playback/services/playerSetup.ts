import TrackPlayer, { PlayerCommand, type PlayerConfig } from "@rntp/player";
import { BASE_URL } from "@/api/apiClient";

let isSetup = false;

// Built lazily at setup time (not module scope) so the progress-sync URL
// uses the runtime-configured server. setupPlayer() runs only after the
// ServerGuard resolves, guaranteeing BASE_URL is already pointed correctly.
function buildPlayerConfig(): PlayerConfig {
  return {
    contentType: "music",

    handleAudioBecomingNoisy: true,

    cache: {
      maxSizeBytes: 200 * 1024 * 1024, // 200 MB
      preloading: {
        window: 2,
      },
    },

    android: {
      wakeMode: "network",

      notification: {
        channelId: "com.sonic.audio",
        channelName: "Audio Playback",
        smallIcon: "ic_notification",
      },
    },

    progressSync: {
      intervalSeconds: 30,
      http: {
        url: `${BASE_URL}/listening/progress-sync`,
        headers: {},
      },
    },
  };
}

/**
 * Tears down the native player and sets it up again with the CURRENT runtime
 * server URL. Used by the server-switch session reset (@rntp/player exposes
 * no progress-sync URL update API, so recreate is the only way to re-point
 * progress sync; headers alone are updatable via setProgressSyncToken) and
 * by the dead-player self-heal (Android killed the native service).
 * Server-switch callers must stop playback and clear the queue first; the
 * self-heal skips that because the native player is already gone.
 * A failed re-setup clears the guard so the next ensureSetup() retries.
 * On success the stored access token is re-pushed into the (fresh, empty)
 * progress-sync headers so a self-heal recreate in a live session does not
 * post unauthenticated until the next refresh.
 *
 * Sequencing note: every @rntp/player v5 control API is synchronous `void`
 * (verified in audio.d.ts + the TurboModule spec), so destroy() dispatches
 * before setupPlayer() in call order; the await yields between the two
 * dispatches. There is no native completion handle to wait on.
 */
export async function recreatePlayer(): Promise<boolean> {
  try {
    await TrackPlayer.destroy();
  } catch (error) {
    console.error("[playerSetup] Failed to destroy TrackPlayer:", error);
  }
  isSetup = false;
  const ok = await setupPlayer();
  if (ok) {
    // buildPlayerConfig() resets progressSync headers to {} — restore the
    // stored access token (read-only, no network refresh) so progress sync
    // stays authenticated. Null (server-switch path: tokens already
    // cleared) just clears the header, a no-op on the fresh config. Lazy
    // imports (hard rule 1); a failure here must not fail the recreate.
    try {
      const { tokenStorage } = await import(
        "@/features/auth/utils/tokenStorage"
      );
      const { setProgressSyncToken } = await import(
        "@/features/playback/hooks/useProgressSyncAuth"
      );
      await setProgressSyncToken(await tokenStorage.getAccessToken());
    } catch (error) {
      console.warn(
        "[playerSetup] Failed to restore progress-sync token:",
        error,
      );
    }
  }
  return ok;
}

export async function setupPlayer(): Promise<boolean> {
  if (isSetup) return true;

  try {
    await TrackPlayer.setupPlayer(buildPlayerConfig());

    TrackPlayer.setCommands({
      capabilities: [
        PlayerCommand.PlayPause,
        PlayerCommand.Next,
        PlayerCommand.Previous,
        PlayerCommand.Stop,
        PlayerCommand.Seek,
      ],
    });

    isSetup = true;

    return true;
  } catch (error) {
    console.error("[playerSetup] Failed to setup TrackPlayer:", error);

    return false;
  }
}
