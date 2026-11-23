import TrackPlayer from "@rntp/player";
import { getRecommendations } from "../api/recommendationApi";
import { resolveStream } from "../api/playbackApi";
import { usePlaybackStore } from "../store/usePlaybackStore";
import { useSmartQueueStore } from "../store/useSmartQueueStore";
import type { PlaySongMetadata, SmartQueueTrack } from "../types";
import { createPlaybackTrack } from "../utils/playbackHelpers";
import {
  extractYear,
  formatDuration,
  upgradeArtwork,
} from "@/features/search/utils/itunesHelpers";
import type { CleanedSearchResult } from "@/features/search";

const MIN_NATIVE_QUEUE_AHEAD = 5;
const MIN_PREPARED_QUEUE_WINDOW = 10;
const DEFAULT_RECOMMENDATION_LIMIT = 20;

const hasStartedPlayback = { current: false };
const resolvingBatch = { current: new Set<string>() };
const enrichingBatch = { current: new Set<string>() };
const isResolving = { current: false };
const isFetchingRecommendations = { current: false };
const isHandlingTransition = { current: false };

function resetRuntime() {
  hasStartedPlayback.current = false;
  resolvingBatch.current.clear();
  enrichingBatch.current.clear();
  isResolving.current = false;
  isFetchingRecommendations.current = false;
  isHandlingTransition.current = false;
}

// ─── Session generation ─────────────────────────────────────────────────────
// Bumped by cancelSmartQueueWork() during the server-switch session reset
// (always together with the polling/session bumps, in one synchronous block).
// Every async path below captures it at entry and re-checks after awaits:
// a stale path must not update the new session's store, touch the native
// queue, or release module-level flags/sets that the new session may own
// (the switch's resetRuntime already cleared them). Stale paths exit silently
// without chaining further work; the new session drives its own chains.

let radioGeneration = 0;

/** Invalidate in-flight smart-queue fetches. Never throws. */
export function cancelSmartQueueWork(): void {
  radioGeneration++;
}

function normalizeTrackText(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/feat\.?|ft\.?|with|&/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSignificantTokens(value?: string) {
  return normalizeTrackText(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

function hasSoftTokenOverlap(source?: string, candidate?: string) {
  const sourceTokens = getSignificantTokens(source);
  if (sourceTokens.length === 0) return false;

  const candidateText = normalizeTrackText(candidate);
  if (!candidateText) return false;

  const matchedTokens = sourceTokens.filter((token) =>
    candidateText.includes(token),
  ).length;

  return matchedTokens / sourceTokens.length >= 0.5;
}

function isSoftTrackMatch(
  recommendationTitle: string,
  recommendationArtist: string,
  resultTitle?: string,
  resultArtist?: string,
) {
  const titleMatches =
    hasSoftTokenOverlap(recommendationTitle, resultTitle) ||
    hasSoftTokenOverlap(resultTitle, recommendationTitle);
  const artistMatches =
    hasSoftTokenOverlap(recommendationArtist, resultArtist) ||
    hasSoftTokenOverlap(resultArtist, recommendationArtist);

  return titleMatches && artistMatches;
}

function getSmartQueueWindowLength(tracks: SmartQueueTrack[]) {
  const { cancelledIds } = useSmartQueueStore.getState();

  return tracks.filter(
    (track) => track.status !== "failed" && !cancelledIds.has(track.id),
  ).length;
}

function getRemainingNativeTracks(
  queueLength: number,
  activeIndex: number | null | undefined,
) {
  if (queueLength === 0) return 0;
  return Math.max(queueLength - ((activeIndex ?? 0) + 1), 0);
}

function buildResolvePayload(track: SmartQueueTrack): PlaySongMetadata {
  const rec = track.recommendation;
  const itunes = track.enrichedTrack;

  if (
    itunes &&
    isSoftTrackMatch(rec.title, rec.artist, itunes.title, itunes.artist)
  ) {
    let durationSeconds: number | undefined;

    if (itunes.duration) {
      const parts = itunes.duration.split(":");
      if (parts.length === 2) {
        const mins = parseInt(parts[0], 10);
        const secs = parseInt(parts[1], 10);
        if (!isNaN(mins) && !isNaN(secs)) {
          durationSeconds = mins * 60 + secs;
        }
      }
    }

    return {
      trackName: itunes.title,
      artistName: itunes.artist,
      image: itunes.artwork ?? rec.image ?? null,
      duration: durationSeconds ?? rec.duration ?? undefined,
      lastfmId: rec.lastfmId,
      externalId: itunes.id,
    };
  }

  return {
    trackName: rec.title,
    artistName: rec.artist,
    image: rec.image ?? null,
    duration: rec.duration ?? undefined,
    lastfmId: rec.lastfmId,
  };
}

async function tryFillRNTPQueue() {
  const storeState = useSmartQueueStore.getState();
  if (!storeState.isActive) return;
  const generation = radioGeneration;

  try {
    const queue = await TrackPlayer.getQueue();
    const currentQueueLength = queue.length;
    const queuedMediaIds = new Set(
      queue.map((item) => item.mediaId).filter(Boolean),
    );

    if (generation !== radioGeneration) return;

    const readyTracks = storeState.tracks.filter(
      (track) =>
        track.status === "ready" &&
        !storeState.cancelledIds.has(track.id) &&
        track.song &&
        !queuedMediaIds.has(track.song.id),
    );

    const playbackStore = usePlaybackStore.getState();
    const addedTrackIds: string[] = [];

    for (const track of readyTracks) {
      if (generation !== radioGeneration) return;
      if (!track.song) continue;

      const playbackTrack = await createPlaybackTrack(track.song, track.playbackToken || "");

      // A stale fill must not add old-server tracks to RNTP, change the
      // current song, or pollute the new session's trackMap.
      if (generation !== radioGeneration) return;

      if (!hasStartedPlayback.current && currentQueueLength === 0) {
        hasStartedPlayback.current = true;
        await TrackPlayer.setMediaItems([playbackTrack as any]);
        await TrackPlayer.play();
        playbackStore.setCurrentSong(track.song, playbackTrack);
      } else {
        await TrackPlayer.addMediaItem(playbackTrack as any);
      }

      playbackStore.addTrackToMap(playbackTrack);
      addedTrackIds.push(track.id);
    }

    // Never remove tracks from the new store by stale ids, nor notify a
    // queue update the new session did not cause.
    if (generation !== radioGeneration) return;

    if (addedTrackIds.length > 0) {
      storeState.removeTracks(addedTrackIds);
      playbackStore.notifyQueueUpdate();
    }
  } catch (error) {
    console.error("[smartQueueService] tryFillRNTPQueue error:", error);
  }
}

async function processBatch() {
  const storeState = useSmartQueueStore.getState();
  if (!storeState.isActive || isResolving.current) return;
  const generation = radioGeneration;

  const pendingTracks = storeState.tracks.filter(
    (track) =>
      track.status === "resolving" &&
      !track.jobId &&
      !track.song &&
      !resolvingBatch.current.has(track.id) &&
      !storeState.cancelledIds.has(track.id),
  );

  if (pendingTracks.length === 0) return;

  isResolving.current = true;
  const track = pendingTracks[0];
  resolvingBatch.current.add(track.id);

  try {
    if (useSmartQueueStore.getState().cancelledIds.has(track.id)) {
      useSmartQueueStore
        .getState()
        .updateTrackStatus(track.id, { status: "failed" });
      return;
    }

    const payload = buildResolvePayload(track);
    // NOTE: onJob fires synchronously right after resolveStream's own
    // generation check, so it can only ever run while fresh — no check needed.
    const { song, playbackToken } = await resolveStream(payload, {
      onJob: (jobId) => {
        useSmartQueueStore
          .getState()
          .updateTrackStatus(track.id, { status: "resolving", jobId });
      },
    });

    // A stale resolve must not write its song into the new session's store
    // (track ids can collide across sessions via shared recommendations).
    if (generation !== radioGeneration) return;

    if (useSmartQueueStore.getState().cancelledIds.has(track.id)) {
      useSmartQueueStore
        .getState()
        .updateTrackStatus(track.id, { status: "failed" });
      return;
    }

    useSmartQueueStore
      .getState()
      .updateTrackStatus(track.id, { status: "ready", song, playbackToken });
    void tryFillRNTPQueue();
  } catch (error) {
    // Stale (e.g. resolveStream cancelled by the switch): exit silently
    // without marking the new session's track failed or chaining more work.
    if (generation !== radioGeneration) return;
    console.error("[smartQueueService] processBatch error:", error);
    useSmartQueueStore
      .getState()
      .updateTrackStatus(track.id, { status: "failed" });
  } finally {
    // Release only our own claim: after a switch the reset already cleared
    // these, and they may now belong to the new session's in-flight batch.
    if (generation === radioGeneration) {
      resolvingBatch.current.delete(track.id);
      isResolving.current = false;
      void processBatch();
    }
  }
}

async function enrichTrack(track: SmartQueueTrack) {
  if (enrichingBatch.current.has(track.id)) return;
  enrichingBatch.current.add(track.id);
  const generation = radioGeneration;

  try {
    if (useSmartQueueStore.getState().cancelledIds.has(track.id)) {
      useSmartQueueStore
        .getState()
        .updateTrackStatus(track.id, { status: "failed" });
      void processBatch();
      return;
    }

    const query = encodeURIComponent(
      `${track.recommendation.title} ${track.recommendation.artist}`,
    );
    const res = await fetch(
      `https://itunes.apple.com/search?term=${query}&media=music&entity=song&country=in&limit=1`,
    );
    const data = await res.json();

    // Stale enrichment must not write into the new session's store, and must
    // not touch enrichingBatch (the switch cleared it; the id may already
    // belong to the new session's in-flight work).
    if (generation !== radioGeneration) return;

    if (useSmartQueueStore.getState().cancelledIds.has(track.id)) {
      useSmartQueueStore
        .getState()
        .updateTrackStatus(track.id, { status: "failed" });
      void processBatch();
      return;
    }

    let enrichedTrack: CleanedSearchResult | null = null;
    const item = data.results?.[0];

    if (
      item &&
      isSoftTrackMatch(
        track.recommendation.title,
        track.recommendation.artist,
        item.trackName,
        item.artistName,
      )
    ) {
      const enrichedArtwork = item.artworkUrl100
        ? (upgradeArtwork(item.artworkUrl100) ?? null)
        : null;

      enrichedTrack = {
        id: item.trackId.toString(),
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName || "",
        artwork: enrichedArtwork || undefined,
        preview: item.previewUrl || "",
        duration: formatDuration(item.trackTimeMillis),
        year: extractYear(item.releaseDate),
        genre: item.primaryGenreName || "",
        type: "song",
      };
    }

    useSmartQueueStore.getState().updateTrackStatus(track.id, {
      enrichedTrack,
      status: "resolving",
    });
    void processBatch();
  } catch (error) {
    // Stale (fetch failed only because the session moved on): exit silently
    // without updating the new store or chaining more work.
    if (generation !== radioGeneration) return;
    console.error("[smartQueueService] enrichTrack error:", error);
    if (!useSmartQueueStore.getState().cancelledIds.has(track.id)) {
      useSmartQueueStore.getState().updateTrackStatus(track.id, {
        status: "resolving",
        enrichedTrack: null,
      });
    } else {
      useSmartQueueStore
        .getState()
        .updateTrackStatus(track.id, { status: "failed" });
    }
    void processBatch();
  }
}

async function appendRecommendations(limit = DEFAULT_RECOMMENDATION_LIMIT) {
  if (isFetchingRecommendations.current) return;

  isFetchingRecommendations.current = true;
  const generation = radioGeneration;

  try {
    const recs = await getRecommendations({ limit });
    if (generation !== radioGeneration) return;
    if (recs.length === 0) return;

    const appendedTracks = useSmartQueueStore
      .getState()
      .appendRecommendations(recs);
    appendedTracks.forEach((track) => {
      void enrichTrack(track);
    });
  } catch (error) {
    console.error("[smartQueueService] appendRecommendations error:", error);
  } finally {
    // Only release our own claim: after a switch the reset already cleared
    // this flag, and it may belong to the new session's in-flight fetch.
    if (generation === radioGeneration) {
      isFetchingRecommendations.current = false;
    }
  }
}

export async function ensureSmartQueueWindow() {
  if (usePlaybackStore.getState().queueType !== "radio") return;

  const storeState = useSmartQueueStore.getState();
  if (!storeState.isActive) return;

  try {
    const queue = await TrackPlayer.getQueue();
    const activeIndex = await TrackPlayer.getActiveMediaItemIndex();
    const remainingNativeTracks = getRemainingNativeTracks(
      queue.length,
      activeIndex,
    );

    const smartQueueLength = getSmartQueueWindowLength(storeState.tracks);
    const preparedQueueWindow = remainingNativeTracks + smartQueueLength;

    if (
      remainingNativeTracks >= MIN_NATIVE_QUEUE_AHEAD &&
      preparedQueueWindow >= MIN_PREPARED_QUEUE_WINDOW
    ) {
      return;
    }

    if (preparedQueueWindow >= MIN_PREPARED_QUEUE_WINDOW) return;

    await appendRecommendations();
  } catch (error) {
    console.error("[smartQueueService] ensureSmartQueueWindow error:", error);
  }
}

export async function handleSmartQueueMediaTransition() {
  if (usePlaybackStore.getState().queueType !== "radio") return;
  if (isHandlingTransition.current) return;

  isHandlingTransition.current = true;
  const generation = radioGeneration;

  try {
    await tryFillRNTPQueue();
    await ensureSmartQueueWindow();
  } finally {
    // Only release our own claim (see processBatch): a stale transition must
    // not unlock the new session's in-flight transition handling.
    if (generation === radioGeneration) {
      isHandlingTransition.current = false;
    }
  }
}

export async function startSmartQueueRadio(
  limit = DEFAULT_RECOMMENDATION_LIMIT,
) {
  resetRuntime();
  usePlaybackStore.getState().setQueueType("radio");
  const generation = radioGeneration;

  const recs = await getRecommendations({ limit });
  if (generation !== radioGeneration) {
    // A server switch reset the session mid-fetch: drop the stale result.
    // The switch already performed the reset; touching global state here
    // could clobber a newer session.
    return;
  }
  if (recs.length === 0) return;

  useSmartQueueStore.getState().initSmartQueue(recs);
  useSmartQueueStore.getState().tracks.forEach((track) => {
    void enrichTrack(track);
  });
}

export async function ensureSmartQueueActive() {
  usePlaybackStore.getState().setQueueType("radio");

  if (useSmartQueueStore.getState().isActive) {
    await ensureSmartQueueWindow();
    return;
  }

  await startSmartQueueRadio();
}

export function resetSmartQueueRadio() {
  resetRuntime();
  useSmartQueueStore.getState().reset();
}
