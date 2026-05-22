import { useCallback, useEffect } from "react";
import TrackPlayer, { Event } from "@rntp/player";
import {
  handleSmartQueueMediaTransition,
  startSmartQueueRadio,
} from "../services/smartQueueService";

export function useSmartQueue() {
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.MediaItemTransition, () => {
      void handleSmartQueueMediaTransition();
    });

    return () => {
      sub.remove();
    };
  }, []);

  const loadRecommendations = useCallback(async (limit?: number) => {
    await startSmartQueueRadio(limit);
  }, []);

  return {
    loadRecommendations,
  };
}
