import { create } from "zustand";
import { SmartQueueTrack } from "../types";
import { RecommendationTrack } from "../api/recommendationApi";

interface SmartQueueState {
  tracks: SmartQueueTrack[];
  isActive: boolean;
  viewMode: "smart" | "rntp";
  cancelledIds: Set<string>;
  initSmartQueue: (recommendations: RecommendationTrack[]) => void;
  appendRecommendations: (
    recommendations: RecommendationTrack[],
  ) => SmartQueueTrack[];
  updateTrackStatus: (id: string, patch: Partial<SmartQueueTrack>) => void;
  cancelTrack: (id: string) => void;
  removeTracks: (ids: string[]) => void;
  setViewMode: (mode: "smart" | "rntp") => void;
  reset: () => void;
}

export const useSmartQueueStore = create<SmartQueueState>((set) => ({
  tracks: [],
  isActive: false,
  viewMode: "rntp",
  cancelledIds: new Set(),

  initSmartQueue: (recommendations) => {
    const tracks: SmartQueueTrack[] = recommendations.map((rec) => {
      return {
        id: rec.lastfmId,
        recommendation: rec,
        status: "enriching",
        song: null,
        enrichedTrack: null,
        jobId: null,
        mediaId: null,
      };
    });

    set({
      tracks,
      isActive: true,
      cancelledIds: new Set(),
    });
  },

  appendRecommendations: (recommendations) => {
    let appendedTracks: SmartQueueTrack[] = [];

    set((state) => {
      const existingIds = new Set([
        ...state.tracks.map((track) => track.id),
        ...state.cancelledIds,
      ]);

      appendedTracks = recommendations.flatMap((rec) => {
        if (existingIds.has(rec.lastfmId)) return [];

        existingIds.add(rec.lastfmId);

        return {
          id: rec.lastfmId,
          recommendation: rec,
          status: "enriching",
          song: null,
          enrichedTrack: null,
          jobId: null,
          mediaId: null,
        };
      });

      if (appendedTracks.length === 0) return state;

      return {
        tracks: [...state.tracks, ...appendedTracks],
        isActive: true,
      };
    });

    return appendedTracks;
  },

  updateTrackStatus: (id, patch) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === id ? { ...track, ...patch } : track,
      ),
    }));
  },

  cancelTrack: (id) => {
    set((state) => {
      const newCancelledIds = new Set(state.cancelledIds);
      newCancelledIds.add(id);

      return {
        cancelledIds: newCancelledIds,
        tracks: state.tracks.map((track) =>
          track.id === id ? { ...track, status: "failed" } : track,
        ),
      };
    });
  },

  removeTracks: (ids) => {
    set((state) => ({
      tracks: state.tracks.filter((track) => !ids.includes(track.id)),
    }));
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  reset: () => {
    set({
      tracks: [],
      isActive: false,
      cancelledIds: new Set(),
    });
  },
}));
