import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/apiClient';
import { useAuthStore } from '@/features/auth/store/authStore';
import { usePlayer } from '@/features/playback/hooks/usePlayer';
import { toastImperative } from '@/features/Toast/utils/toastSingleton';
import { useServerStore } from '../store/serverStore';
import {
  ADMIN_STORAGE_VALUE_KEYS,
  adminStorageModeLabel,
  buildAdminStoragePatch,
  getAdminStorage,
  hasAdminStorageChanges,
  missingAdminStorageFields,
  planUnknownResultRetry,
  saveAdminStorage,
  type AdminStorageInfo,
} from '../api/adminStorageApi';
import {
  PLAYBACK_FIELD_KEYS,
  pollHealthUntilReady,
  R2_FIELD_KEYS,
  STORAGE_MODE_KEY,
  validateWorkerStreamUrl,
  type HealthPollResult,
  type PlaybackFieldKey,
  type R2FieldKey,
} from '../api/setupApi';
import type { StorageMode } from '../api/serverValidation';
import { resetPlaybackForStorageChange } from '../utils/adminStorageReset';

export type AdminStorageLoadPhase = 'loading' | 'ready' | 'load-error';

export type AdminSavePhase =
  | 'idle'
  | 'confirm'
  | 'saving'
  | 'unknown-checking'
  | 'unknown'
  | 'polling'
  | 'poll-failed'
  | 'worker-wait'
  | 'done';

export interface AdminStorageLoadError {
  kind:
    | 'unauthorized'
    | 'forbidden'
    | 'outdated'
    | 'unreachable'
    | 'timeout'
    | 'unexpected';
  message: string;
  retryable: boolean;
}

/** The old API may still answer right after the save response. */
const PRE_POLL_WAIT_MS = 3_000;
/** The streaming worker restarts after the API is back. */
const WORKER_RESTART_WAIT_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortErrorLike(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

/**
 * Admin storage settings state machine (Settings → Storage, admins only).
 *
 * Loads GET /admin/storage, edits the storage mode + r2/playback values
 * through the setup wizard's own step components and validation (local needs
 * nothing; r2 blanks keep saved values; env-locked keys show as managed and
 * are never sent), and saves with an inline confirm. All secrets live in
 * memory only — they are never persisted or logged, and backend messages are
 * redacted before display.
 *
 * Save flow: POST → same-server playback reset (tokens, auth state, and the
 * server URL are KEPT — never performServerSwitch) → ~3s wait → /health poll
 * with expectStorage → ~10s worker wait → success toast + back to Settings,
 * still logged in. Back (header, gesture, Android) and repeat taps are
 * blocked only while busy; every failure keeps a way to leave. An unknown
 * POST (timeout / connection loss) resets the same state, re-checks the
 * server, and offers a resubmit; a poll timeout offers "Check again" without
 * resubmitting. Readiness never uses checkAuth (it clears tokens on any
 * error) — only the public /health poll.
 */
export function useAdminStorage() {
  const router = useRouter();
  const navigation = useNavigation();
  const serverUrl = useServerStore((s) => s.serverUrl);
  const queryClient = useQueryClient();
  const { stop } = usePlayer();

  const [loadPhase, setLoadPhase] = useState<AdminStorageLoadPhase>('loading');
  const [loadError, setLoadError] = useState<AdminStorageLoadError | null>(
    null,
  );
  const [info, setInfo] = useState<AdminStorageInfo | null>(null);

  // Form state (memory only). The mode preselects the server's current mode;
  // entered values survive validation errors, rejects, and retries.
  const [selectedMode, setSelectedModeState] = useState<StorageMode>('r2');
  const [r2, setR2State] = useState<Record<R2FieldKey, string>>({
    R2_ACCOUNT_ID: '',
    R2_ACCESS_KEY: '',
    R2_SECRET_KEY: '',
    R2_BUCKET: '',
  });
  const [playback, setPlaybackState] = useState<
    Record<PlaybackFieldKey, string>
  >({
    WORKER_STREAM_URL: '',
    JWT_PLAYBACK_SECRET: '',
  });

  const [storageError, setStorageError] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [unknownMessage, setUnknownMessage] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [savePhase, setSavePhase] = useState<AdminSavePhase>('idle');

  // Same stale-async discipline as the setup wizard: results landing after
  // unmount or a newer attempt are ignored, and the poll gets an
  // AbortController so leaving stops the network loop promptly.
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);
  const pollControllerRef = useRef<AbortController | null>(null);
  // Mode the last save submitted (POST result or patch): drives expectStorage
  // for the poll and for "Check again" retries.
  const expectedModeRef = useRef<StorageMode>('r2');
  // Live info for async continuations (the GET check refreshes it).
  const infoRef = useRef<AdminStorageInfo | null>(null);
  infoRef.current = info;

  const busy =
    savePhase === 'saving' ||
    savePhase === 'unknown-checking' ||
    savePhase === 'polling' ||
    savePhase === 'worker-wait';
  // busyRef mirrors `busy` for synchronous guards (repeat taps, beforeRemove
  // in the same tick as a save press). The effect below keeps it in sync;
  // async entries also set it synchronously before their first await.
  const busyRef = useRef(false);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    // Block Back (header, gesture, Android) only while busy: saving, the
    // unknown-result check, the health poll, and the worker wait. Failures
    // always keep a way to leave. A dead session (logout, or a refresh the
    // server rejected mid-save) is never blocked: AuthGuard owns that
    // redirect, and holding the user on this screen would strand them.
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!busyRef.current) return;
      if (useAuthStore.getState().status !== 'authenticated') return;
      e.preventDefault();
    });
    return unsubscribe;
  }, [navigation]);

  async function load() {
    const attempt = ++attemptRef.current;
    const isCurrent = () =>
      mountedRef.current && attempt === attemptRef.current;
    setLoadPhase('loading');
    setLoadError(null);
    const result = await getAdminStorage(apiClient);
    if (!isCurrent()) return;
    if (!result.ok) {
      setLoadError({
        kind: result.code,
        message: result.message,
        retryable:
          result.code === 'unreachable' ||
          result.code === 'timeout' ||
          result.code === 'unexpected',
      });
      setLoadPhase('load-error');
      return;
    }
    setInfo(result.info);
    setSelectedModeState(result.info.mode);
    setLoadPhase('ready');
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selector options: the advertised modes, always including the current one
  // (a backend reporting a mode it does not advertise must still display).
  const modes = useMemo<StorageMode[]>(() => {
    if (!info) return ['r2'];
    return info.storageModes.includes(info.mode)
      ? info.storageModes
      : [info.mode, ...info.storageModes];
  }, [info]);

  const effectiveMode: StorageMode =
    info?.modeLocked || !info ? (info?.mode ?? selectedMode) : selectedMode;

  function isLocked(key: string): boolean {
    return info?.envLocked.includes(key) ?? false;
  }

  function isConfigured(key: string): boolean {
    return info?.configured[key] ?? false;
  }

  // Form edits are ignored while busy or after a successful save that is
  // still polling (poll-failed locks the form: the values are saved, so
  // editing can only resubmit — the screen offers "Check again" instead).
  const formLocked = busy || savePhase === 'poll-failed';

  function setSelectedMode(next: StorageMode) {
    if (formLocked || info?.modeLocked) return;
    setSelectedModeState(next);
    setStorageError(null);
    setPlaybackError(null);
    setSaveError(null);
  }

  function setR2Field(key: R2FieldKey, next: string) {
    if (formLocked) return;
    setR2State((prev) => ({ ...prev, [key]: next }));
    setStorageError(null);
    setSaveError(null);
  }

  function setPlaybackField(key: PlaybackFieldKey, next: string) {
    if (formLocked) return;
    setPlaybackState((prev) => ({ ...prev, [key]: next }));
    setPlaybackError(null);
    setSaveError(null);
  }

  const hasChanges =
    info !== null &&
    hasAdminStorageChanges(selectedMode, { ...r2, ...playback }, info);

  /**
   * No-migration warning when the selection differs from the stored mode.
   * Mirrors the wizard's warning; the save confirm repeats the consequences.
   */
  const switchWarning: string | null =
    info !== null && !info.modeLocked && selectedMode !== info.mode
      ? `This server already uses ${adminStorageModeLabel(info.mode)}. Switching to ${adminStorageModeLabel(selectedMode)} does not move existing songs — they stay where they are, and anything missing is downloaded again on demand.`
      : null;

  function validate(): boolean {
    if (!info) return false;
    const values = { ...r2, ...playback };
    const missing = missingAdminStorageFields(values, effectiveMode, {
      envLocked: info.envLocked,
      configured: info.configured,
      playbackSecretRequired: info.playbackSecretRequired,
    });
    if (missing.length > 0) {
      const anyKeepable = ADMIN_STORAGE_VALUE_KEYS.some(
        (key) => !isLocked(key) && isConfigured(key),
      );
      const message = anyKeepable
        ? 'Fill in every remaining field to save, or leave already-configured fields blank to keep them.'
        : 'Fill in every field to save.';
      if (missing.some((key) => (R2_FIELD_KEYS as readonly string[]).includes(key))) {
        setStorageError(message);
      }
      const playbackMissing = missing.filter((key) =>
        (PLAYBACK_FIELD_KEYS as readonly string[]).includes(key),
      );
      if (playbackMissing.length > 0) {
        // The forced secret needs its own copy: the generic "leave blank to
        // keep" line would contradict its required state.
        setPlaybackError(
          info.playbackSecretRequired &&
            playbackMissing.includes('JWT_PLAYBACK_SECRET') &&
            isConfigured('JWT_PLAYBACK_SECRET')
            ? 'Enter the playback secret to save — the server requires it even though one is already saved.'
            : message,
        );
      }
      return false;
    }
    // A blank URL here means configured-but-kept (required-but-missing was
    // rejected above), so only an entered value needs a format check.
    if (effectiveMode === 'r2' && !isLocked('WORKER_STREAM_URL')) {
      const workerUrl = playback.WORKER_STREAM_URL.trim();
      if (workerUrl) {
        const urlError = validateWorkerStreamUrl(workerUrl);
        if (urlError) {
          setPlaybackError(urlError);
          return false;
        }
      }
    }
    return true;
  }

  function requestSave() {
    if (busyRef.current || !info || loadPhase !== 'ready') return;
    if (savePhase !== 'idle' && savePhase !== 'unknown') return;
    setStorageError(null);
    setPlaybackError(null);
    setSaveError(null);
    if (!validate()) return;
    // Backstop: the Save button is already disabled when nothing changed.
    if (!hasAdminStorageChanges(selectedMode, { ...r2, ...playback }, info)) {
      return;
    }
    setSavePhase('confirm');
  }

  function cancelConfirm() {
    if (busyRef.current || savePhase !== 'confirm') return;
    setSavePhase('idle');
  }

  function buildPatch(): Record<string, string> | null {
    if (!info) return null;
    return buildAdminStoragePatch({
      selectedMode,
      values: { ...r2, ...playback },
      envLocked: info.envLocked,
      modeLocked: info.modeLocked,
      currentMode: info.mode,
    });
  }

  function confirmSave() {
    if (busyRef.current || savePhase !== 'confirm') return;
    const live = infoRef.current;
    if (!live || loadPhase !== 'ready') return;
    // The form stays editable behind the confirm card, so re-validate the
    // live values: interim edits must not bypass validation or the
    // dirty check. Failures drop back to editing with errors shown.
    setStorageError(null);
    setPlaybackError(null);
    setSaveError(null);
    if (!validate()) {
      setSavePhase('idle');
      return;
    }
    const patch = buildPatch();
    if (
      !patch ||
      !hasAdminStorageChanges(selectedMode, { ...r2, ...playback }, live)
    ) {
      setSavePhase('idle');
      return;
    }
    busyRef.current = true;
    void runSave(patch);
  }

  function retrySave() {
    // Resubmit after an unknown result: values were kept and the consequences
    // were already confirmed, so a still-valid patch goes straight back to
    // the POST. Interim edits re-validate first; failures drop to editing.
    if (busyRef.current || savePhase !== 'unknown') return;
    const live = infoRef.current;
    if (!live || loadPhase !== 'ready') return;
    setStorageError(null);
    setPlaybackError(null);
    setSaveError(null);
    if (!validate()) {
      setUnknownMessage(null);
      setSavePhase('idle');
      return;
    }
    const patch = buildPatch();
    if (
      !patch ||
      !hasAdminStorageChanges(selectedMode, { ...r2, ...playback }, live)
    ) {
      setUnknownMessage(null);
      setSavePhase('idle');
      return;
    }
    busyRef.current = true;
    void runSave(patch);
  }

  function checkAgain() {
    // Re-poll only — the save already succeeded, so nothing is resubmitted.
    if (busyRef.current || savePhase !== 'poll-failed') return;
    if (!serverUrl) return;
    busyRef.current = true;
    const attempt = ++attemptRef.current;
    const isCurrent = () =>
      mountedRef.current && attempt === attemptRef.current;
    void (async () => {
      if (await runPollAndWait(expectedModeRef.current, false, isCurrent)) {
        if (!isCurrent()) return;
        finishDone();
      }
    })();
  }

  function leave() {
    if (busyRef.current) return;
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  }

  function finishDone() {
    setSavePhase('done');
    // Release the synchronous guard directly: the render syncing it has not
    // run yet, and leave()'s guard would block this very navigation.
    busyRef.current = false;
    toastImperative.show({
      type: 'success',
      text1: 'Storage settings saved.',
      visibilityTime: 4000,
    });
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  }

  function pollNotReadyMessage(poll: HealthPollResult, expected: StorageMode) {
    return poll.lastStorage !== null && poll.lastStorage !== expected
      ? `The server is ready, but its storage is "${poll.lastStorage}" instead of "${expected}". The backend environment may override the mode — check the server configuration, then check again.`
      : 'The server is still starting. Check again in a moment — your settings were saved and will not be sent twice.';
  }

  /**
   * Shared post-save wait: an optional pre-wait (the old API may still
   * answer), the public /health poll with expectStorage, then the worker
   * restart wait. Returns true only when the server is fully ready; a poll
   * timeout lands on poll-failed with "Check again" (no resubmit). Takes the
   * caller's currency check and bumps nothing itself, so the caller's own
   * post-poll checks stay valid.
   */
  async function runPollAndWait(
    expected: StorageMode,
    preWait: boolean,
    isCurrent: () => boolean,
  ): Promise<boolean> {
    if (!serverUrl) {
      busyRef.current = false;
      return false;
    }
    setPollError(null);
    setSavePhase('polling');
    if (preWait) {
      await sleep(PRE_POLL_WAIT_MS);
      if (!isCurrent()) return false;
    }
    pollControllerRef.current?.abort();
    const controller = new AbortController();
    pollControllerRef.current = controller;
    let poll: HealthPollResult;
    try {
      poll = await pollHealthUntilReady(serverUrl, {
        signal: controller.signal,
        expectStorage: expected,
      });
    } catch (error) {
      // AbortError means unmount or a superseding run: stay silent.
      if (isAbortErrorLike(error)) return false;
      throw error;
    }
    if (!isCurrent()) return false;
    if (!poll.ready) {
      setSavePhase('poll-failed');
      setPollError(pollNotReadyMessage(poll, expected));
      return false;
    }
    setSavePhase('worker-wait');
    await sleep(WORKER_RESTART_WAIT_MS);
    if (!isCurrent()) return false;
    return true;
  }

  async function runSave(patch: Record<string, string>) {
    if (!serverUrl) {
      busyRef.current = false;
      setSavePhase('idle');
      setSaveError('No server selected.');
      return;
    }
    const attempt = ++attemptRef.current;
    const isCurrent = () =>
      mountedRef.current && attempt === attemptRef.current;
    const submittedMode =
      patch[STORAGE_MODE_KEY] === 'local' ? 'local' : 'r2';
    expectedModeRef.current = submittedMode;

    setSaveError(null);
    setUnknownMessage(null);
    setPollError(null);
    setSavePhase('saving');

    const saved = await saveAdminStorage(apiClient, patch);
    if (!isCurrent()) return;

    if (saved.ok) {
      expectedModeRef.current = saved.result.storageMode;
      await resetPlaybackForStorageChange({ queryClient, stopPlayback: stop });
      if (!isCurrent()) return;
      if (await runPollAndWait(saved.result.storageMode, true, isCurrent)) {
        if (!isCurrent()) return;
        finishDone();
      }
      return;
    }

    if (saved.code === 'timeout' || saved.code === 'unreachable') {
      // Unknown result: the save may have landed. Reset the same state, wait,
      // then check what the server reports before offering a resubmit.
      setSavePhase('unknown-checking');
      await resetPlaybackForStorageChange({ queryClient, stopPlayback: stop });
      if (!isCurrent()) return;
      await sleep(PRE_POLL_WAIT_MS);
      if (!isCurrent()) return;
      const check = await getAdminStorage(apiClient);
      if (!isCurrent()) return;
      const plan = planUnknownResultRetry({
        submittedMode,
        previousMode: infoRef.current?.mode ?? submittedMode,
        check: check.ok ? { ok: true, mode: check.info.mode } : { ok: false },
      });
      if (plan.confirmed && check.ok) {
        // The mode change demonstrably landed: refresh the form facts and
        // continue to the health poll instead of resubmitting.
        setInfo(check.info);
        setSelectedModeState(check.info.mode);
        if (await runPollAndWait(check.info.mode, true, isCurrent)) {
          if (!isCurrent()) return;
          finishDone();
        }
        return;
      }
      if (check.ok) {
        setInfo(check.info);
      }
      setUnknownMessage(plan.message);
      setSavePhase('unknown');
      return;
    }

    // Rejected (validation message), forbidden (demoted mid-edit), outdated,
    // unauthorized, or unexpected: show the error, keep every entered value.
    setSavePhase('idle');
    setSaveError(saved.message);
  }

  return {
    loadPhase,
    loadError,
    reload: load,
    info,
    modes,
    selectedMode,
    setSelectedMode,
    effectiveMode,
    isLocked,
    isConfigured,
    r2,
    setR2Field,
    playback,
    setPlaybackField,
    storageError,
    playbackError,
    saveError,
    unknownMessage,
    pollError,
    savePhase,
    busy,
    formLocked,
    hasChanges,
    switchWarning,
    requestSave,
    cancelConfirm,
    confirmSave,
    retrySave,
    checkAgain,
    leave,
  };
}
