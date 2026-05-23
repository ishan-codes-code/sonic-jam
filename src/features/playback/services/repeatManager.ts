import TrackPlayer, { RepeatMode } from "@rntp/player";
import { usePlaybackStore } from "../store/usePlaybackStore";
import type { ExtendedRepeatMode } from "../types";

/**
 * RepeatManager
 * 
 * Standard repeat logic for Sonic.
 */
export const RepeatManager = {
  /**
   * Toggles through the repeat modes.
   * Off -> Track (One) -> Off
   */
  async toggleRepeatMode() {
    const store = usePlaybackStore.getState();
    const currentMode = store.repeatMode;
    let nextMode: ExtendedRepeatMode = "off";

    switch (currentMode) {
      case "off":
        nextMode = "track";
        await TrackPlayer.setRepeatMode(RepeatMode.One);
        break;
      case "track":
      case "queue":
      case "once":
      default:
        nextMode = "off";
        await TrackPlayer.setRepeatMode(RepeatMode.Off);
        break;
    }

    store.setRepeatMode(nextMode);
  },

  async handlePlaybackEnd() {
    // Custom repeat logic removed
  },

  async resetOnceState() {
    // Custom repeat logic removed
  }
};
