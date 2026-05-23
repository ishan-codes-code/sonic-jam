import TrackPlayer, { PlayerCommand, type PlayerConfig } from "@rntp/player";
import { BASE_URL } from "@/api/apiClient";

let isSetup = false;

const PLAYER_CONFIG: PlayerConfig = {
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

export async function setupPlayer(): Promise<boolean> {
  if (isSetup) return true;

  try {
    await TrackPlayer.setupPlayer(PLAYER_CONFIG);

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
