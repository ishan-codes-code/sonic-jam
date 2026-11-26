import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation, useRouter } from 'expo-router';
import { toastImperative } from '@/features/Toast/utils/toastSingleton';
import { useServerStore } from '../store/serverStore';
import {
  API_KEY_FIELD_KEYS,
  ApiKeyFieldKey,
  buildConfigPatch,
  getSetupStatus,
  missingSetupFields,
  PLAYBACK_FIELD_KEYS,
  PlaybackFieldKey,
  pollHealthUntilReady,
  R2_FIELD_KEYS,
  R2FieldKey,
  saveSetupConfig,
  SetupStatusInfo,
  validateWorkerStreamUrl,
} from '../api/setupApi';

export type SetupWizardStep =
  | 'token'
  | 'storage'
  | 'playback'
  | 'apikeys'
  | 'finish';

export type FinishPhase =
  | 'idle'
  | 'saving'
  | 'polling'
  | 'failed'
  | 'done';

/**
 * Backend setup wizard state machine.
 *
 * Steps: setup token → storage (R2) → playback → API keys → finish. The
 * database is configured via the Termux installer only — the wizard never
 * collects or sends it. Every field is required unless the backend reports
 * it already configured (blank keeps the saved value) or environment-locked
 * (shown as managed, never sent).
 *
 * No step saves: intermediate steps only validate locally, and Finish sends
 * all entered values in ONE request, then polls /health to readiness. When
 * nothing needs sending, Finish only checks readiness. All secrets (setup
 * token, R2 keys, playback secret, API keys) live in memory only — they are
 * never written to AsyncStorage/SecureStore, never logged, and backend
 * messages are redacted before display. Entered values survive recoverable
 * errors, step navigation, and finish retries.
 *
 * Completion is reported only after public /health confirms
 * `setupRequired === false` and `db === 'ok'`; a successful save alone
 * (the API exits right after responding) never finishes the wizard. The kept
 * session is then validated: home when it is still valid, login otherwise.
 */
export function useSetupWizard() {
  const router = useRouter();
  const navigation = useNavigation();
  const serverUrl = useServerStore((s) => s.serverUrl);

  const [step, setStep] = useState<SetupWizardStep>('token');

  // Step 1 — setup token (memory only, validated via GET /setup/status).
  const [setupToken, setSetupTokenState] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [status, setStatus] = useState<SetupStatusInfo | null>(null);

  // Step 2 — storage (memory only).
  const [r2, setR2State] = useState<Record<R2FieldKey, string>>({
    R2_ACCOUNT_ID: '',
    R2_ACCESS_KEY: '',
    R2_SECRET_KEY: '',
    R2_BUCKET: '',
  });
  const [storageError, setStorageError] = useState<string | null>(null);

  // Step 3 — playback (memory only).
  const [playback, setPlaybackState] = useState<
    Record<PlaybackFieldKey, string>
  >({
    WORKER_STREAM_URL: '',
    JWT_PLAYBACK_SECRET: '',
  });
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Step 4 — API keys (memory only).
  const [apiKeys, setApiKeysState] = useState<Record<ApiKeyFieldKey, string>>({
    YOUTUBE_API_KEY: '',
    LASTFM_API_KEY: '',
  });
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);

  // Step 5 — finish (single save of all entered values, then poll).
  const [finishPhase, setFinishPhase] = useState<FinishPhase>('idle');
  const [finishError, setFinishError] = useState<string | null>(null);

  // Same stale-async discipline as useServerSetup: results that land after
  // unmount or a newer attempt are ignored. The poll additionally gets an
  // AbortController so leaving the step stops the network loop promptly.
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);
  const pollControllerRef = useRef<AbortController | null>(null);
  // Exact patch of the last successful save (null until the first one). A
  // retry re-sends only when the current values differ from it: a poll-only
  // retry after a successful save, and edits made after a save go out again.
  const lastSavedPatchRef = useRef<Record<string, string> | null>(null);
  // Guards runFinish itself: a double-invoked effect must not submit the
  // patch twice. Cleared on retry and when leaving the step.
  const finishRunRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    // Leaving the wizard without finishing (header Back, Android back, or
    // gesture) removes this route: release the setup flag so AuthGuard
    // resumes normal routing (login reaches home, logout reaches login).
    // beforeRemove fires only on genuine route removal — subscribing never
    // clears, so opening the wizard can't drop the flag by mistake (a plain
    // unmount cleanup would, under dev StrictMode remounts), and Back
    // between steps is in-component state that never touches the route.
    // Completion already cleared the flag, so this is a no-op on the success
    // path; clearing bumps no request id, so the wizard never reopens by
    // itself — the server screen's Continue rechecks /health and commits a
    // fresh setup id to reopen it when setup is still required.
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      useServerStore.getState().clearSetupPending();
    });
    return unsubscribe;
  }, [navigation]);

  function setSetupToken(next: string) {
    setSetupTokenState(next);
    setTokenError(null);
  }

  function setR2Field(key: R2FieldKey, next: string) {
    setR2State((prev) => ({ ...prev, [key]: next }));
    setStorageError(null);
  }

  function setPlaybackField(key: PlaybackFieldKey, next: string) {
    setPlaybackState((prev) => ({ ...prev, [key]: next }));
    setPlaybackError(null);
  }

  function setApiKeyField(key: ApiKeyFieldKey, next: string) {
    setApiKeysState((prev) => ({ ...prev, [key]: next }));
    setApiKeysError(null);
  }

  const isLocked = useCallback(
    (key: string): boolean => status?.envLocked.includes(key) ?? false,
    [status],
  );

  const isConfigured = useCallback(
    (key: string): boolean => status?.configured[key] ?? false,
    [status],
  );

  async function submitToken() {
    const token = setupToken.trim();
    if (!token) {
      setTokenError('Enter the setup token from your Termux output.');
      return;
    }
    if (!serverUrl) {
      setTokenError('No server selected. Go back and enter a server URL.');
      return;
    }

    const attempt = ++attemptRef.current;
    const isCurrent = () =>
      mountedRef.current && attempt === attemptRef.current;

    setTokenError(null);
    setIsValidatingToken(true);
    try {
      const result = await getSetupStatus(serverUrl, token);
      if (!isCurrent()) return;
      if (!result.ok) {
        setTokenError(result.message);
        return;
      }
      setSetupTokenState(token);
      setStatus(result.status);
      setStep('storage');
    } catch {
      if (!isCurrent()) return;
      setTokenError('Something went wrong. Check your connection and try again.');
    } finally {
      if (isCurrent()) {
        setIsValidatingToken(false);
      }
    }
  }

  /**
   * Step-level required check: local only, never saves (Finish owns the
   * save). Returns the error message when required fields are blank.
   */
  function requiredError(
    values: Record<string, string>,
    keys: readonly string[],
  ): string | null {
    const missing = missingSetupFields(values, keys, {
      envLocked: status?.envLocked ?? [],
      configured: status?.configured ?? {},
    });
    if (missing.length === 0) {
      return null;
    }
    const anyKeepable = keys.some(
      (key) => !isLocked(key) && isConfigured(key),
    );
    return anyKeepable
      ? 'Fill in every remaining field to continue, or leave already-configured fields blank to keep them.'
      : 'Fill in every field to continue.';
  }

  function submitStorage() {
    const error = requiredError(r2, R2_FIELD_KEYS);
    if (error) {
      setStorageError(error);
      return;
    }
    setStep('playback');
  }

  function submitPlayback() {
    const error = requiredError(playback, PLAYBACK_FIELD_KEYS);
    if (error) {
      setPlaybackError(error);
      return;
    }
    // A blank URL here means configured-but-kept (required-but-missing was
    // rejected above), so only an entered value needs a format check.
    const workerUrl = playback.WORKER_STREAM_URL.trim();
    if (workerUrl) {
      const urlError = validateWorkerStreamUrl(workerUrl);
      if (urlError) {
        setPlaybackError(urlError);
        return;
      }
    }
    setStep('apikeys');
  }

  function submitApiKeys() {
    const error = requiredError(apiKeys, API_KEY_FIELD_KEYS);
    if (error) {
      setApiKeysError(error);
      return;
    }
    setStep('finish');
  }

  const runFinish = useCallback(async () => {
    if (finishRunRef.current) {
      return;
    }
    finishRunRef.current = true;
    if (!serverUrl) {
      setFinishPhase('failed');
      setFinishError('No server selected. Go back and enter a server URL.');
      return;
    }

    const attempt = ++attemptRef.current;
    const isCurrent = () =>
      mountedRef.current && attempt === attemptRef.current;

    setFinishError(null);
    try {
      // Single save of every entered value (locked keys and blanks excluded
      // by the patch builder). An empty patch means everything is already
      // configured or managed — just check readiness. A retry skips the save
      // when the values are unchanged since the last successful one, so a
      // poll-only retry never restarts the API again.
      const patch = buildConfigPatch(
        { ...r2, ...playback, ...apiKeys },
        status?.envLocked ?? [],
      );
      const lastSaved = lastSavedPatchRef.current;
      if (Object.keys(patch).length > 0 && !patchesEqual(patch, lastSaved)) {
        setFinishPhase('saving');
        const saved = await saveSetupConfig(serverUrl, setupToken, patch);
        if (!isCurrent()) return;
        if (!saved.ok) {
          // The entered values are preserved: go back and edit, or retry.
          setFinishPhase('failed');
          setFinishError(saved.message);
          return;
        }
        lastSavedPatchRef.current = patch;
      }

      setFinishPhase('polling');
      pollControllerRef.current?.abort();
      const controller = new AbortController();
      pollControllerRef.current = controller;
      const poll = await pollHealthUntilReady(serverUrl, {
        signal: controller.signal,
      });
      if (!isCurrent()) return;
      if (!poll.ready) {
        setFinishPhase('failed');
        setFinishError(
          poll.lastDb === 'down'
            ? "The server came back, but its database is unavailable. Make sure the database is reachable, then retry — your settings are kept."
            : 'The server is still starting. Wait a moment, then retry — your settings are kept.',
        );
        return;
      }
      setFinishPhase('done');
      toastImperative.show({
        type: 'success',
        text1: 'Server setup complete.',
        visibilityTime: 4000,
      });
      // Validate the kept session against the restarted backend BEFORE
      // clearing the flag: while pending, the root guard's own checkAuth
      // effect stays dormant, and resolving the status first means its
      // idle-only gate (shouldInitAuth) also skips after the clear — so this
      // is the single refresh. A valid session lands on home, anything else
      // on login.
      const { useAuthStore } = await import(
        '@/features/auth/store/authStore'
      );
      await useAuthStore.getState().checkAuth();
      if (!isCurrent()) return;
      const sessionValid =
        useAuthStore.getState().status === 'authenticated';
      // Clear first: a stale flag would make AuthGuard yield forever and trap
      // every later unauthenticated redirect. Clearing bumps no request id,
      // so ServerGuard stays silent and this replace is the single owner.
      useServerStore.getState().clearSetupPending();
      router.replace(sessionValid ? '/home' : '/login');
    } catch (error) {
      if (!isCurrent()) return;
      // AbortError means the user navigated away mid-poll: stay silent.
      if (
        error !== null &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'AbortError'
      ) {
        return;
      }
      setFinishPhase('failed');
      setFinishError('Something went wrong. Check your connection and try again.');
    }
  }, [router, serverUrl, setupToken, r2, playback, apiKeys, status]);

  // Auto-run once on entering the finish step.
  useEffect(() => {
    if (step === 'finish' && finishPhase === 'idle') {
      void runFinish();
    }
  }, [step, finishPhase, runFinish]);

  function retryFinish() {
    if (finishPhase === 'saving' || finishPhase === 'polling') {
      return;
    }
    finishRunRef.current = false;
    void runFinish();
  }

  function goBack() {
    if (step === 'token') {
      router.back();
      return;
    }
    if (step === 'finish') {
      // Stop the poll loop and reset for a clean re-entry; entered values,
      // the setup token, and the last saved patch are preserved, so an
      // unchanged re-entry only polls while edits go out again.
      pollControllerRef.current?.abort();
      pollControllerRef.current = null;
      finishRunRef.current = false;
      attemptRef.current += 1;
      setFinishPhase('idle');
      setFinishError(null);
      setStep('apikeys');
      return;
    }
    setStep(
      step === 'storage' ? 'token' : step === 'playback' ? 'storage' : 'playback',
    );
  }

  const isBusy =
    isValidatingToken || finishPhase === 'saving' || finishPhase === 'polling';

  return {
    serverUrl,
    step,
    setupToken,
    setSetupToken,
    tokenError,
    isValidatingToken,
    submitToken,
    status,
    isLocked,
    isConfigured,
    r2,
    setR2Field,
    storageError,
    submitStorage,
    playback,
    setPlaybackField,
    playbackError,
    submitPlayback,
    apiKeys,
    setApiKeyField,
    apiKeysError,
    submitApiKeys,
    finishPhase,
    finishError,
    retryFinish,
    goBack,
    isBusy,
  };
}

function patchesEqual(
  patch: Record<string, string>,
  lastSaved: Record<string, string> | null,
): boolean {
  if (lastSaved === null) {
    return false;
  }
  const keys = Object.keys(patch);
  const lastKeys = Object.keys(lastSaved);
  return (
    keys.length === lastKeys.length &&
    keys.every((key) => lastSaved[key] === patch[key])
  );
}
