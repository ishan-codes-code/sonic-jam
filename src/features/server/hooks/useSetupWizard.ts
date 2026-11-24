import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { toastImperative } from '@/features/Toast/utils/toastSingleton';
import { useServerStore } from '../store/serverStore';
import {
  buildConfigPatch,
  DATABASE_URL_KEY,
  getSetupStatus,
  missingR2Fields,
  pollHealthUntilReady,
  R2FieldKey,
  saveSetupConfig,
  SetupStatusInfo,
} from '../api/setupApi';

export type SetupWizardStep = 'token' | 'database' | 'storage' | 'initialize';

export type InitializePhase =
  | 'idle'
  | 'saving'
  | 'polling'
  | 'failed'
  | 'done';

/**
 * First-launch backend setup wizard state machine.
 *
 * Steps: setup token → database → storage (optional) → initialize. All
 * secrets (setup token, DATABASE_URL, R2 keys) live in memory only — they
 * are never written to AsyncStorage/SecureStore, never logged, and never
 * cleared just because the API restarts mid-flow. Entered values survive
 * recoverable errors, step navigation, and initialize retries.
 *
 * Completion is reported only after public /health confirms
 * `setupRequired === false` and `db === 'ok'`; a successful save alone
 * (the API exits right after responding) never finishes the wizard.
 */
export function useSetupWizard() {
  const router = useRouter();
  const serverUrl = useServerStore((s) => s.serverUrl);

  const [step, setStep] = useState<SetupWizardStep>('token');

  // Step 1 — setup token (memory only, validated via GET /setup/status).
  const [setupToken, setSetupTokenState] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [status, setStatus] = useState<SetupStatusInfo | null>(null);

  // Step 2 — database (memory only).
  const [databaseUrl, setDatabaseUrlState] = useState('');
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [migrationSteps, setMigrationSteps] = useState<string[] | null>(null);
  const [isSavingDatabase, setIsSavingDatabase] = useState(false);

  // Step 3 — storage (memory only, optional).
  const [r2, setR2State] = useState<Record<R2FieldKey, string>>({
    R2_ACCOUNT_ID: '',
    R2_ACCESS_KEY: '',
    R2_SECRET_KEY: '',
    R2_BUCKET: '',
  });
  const [storageError, setStorageError] = useState<string | null>(null);

  // Step 4 — initialize (submit storage patch if complete, then poll).
  const [initPhase, setInitPhase] = useState<InitializePhase>('idle');
  const [initError, setInitError] = useState<string | null>(null);

  // Same stale-async discipline as useServerSetup: results that land after
  // unmount or a newer attempt are ignored. The poll additionally gets an
  // AbortController so leaving the step stops the network loop promptly.
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);
  const pollControllerRef = useRef<AbortController | null>(null);
  // Set once the storage patch saves, so an initialize retry re-polls
  // instead of re-submitting (each save restarts the API again).
  const storageSavedRef = useRef(false);
  // Guards runInitialize itself: a double-invoked effect must not submit
  // the storage patch twice. Cleared on retry and when leaving the step.
  const initRunRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollControllerRef.current?.abort();
    };
  }, []);

  function setSetupToken(next: string) {
    setSetupTokenState(next);
    setTokenError(null);
  }

  function setDatabaseUrl(next: string) {
    setDatabaseUrlState(next);
    setDatabaseError(null);
    setMigrationSteps(null);
  }

  function setR2Field(key: R2FieldKey, next: string) {
    setR2State((prev) => ({ ...prev, [key]: next }));
    setStorageError(null);
  }

  const isLocked = useCallback(
    (key: string): boolean => status?.envLocked.includes(key) ?? false,
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
      setStep('database');
    } catch {
      if (!isCurrent()) return;
      setTokenError('Something went wrong. Check your connection and try again.');
    } finally {
      if (isCurrent()) {
        setIsValidatingToken(false);
      }
    }
  }

  async function submitDatabase() {
    // Environment-managed: nothing to enter or submit.
    if (isLocked(DATABASE_URL_KEY)) {
      setStep('storage');
      return;
    }
    // Already configured: an empty field keeps the existing value.
    const value = databaseUrl.trim();
    if (!value) {
      if (status?.configured[DATABASE_URL_KEY]) {
        setStep('storage');
        return;
      }
      setDatabaseError('Enter your PostgreSQL connection string.');
      return;
    }
    if (!/^postgres(ql)?:\/\//i.test(value)) {
      setDatabaseError(
        "That doesn't look like a PostgreSQL connection string (it starts with postgres://).",
      );
      return;
    }
    if (!serverUrl) {
      setDatabaseError('No server selected. Go back and enter a server URL.');
      return;
    }

    const attempt = ++attemptRef.current;
    const isCurrent = () =>
      mountedRef.current && attempt === attemptRef.current;

    setDatabaseError(null);
    setMigrationSteps(null);
    setIsSavingDatabase(true);
    try {
      const result = await saveSetupConfig(serverUrl, setupToken, {
        [DATABASE_URL_KEY]: value,
      });
      if (!isCurrent()) return;
      if (!result.ok) {
        // The entered value is preserved: fix and resubmit.
        setDatabaseError(result.message);
        setMigrationSteps(result.migrationSteps ?? null);
        return;
      }
      setStep('storage');
    } catch {
      if (!isCurrent()) return;
      setDatabaseError('Something went wrong. Check your connection and try again.');
    } finally {
      if (isCurrent()) {
        setIsSavingDatabase(false);
      }
    }
  }

  function submitStorage() {
    const missing = missingR2Fields(r2, status?.envLocked ?? []);
    const filled = (Object.keys(r2) as R2FieldKey[]).filter(
      (key) => !isLocked(key) && r2[key].trim(),
    );
    if (filled.length > 0 && missing.length > 0) {
      // Partial R2 configuration is never submitted: complete or skip.
      setStorageError(
        'Fill in every R2 field, or use "Skip for now" to set up storage later.',
      );
      return;
    }
    setStep('initialize');
  }

  function skipStorage() {
    // Values stay in state for back-navigation; initialize only submits a
    // complete set, so a skipped partial entry can never leak into a patch.
    setStorageError(null);
    setStep('initialize');
  }

  const runInitialize = useCallback(async () => {
    if (initRunRef.current) {
      return;
    }
    initRunRef.current = true;
    if (!serverUrl) {
      setInitPhase('failed');
      setInitError('No server selected. Go back and enter a server URL.');
      return;
    }

    const attempt = ++attemptRef.current;
    const isCurrent = () =>
      mountedRef.current && attempt === attemptRef.current;

    setInitError(null);
    try {
      // Submit the storage patch first (only when complete — a skipped
      // partial entry must never leak into a patch); the database patch
      // already saved at step 2. Each successful save restarts the API, so
      // a retry never re-submits an already-saved patch.
      const patch = buildConfigPatch(r2, status?.envLocked ?? []);
      const hasCompleteR2 =
        Object.keys(patch).length > 0 &&
        missingR2Fields(r2, status?.envLocked ?? []).length === 0;
      if (hasCompleteR2 && !storageSavedRef.current) {
        setInitPhase('saving');
        const saved = await saveSetupConfig(serverUrl, setupToken, patch);
        if (!isCurrent()) return;
        if (!saved.ok) {
          setInitPhase('failed');
          setInitError(saved.message);
          return;
        }
        storageSavedRef.current = true;
      }

      setInitPhase('polling');
      pollControllerRef.current?.abort();
      const controller = new AbortController();
      pollControllerRef.current = controller;
      const poll = await pollHealthUntilReady(serverUrl, {
        signal: controller.signal,
      });
      if (!isCurrent()) return;
      if (!poll.ready) {
        setInitPhase('failed');
        setInitError(
          poll.lastDb === 'down'
            ? "The server came back, but its database is unavailable. Make sure the database is reachable, then retry — your settings are kept."
            : 'The server is still starting. Wait a moment, then retry — your settings are kept.',
        );
        return;
      }
      setInitPhase('done');
      toastImperative.show({
        type: 'success',
        text1: 'Setup complete. Please sign in.',
        visibilityTime: 4000,
      });
      // Clear first: a stale flag would make AuthGuard yield forever and trap
      // every later unauthenticated redirect. Clearing bumps no request id,
      // so ServerGuard stays silent and this replace is the single owner.
      useServerStore.getState().clearSetupPending();
      router.replace('/login');
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
      setInitPhase('failed');
      setInitError('Something went wrong. Check your connection and try again.');
    }
  }, [router, serverUrl, setupToken, r2, status]);

  // Auto-run once on entering the initialize step.
  useEffect(() => {
    if (step === 'initialize' && initPhase === 'idle') {
      void runInitialize();
    }
  }, [step, initPhase, runInitialize]);

  function retryInitialize() {
    if (initPhase === 'saving' || initPhase === 'polling') {
      return;
    }
    initRunRef.current = false;
    void runInitialize();
  }

  function goBack() {
    if (step === 'token') {
      router.back();
      return;
    }
    if (step === 'initialize') {
      // Stop the poll loop and reset for a clean re-entry; entered values
      // and the setup token are preserved.
      pollControllerRef.current?.abort();
      pollControllerRef.current = null;
      storageSavedRef.current = false;
      initRunRef.current = false;
      setInitPhase('idle');
      setInitError(null);
      setStep('storage');
      return;
    }
    setStep(step === 'database' ? 'token' : 'database');
  }

  const isBusy =
    isValidatingToken ||
    isSavingDatabase ||
    initPhase === 'saving' ||
    initPhase === 'polling';

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
    databaseUrl,
    setDatabaseUrl,
    databaseError,
    migrationSteps,
    isSavingDatabase,
    submitDatabase,
    r2,
    setR2Field,
    storageError,
    submitStorage,
    skipStorage,
    initPhase,
    initError,
    retryInitialize,
    goBack,
    isBusy,
  };
}
