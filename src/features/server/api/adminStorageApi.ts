import {
  buildConfigPatch,
  missingSetupFields,
  PLAYBACK_FIELD_KEYS,
  R2_FIELD_KEYS,
  redactSecrets,
  STORAGE_MODE_KEY,
} from './setupApi';
import { parseStorageModes, type StorageMode } from './serverValidation';

// --------------------------------------------------------------------------
// Admin storage API (authenticated settings screen).
//
// Bearer-authenticated through the shared apiClient, which callers INJECT:
// this module must never import apiClient, SecureStore, or any native module
// itself, so it stays dependency-free and runnable under node:test (same
// discipline as setupApi). Contract: docs/contracts/admin-storage.md.
//
// No setup token is used here (that belongs to first-launch setup only) and
// DATABASE_URL is never collected or sent.
// --------------------------------------------------------------------------

/** The six credential keys a POST may carry (r2 only). */
export const ADMIN_STORAGE_VALUE_KEYS = [
  ...R2_FIELD_KEYS,
  ...PLAYBACK_FIELD_KEYS,
] as const;

export type AdminStorageValueKey = (typeof ADMIN_STORAGE_VALUE_KEYS)[number];

/** Minimal authenticated HTTP surface (axios-compatible). */
export interface AdminStorageHttpClient {
  get<T>(url: string, config?: { timeout?: number }): Promise<{ data: T }>;
  post<T>(
    url: string,
    body: unknown,
    config?: { timeout?: number },
  ): Promise<{ data: T }>;
}

// The shared client defaults to 5 minutes; admin calls must fail fast enough
// to keep the save flow (and its unknown-result handling) usable.
export const ADMIN_STORAGE_GET_TIMEOUT_MS = 15_000;
// Saving restarts the backend; the response lands before the restart.
export const ADMIN_STORAGE_SAVE_TIMEOUT_MS = 60_000;

// --------------------------------------------------------------------------
// Admin visibility
// --------------------------------------------------------------------------

/**
 * Admin visibility: only an explicit "admin" role counts. A missing role
 * (older backends, or a signed-out user) always means a non-admin.
 */
export function isAdmin(
  user: { role?: string } | null | undefined,
): boolean {
  return user?.role === 'admin';
}

/** Display label for a storage mode (matches the setup wizard's labels). */
export function adminStorageModeLabel(mode: StorageMode): string {
  return mode === 'local' ? 'Local storage' : 'Cloudflare R2';
}

// --------------------------------------------------------------------------
// GET /admin/storage
// --------------------------------------------------------------------------

export interface AdminStorageInfo {
  mode: StorageMode;
  modeLocked: boolean;
  storageModes: StorageMode[];
  /** Configured flags for the six credential keys (missing keys read false). */
  configured: Record<string, boolean>;
  envLocked: string[];
  /**
   * True when the playback secret is required even though it shows as
   * configured (e.g. the worker was reinstalled and the secret must be
   * re-entered to match it).
   */
  playbackSecretRequired: boolean;
}

export type AdminStorageLoadResult =
  | { ok: true; info: AdminStorageInfo }
  | {
      ok: false;
      code:
        | 'unauthorized'
        | 'forbidden'
        | 'outdated'
        | 'unreachable'
        | 'timeout'
        | 'unexpected';
      message: string;
    };

export function parseAdminStorageInfo(data: unknown): AdminStorageInfo | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const record = data as {
    mode?: unknown;
    modeLocked?: unknown;
    storageModes?: unknown;
    configured?: unknown;
    envLocked?: unknown;
    playbackSecretRequired?: unknown;
  };
  if (record.mode !== 'local' && record.mode !== 'r2') {
    return null;
  }
  if (typeof record.modeLocked !== 'boolean') {
    return null;
  }
  if (
    record.configured === null ||
    typeof record.configured !== 'object' ||
    Array.isArray(record.configured)
  ) {
    return null;
  }
  // Only the six credential keys are read; extras are ignored and missing
  // keys read as unconfigured (first-time r2 requires every field).
  const configured: Record<string, boolean> = {};
  const configuredRecord = record.configured as Record<string, unknown>;
  for (const key of ADMIN_STORAGE_VALUE_KEYS) {
    const value = configuredRecord[key];
    if (value === undefined) {
      configured[key] = false;
      continue;
    }
    if (typeof value !== 'boolean') {
      return null;
    }
    configured[key] = value;
  }
  if (
    !Array.isArray(record.envLocked) ||
    record.envLocked.some((entry) => typeof entry !== 'string')
  ) {
    return null;
  }
  if (typeof record.playbackSecretRequired !== 'boolean') {
    return null;
  }
  return {
    mode: record.mode,
    modeLocked: record.modeLocked,
    // Same capability parsing as the wizard: older shapes read R2-only,
    // unknown entries are dropped, never empty.
    storageModes: parseStorageModes({ storageModes: record.storageModes }),
    configured,
    envLocked: [...record.envLocked],
    playbackSecretRequired: record.playbackSecretRequired,
  };
}

export async function getAdminStorage(
  client: AdminStorageHttpClient,
): Promise<AdminStorageLoadResult> {
  try {
    const { data } = await client.get<unknown>('/admin/storage', {
      timeout: ADMIN_STORAGE_GET_TIMEOUT_MS,
    });
    const info = parseAdminStorageInfo(data);
    if (!info) {
      return {
        ok: false,
        code: 'unexpected',
        message:
          'The server gave an unexpected response. Make sure it is a Sonic backend and try again.',
      };
    }
    return { ok: true, info };
  } catch (error) {
    const status = responseStatus(error);
    if (status === 401) {
      return {
        ok: false,
        code: 'unauthorized',
        message: 'Your session is no longer valid. Sign in again to continue.',
      };
    }
    if (status === 403) {
      return {
        ok: false,
        code: 'forbidden',
        message:
          'Admin access is required to view storage settings. Sign in with an admin account.',
      };
    }
    if (status === 404) {
      return {
        ok: false,
        code: 'outdated',
        message:
          'This backend is too old for storage settings. Ask your server administrator to update it.',
      };
    }
    if (status !== null) {
      return {
        ok: false,
        code: 'unexpected',
        message:
          responseMessage(error) ??
          'The server gave an unexpected response. Try again.',
      };
    }
    if (isTimeoutError(error)) {
      return {
        ok: false,
        code: 'timeout',
        message: 'The server took too long to respond. Try again.',
      };
    }
    return {
      ok: false,
      code: 'unreachable',
      message:
        "Couldn't reach the server. Check that the backend is running and try again.",
    };
  }
}

// --------------------------------------------------------------------------
// Required fields + patch building (reuses the wizard's validation)
// --------------------------------------------------------------------------

export interface AdminRequiredOptions {
  /** Keys managed by the backend environment: never required, never sent. */
  envLocked: string[];
  /**
   * Keys the backend reports as already configured: a blank field keeps the
   * saved value, so blanks are allowed (the patch builder drops them).
   */
  configured: Record<string, boolean>;
  /**
   * When true, the playback secret stays required even though it shows as
   * configured.
   */
  playbackSecretRequired: boolean;
}

/**
 * Required-but-blank keys for the admin form. Local mode needs nothing; r2
 * needs the six credential keys through the wizard's missingSetupFields —
 * except the playback secret under playbackSecretRequired, which is forced
 * back to required. Empty means the form may save.
 */
export function missingAdminStorageFields(
  values: Record<string, string>,
  mode: StorageMode,
  opts: AdminRequiredOptions,
): string[] {
  if (mode === 'local') {
    return [];
  }
  const configured = opts.playbackSecretRequired
    ? { ...opts.configured, JWT_PLAYBACK_SECRET: false }
    : opts.configured;
  return missingSetupFields(values, [...ADMIN_STORAGE_VALUE_KEYS], {
    envLocked: opts.envLocked,
    configured,
  });
}

export interface AdminStoragePatchInput {
  selectedMode: StorageMode;
  values: Record<string, string>;
  envLocked: string[];
  modeLocked: boolean;
  currentMode: StorageMode;
}

/**
 * Build the POST patch: STORAGE_MODE is always sent (the current mode when
 * the environment locks it — the selector is disabled then, so the selection
 * already equals it). The six credential values go out only for an effective
 * r2 mode, trimmed with blanks and env-locked keys omitted via the wizard's
 * buildConfigPatch; local sends the mode alone. Settings-only r2 updates
 * (same mode + entered values) are a normal patch.
 */
export function buildAdminStoragePatch(
  input: AdminStoragePatchInput,
): Record<string, string> {
  const effectiveMode = input.modeLocked
    ? input.currentMode
    : input.selectedMode;
  const patch: Record<string, string> = {
    [STORAGE_MODE_KEY]: effectiveMode,
  };
  if (effectiveMode !== 'r2') {
    return patch;
  }
  const values: Record<string, string> = {};
  for (const key of ADMIN_STORAGE_VALUE_KEYS) {
    values[key] = input.values[key] ?? '';
  }
  return { ...patch, ...buildConfigPatch(values, input.envLocked) };
}

/**
 * True when there is anything to save: a mode change (impossible while
 * locked), or — for an effective r2 mode — any entered value in an
 * env-unlocked field. Drives the disabled Save button.
 */
export function hasAdminStorageChanges(
  selectedMode: StorageMode,
  values: Record<string, string>,
  info: AdminStorageInfo,
): boolean {
  if (!info.modeLocked && selectedMode !== info.mode) {
    return true;
  }
  const effectiveMode = info.modeLocked ? info.mode : selectedMode;
  if (effectiveMode !== 'r2') {
    return false;
  }
  const locked = new Set(info.envLocked);
  return ADMIN_STORAGE_VALUE_KEYS.some(
    (key) => !locked.has(key) && (values[key] ?? '').trim() !== '',
  );
}

// --------------------------------------------------------------------------
// POST /admin/storage
// --------------------------------------------------------------------------

export interface AdminStorageSaved {
  saved: true;
  storageMode: StorageMode;
  restartRequired?: boolean;
  /** Names (never values) of secrets the backend generated. Display-safe. */
  generatedKeys?: string[];
}

export type AdminStorageSaveResult =
  | { ok: true; result: AdminStorageSaved }
  | {
      ok: false;
      code:
        | 'rejected'
        | 'unauthorized'
        | 'forbidden'
        | 'outdated'
        | 'unreachable'
        | 'timeout'
        | 'unexpected';
      message: string;
    };

export function parseAdminSaveResult(data: unknown): AdminStorageSaved | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const record = data as {
    saved?: unknown;
    storageMode?: unknown;
    restartRequired?: unknown;
    generatedKeys?: unknown;
  };
  if (record.saved !== true) {
    return null;
  }
  if (record.storageMode !== 'local' && record.storageMode !== 'r2') {
    return null;
  }
  const saved: AdminStorageSaved = {
    saved: true,
    storageMode: record.storageMode,
  };
  if (typeof record.restartRequired === 'boolean') {
    saved.restartRequired = record.restartRequired;
  }
  if (
    Array.isArray(record.generatedKeys) &&
    record.generatedKeys.every((key) => typeof key === 'string')
  ) {
    saved.generatedKeys = [...record.generatedKeys];
  }
  return saved;
}

export async function saveAdminStorage(
  client: AdminStorageHttpClient,
  patch: Record<string, string>,
): Promise<AdminStorageSaveResult> {
  if (typeof patch[STORAGE_MODE_KEY] !== 'string') {
    // Client-side backstop; the hook always sends STORAGE_MODE.
    return {
      ok: false,
      code: 'rejected',
      message: 'Nothing to save yet.',
    };
  }
  try {
    const { data } = await client.post<unknown>('/admin/storage', patch, {
      timeout: ADMIN_STORAGE_SAVE_TIMEOUT_MS,
    });
    const saved = parseAdminSaveResult(data);
    if (!saved) {
      return {
        ok: false,
        code: 'unexpected',
        message:
          'The server gave an unexpected response. Make sure it is a Sonic backend and try again.',
      };
    }
    return { ok: true, result: saved };
  } catch (error) {
    // A backend echo could unmask a submitted value the UI keeps hidden, so
    // server messages are redacted against the patch (wizard discipline).
    const secrets = Object.values(patch);
    const status = responseStatus(error);
    if (status === 400) {
      const raw = responseMessage(error);
      return {
        ok: false,
        code: 'rejected',
        message:
          raw !== null
            ? redactSecrets(raw, secrets)
            : 'The server rejected these settings.',
      };
    }
    if (status === 401) {
      return {
        ok: false,
        code: 'unauthorized',
        message: 'Your session is no longer valid. Sign in again to continue.',
      };
    }
    if (status === 403) {
      return {
        ok: false,
        code: 'forbidden',
        message:
          'Admin access is required to change storage settings. Sign in with an admin account.',
      };
    }
    if (status === 404) {
      return {
        ok: false,
        code: 'outdated',
        message:
          'This backend is too old for storage settings. Ask your server administrator to update it.',
      };
    }
    if (status !== null) {
      const raw = responseMessage(error);
      return {
        ok: false,
        code: 'unexpected',
        message:
          raw !== null
            ? redactSecrets(raw, secrets)
            : 'The server gave an unexpected response. Try again.',
      };
    }
    // Timeout / connection loss: the save may or may not have landed. The
    // hook treats this as an unknown result (reset + server check + resubmit),
    // never as a rejection.
    if (isTimeoutError(error)) {
      return {
        ok: false,
        code: 'timeout',
        message: 'The request timed out, so the result is unknown.',
      };
    }
    return {
      ok: false,
      code: 'unreachable',
      message: 'The connection was lost, so the result is unknown.',
    };
  }
}

// --------------------------------------------------------------------------
// Unknown-result retry planning (POST timed out / lost connection)
// --------------------------------------------------------------------------

export type UnknownStorageCheck =
  | { ok: true; mode: StorageMode }
  | { ok: false };

export interface UnknownRetryPlan {
  /**
   * True when the follow-up GET proves the save landed (a mode change that
   * is now active): continue to the health poll instead of resubmitting.
   */
  confirmed: boolean;
  message: string;
}

/**
 * Decide what a follow-up GET /admin/storage proves after an unknown POST.
 * A mode change the server now reports is proof the save landed; anything
 * else — including every settings-only update, whose new values leave no
 * verifiable trace — must say so and offer a resubmit.
 */
export function planUnknownResultRetry(args: {
  submittedMode: StorageMode;
  previousMode: StorageMode;
  check: UnknownStorageCheck;
}): UnknownRetryPlan {
  const { submittedMode, previousMode, check } = args;
  if (!check.ok) {
    return {
      confirmed: false,
      message:
        'The save may or may not have applied, and the server could not be reached to confirm it. You can save again, or leave and check later.',
    };
  }
  if (check.mode === submittedMode) {
    if (submittedMode !== previousMode) {
      return {
        confirmed: true,
        message:
          'The new storage mode is active. Waiting for the server to finish restarting.',
      };
    }
    return {
      confirmed: false,
      message:
        'The new values could not be confirmed — a settings-only change leaves nothing the app can verify. You can save again to be sure.',
    };
  }
  if (submittedMode !== previousMode) {
    return {
      confirmed: false,
      message: `The server still reports ${adminStorageModeLabel(check.mode)}, so the save may not have applied. You can save again.`,
    };
  }
  return {
    confirmed: false,
    message: `The server now reports ${adminStorageModeLabel(check.mode)} instead of ${adminStorageModeLabel(previousMode)}. You can save again, or leave and check later.`,
  };
}

// --------------------------------------------------------------------------
// Error-shape helpers (axios-compatible, no axios import)
// --------------------------------------------------------------------------

function responseStatus(error: unknown): number | null {
  if (error !== null && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: unknown } }).response;
    if (response !== null && typeof response === 'object') {
      const status = (response as { status?: unknown }).status;
      if (typeof status === 'number') {
        return status;
      }
    }
  }
  return null;
}

function responseMessage(error: unknown): string | null {
  if (error !== null && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: unknown } }).response;
    if (response !== null && typeof response === 'object') {
      const data = (response as { data?: unknown }).data;
      if (data !== null && typeof data === 'object') {
        const message = (data as { message?: unknown }).message;
        if (typeof message === 'string' && message) {
          return message;
        }
        if (
          Array.isArray(message) &&
          message.length > 0 &&
          typeof message[0] === 'string'
        ) {
          return message[0];
        }
      }
    }
  }
  return null;
}

function isTimeoutError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  const record = error as { code?: unknown; message?: unknown };
  if (record.code === 'ECONNABORTED') {
    return true;
  }
  return (
    typeof record.message === 'string' && /timeout/i.test(record.message)
  );
}
