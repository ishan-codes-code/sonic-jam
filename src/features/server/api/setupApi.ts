import {
  HealthDbState,
  HealthStorage,
  parseHealthPayload,
  parseStorageModes,
  StorageMode,
} from './serverValidation';

// --------------------------------------------------------------------------
// Backend setup API (first-launch setup wizard).
//
// Plain global fetch only: setup endpoints authenticate with the one-time
// setup token (`X-Setup-Token` header), never with the user's access/refresh
// tokens, and must bypass the apiClient interceptors entirely (no token
// attach, no 401 refresh, no global toasts). Contract:
// docs/contracts/backend-setup.md.
//
// The setup token and entered secrets live in wizard memory only: nothing
// here persists them, and backend messages are redacted before display so a
// server echo can never unmask a secret the UI keeps hidden.
// --------------------------------------------------------------------------

export const R2_FIELD_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY',
  'R2_SECRET_KEY',
  'R2_BUCKET',
] as const;

export type R2FieldKey = (typeof R2_FIELD_KEYS)[number];

export const PLAYBACK_FIELD_KEYS = [
  'WORKER_STREAM_URL',
  'JWT_PLAYBACK_SECRET',
] as const;

export type PlaybackFieldKey = (typeof PLAYBACK_FIELD_KEYS)[number];

export const API_KEY_FIELD_KEYS = [
  'YOUTUBE_API_KEY',
  'LASTFM_API_KEY',
] as const;

export type ApiKeyFieldKey = (typeof API_KEY_FIELD_KEYS)[number];

/** Storage mode selector key. Only ever sent as `"local"` or `"r2"`. */
export const STORAGE_MODE_KEY = 'STORAGE_MODE' as const;

/**
 * Every key the wizard may submit. The database URL is deliberately absent:
 * it is entered only in the Termux installer, never in the app.
 * `STORAGE_MODE` is sent only to backends that advertise `storageModes` —
 * older backends reject unknown keys, so their R2 patch stays exactly as it
 * was.
 */
export const SETUP_CONFIG_KEYS = [
  STORAGE_MODE_KEY,
  ...R2_FIELD_KEYS,
  ...PLAYBACK_FIELD_KEYS,
  ...API_KEY_FIELD_KEYS,
] as const;

export type SetupConfigKey = (typeof SETUP_CONFIG_KEYS)[number];

const DEFAULT_STATUS_TIMEOUT_MS = 15_000;
// Saving runs DB validation + Drizzle migrations before responding.
const DEFAULT_SAVE_TIMEOUT_MS = 60_000;
// Post-save readiness poll: the API restarts after every save, so the poll
// must outlast supervisor restarts on slow devices.
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_POLL_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_ATTEMPT_TIMEOUT_MS = 8_000;

const REDACTED = '••••••';
// Secrets shorter than this are skipped so redaction cannot mangle ordinary
// words that happen to match a tiny value.
const MIN_REDACT_LENGTH = 4;

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

function isAbortError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'AbortError'
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Redact every occurrence of the given secrets from text meant for display.
 * Guards against a backend echoing a submitted value inside an error
 * message the UI would otherwise show unmasked.
 */
export function redactSecrets(text: string, secrets: string[]): string {
  let redacted = text;
  for (const secret of secrets) {
    if (typeof secret !== 'string' || secret.length < MIN_REDACT_LENGTH) {
      continue;
    }
    redacted = redacted.split(secret).join(REDACTED);
  }
  return redacted;
}

// --------------------------------------------------------------------------
// GET /setup/status
// --------------------------------------------------------------------------

export interface SetupStatusInfo {
  setupRequired: boolean;
  configured: Record<string, boolean>;
  envLocked: string[];
  /**
   * Effective storage modes the wizard may offer. Defaults to `['r2']` when
   * the backend predates mode advertisement.
   */
  storageModes: StorageMode[];
  /**
   * True only when the backend actually sent `storageModes`. The wizard sends
   * `STORAGE_MODE` solely in that case — older backends reject unknown keys.
   */
  storageModesAdvertised: boolean;
}

export type SetupStatusResult =
  | { ok: true; status: SetupStatusInfo }
  | {
      ok: false;
      code: 'unauthorized' | 'unreachable' | 'timeout' | 'unexpected';
      message: string;
    };

interface StatusOptions {
  timeoutMs?: number;
}

export async function getSetupStatus(
  serverUrl: string,
  setupToken: string,
  options?: StatusOptions,
): Promise<SetupStatusResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_STATUS_TIMEOUT_MS;
  try {
    const response = await fetchWithTimeout(
      `${serverUrl}/setup/status`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Setup-Token': setupToken,
        },
      },
      timeoutMs,
    );

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        code: 'unauthorized',
        message:
          'This setup token wasn\u2019t accepted. Find "SETUP TOKEN: ..." in your Termux output and try again.',
      };
    }

    const data: unknown = await response.json().catch(() => null);
    const status = parseSetupStatus(data);
    if (!response.ok || status === null) {
      return {
        ok: false,
        code: 'unexpected',
        message:
          'The server gave an unexpected response. Make sure it is a Sonic backend and try again.',
      };
    }
    return { ok: true, status };
  } catch (error) {
    if (isAbortError(error)) {
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

function parseSetupStatus(data: unknown): SetupStatusInfo | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const record = data as {
    setupRequired?: unknown;
    configured?: unknown;
    envLocked?: unknown;
    storageModes?: unknown;
  };
  if (typeof record.setupRequired !== 'boolean') {
    return null;
  }
  if (
    record.configured === null ||
    typeof record.configured !== 'object' ||
    Array.isArray(record.configured)
  ) {
    return null;
  }
  const configured: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(record.configured)) {
    if (typeof value !== 'boolean') {
      return null;
    }
    configured[key] = value;
  }
  if (!Array.isArray(record.envLocked)) {
    return null;
  }
  const envLocked: string[] = [];
  for (const entry of record.envLocked) {
    if (typeof entry !== 'string') {
      return null;
    }
    envLocked.push(entry);
  }
  return {
    setupRequired: record.setupRequired,
    configured,
    envLocked,
    storageModes: parseStorageModes({ storageModes: record.storageModes }),
    storageModesAdvertised: Array.isArray(record.storageModes),
  };
}

// --------------------------------------------------------------------------
// POST /setup/config
// --------------------------------------------------------------------------

export interface SavedSetupConfig {
  saved: boolean;
  setupRequired: boolean;
  migration?: { status: string; steps: string[] };
  restartRequired?: boolean;
  /** Effective storage mode after the save (new backends only). */
  storageMode?: StorageMode;
  /**
   * Names (never values) of secrets the backend generated during the save,
   * e.g. the local-mode playback secret. Display-safe.
   */
  generatedKeys?: string[];
}

export type SaveSetupConfigResult =
  | { ok: true; result: SavedSetupConfig }
  | {
      ok: false;
      code:
        | 'unauthorized'
        | 'rejected'
        | 'migration'
        | 'unreachable'
        | 'timeout'
        | 'unexpected';
      message: string;
      migrationSteps?: string[];
    };

interface SaveOptions {
  timeoutMs?: number;
}

/**
 * Build a submittable patch from wizard values: trims entries, drops blanks,
 * and never includes environment-locked keys (the backend rejects those).
 * Values are otherwise sent verbatim — no normalization beyond the trim —
 * so the playback secret reaches the backend exactly as entered.
 */
export function buildConfigPatch(
  values: Record<string, string>,
  envLocked: string[],
): Record<string, string> {
  const locked = new Set(envLocked);
  const patch: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (locked.has(key)) {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    patch[key] = trimmed;
  }
  return patch;
}

export interface RequiredFieldOptions {
  /** Keys managed by the backend environment: never required, never sent. */
  envLocked?: string[];
  /**
   * Keys the backend reports as already configured: a blank field keeps the
   * saved value, so blanks are allowed (the patch builder drops them).
   */
  configured?: Record<string, boolean>;
}

/**
 * Wizard field keys required for a storage mode. R2 keeps the existing
 * storage + playback + API-key fields; Local needs only the API keys — no R2
 * credentials, no worker stream URL, and no playback secret (the backend
 * generates and persists one during a local save).
 */
export function requiredKeysForMode(mode: StorageMode): readonly string[] {
  if (mode === 'local') {
    return API_KEY_FIELD_KEYS;
  }
  return [...R2_FIELD_KEYS, ...PLAYBACK_FIELD_KEYS, ...API_KEY_FIELD_KEYS];
}

/**
 * True when the server already holds storage configuration (any R2 key, any
 * playback key, or an explicit mode). Used to warn that picking a different
 * mode switches storage without migrating existing songs.
 */
export function hasStoredStorageConfig(
  configured: Record<string, boolean>,
): boolean {
  return (
    configured[STORAGE_MODE_KEY] === true ||
    R2_FIELD_KEYS.some((key) => configured[key] === true) ||
    PLAYBACK_FIELD_KEYS.some((key) => configured[key] === true)
  );
}

/**
 * Keys of `keys` that are required but blank: neither environment-locked nor
 * already configured, and without an entered value. Empty means the step may
 * continue. Every wizard field is required under these rules — there is no
 * skip, and partial steps are never submitted.
 */
export function missingSetupFields(
  values: Record<string, string>,
  keys: readonly string[],
  opts?: RequiredFieldOptions,
): string[] {
  const locked = new Set(opts?.envLocked ?? []);
  const configured = opts?.configured ?? {};
  return keys.filter(
    (key) =>
      !locked.has(key) && !configured[key] && !values[key]?.trim(),
  );
}

/**
 * Human-readable validation for the worker stream URL: a valid http(s) URL.
 * Unlike server URLs, sub-paths are allowed — only the scheme and host are
 * checked. Returns null when the input is acceptable.
 */
export function validateWorkerStreamUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return 'Enter your worker stream URL.';
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "That doesn't look like a valid URL (use http:// or https://).";
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'Only http:// and https:// URLs are supported.';
  }
  if (!parsed.hostname) {
    return "That doesn't look like a valid URL.";
  }
  return null;
}

export async function saveSetupConfig(
  serverUrl: string,
  setupToken: string,
  patch: Record<string, string>,
  options?: SaveOptions,
): Promise<SaveSetupConfigResult> {
  const entries = Object.entries(patch);
  if (
    entries.length === 0 ||
    entries.some(
      ([key, value]) => typeof key !== 'string' || typeof value !== 'string',
    )
  ) {
    // Client-side backstop; the hook never submits an empty patch.
    return {
      ok: false,
      code: 'rejected',
      message: 'Nothing to save yet.',
    };
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_SAVE_TIMEOUT_MS;
  try {
    const response = await fetchWithTimeout(
      `${serverUrl}/setup/config`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Setup-Token': setupToken,
        },
        body: JSON.stringify(patch),
      },
      timeoutMs,
    );

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        code: 'unauthorized',
        message:
          'This setup token wasn\u2019t accepted. Find "SETUP TOKEN: ..." in your Termux output and try again.',
      };
    }

    const data: unknown = await response.json().catch(() => null);
    const secrets = [setupToken, ...entries.map(([, value]) => value)];

    const migrationSteps = parseMigrationSteps(data);
    if (!response.ok && migrationSteps !== null) {
      return {
        ok: false,
        code: 'migration',
        message:
          "Couldn't apply the database configuration. Check the connection string and try again.",
        migrationSteps: migrationSteps.map((step) =>
          redactSecrets(step, secrets),
        ),
      };
    }

    if (!response.ok) {
      const backendMessage =
        data !== null && typeof data === 'object'
          ? (data as { message?: unknown }).message
          : null;
      return {
        ok: false,
        code: 'rejected',
        message:
          typeof backendMessage === 'string' && backendMessage
            ? redactSecrets(backendMessage, secrets)
            : 'The server rejected this configuration.',
      };
    }

    const saved = parseSavedConfig(data);
    if (saved === null) {
      return {
        ok: false,
        code: 'unexpected',
        message:
          'The server gave an unexpected response. Make sure it is a Sonic backend and try again.',
      };
    }
    return { ok: true, result: saved };
  } catch (error) {
    if (isAbortError(error)) {
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

function parseMigrationSteps(data: unknown): string[] | null {
  if (data === null || typeof data !== 'object') {
    return null;
  }
  const migration = (data as { migration?: unknown }).migration;
  if (migration === null || typeof migration !== 'object') {
    return null;
  }
  const steps = (migration as { steps?: unknown }).steps;
  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }
  if (steps.some((step) => typeof step !== 'string')) {
    return null;
  }
  return steps as string[];
}

function parseSavedConfig(data: unknown): SavedSetupConfig | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const record = data as {
    saved?: unknown;
    setupRequired?: unknown;
    migration?: unknown;
    restartRequired?: unknown;
    storageMode?: unknown;
    generatedKeys?: unknown;
  };
  if (record.saved !== true || typeof record.setupRequired !== 'boolean') {
    return null;
  }
  const saved: SavedSetupConfig = {
    saved: true,
    setupRequired: record.setupRequired,
  };
  const migration = parseMigrationBlock(record.migration);
  if (migration !== null) {
    saved.migration = migration;
  }
  if (typeof record.restartRequired === 'boolean') {
    saved.restartRequired = record.restartRequired;
  }
  if (record.storageMode === 'local' || record.storageMode === 'r2') {
    saved.storageMode = record.storageMode;
  }
  if (
    Array.isArray(record.generatedKeys) &&
    record.generatedKeys.every((key) => typeof key === 'string')
  ) {
    saved.generatedKeys = [...record.generatedKeys];
  }
  return saved;
}

function parseMigrationBlock(
  data: unknown,
): { status: string; steps: string[] } | null {
  if (data === null || typeof data !== 'object') {
    return null;
  }
  const { status, steps } = data as { status?: unknown; steps?: unknown };
  if (typeof status !== 'string' || !Array.isArray(steps)) {
    return null;
  }
  if (steps.some((step) => typeof step !== 'string')) {
    return null;
  }
  return { status, steps: steps as string[] };
}

// --------------------------------------------------------------------------
// Post-save readiness poll (public GET /health).
// --------------------------------------------------------------------------

export interface HealthPollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  attemptTimeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
  /**
   * When set, readiness additionally requires `features.storage` to equal
   * this mode — the wizard passes its submitted selection so a save that did
   * not take effect (e.g. an environment override) cannot finish silently.
   * Omit for older backends, where storage never affects readiness.
   */
  expectStorage?: StorageMode;
}

export interface HealthPollResult {
  ready: boolean;
  lastDb: HealthDbState | null;
  lastStorage: HealthStorage | null;
}

/**
 * Poll public /health until the backend reports setup complete
 * (`setupRequired === false` and `db === 'ok'`, plus the expected storage
 * mode when `expectStorage` is set). Every failed attempt — refused
 * connection during the API restart, timeout, unparsable body — is tolerated
 * until the overall deadline; only then does the poll report not-ready with
 * the last known database and storage state. Throws an `AbortError` when
 * `signal` aborts.
 */
export async function pollHealthUntilReady(
  serverUrl: string,
  options?: HealthPollOptions,
): Promise<HealthPollResult> {
  const intervalMs = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
  const attemptTimeoutMs =
    options?.attemptTimeoutMs ?? DEFAULT_POLL_ATTEMPT_TIMEOUT_MS;
  const sleep = options?.sleep ?? defaultSleep;
  const startedAt = Date.now();
  let lastDb: HealthDbState | null = null;
  let lastStorage: HealthStorage | null = null;

  for (;;) {
    if (options?.signal?.aborted) {
      throw abortError();
    }
    try {
      const response = await fetchWithTimeout(
        `${serverUrl}/health`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        },
        attemptTimeoutMs,
      );
      const health = parseHealthPayload(
        await response.json().catch(() => null),
      );
      if (health !== null) {
        lastDb = health.db;
        lastStorage = health.storage;
        const storageOk =
          options?.expectStorage === undefined ||
          health.storage === options.expectStorage;
        if (!health.setupRequired && health.db === 'ok' && storageOk) {
          return { ready: true, lastDb, lastStorage };
        }
      }
    } catch {
      // Restart outage, timeout, or malformed body: keep polling.
    }
    if (options?.signal?.aborted) {
      throw abortError();
    }
    if (Date.now() - startedAt >= timeoutMs) {
      return { ready: false, lastDb, lastStorage };
    }
    await sleep(intervalMs);
  }
}

// --------------------------------------------------------------------------
// Current configured storage (public GET /health, one shot).
// --------------------------------------------------------------------------

interface CurrentStorageOptions {
  timeoutMs?: number;
}

/**
 * Read the server's currently configured storage mode from public /health.
 * The wizard uses it to preselect the mode on an already-configured server
 * instead of silently switching it. Fail-open: any failure yields null and
 * the wizard falls back to R2.
 */
export async function getCurrentStorage(
  serverUrl: string,
  options?: CurrentStorageOptions,
): Promise<HealthStorage | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_STATUS_TIMEOUT_MS;
  try {
    const response = await fetchWithTimeout(
      `${serverUrl}/health`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      timeoutMs,
    );
    const health = parseHealthPayload(
      await response.json().catch(() => null),
    );
    return health?.storage ?? null;
  } catch {
    return null;
  }
}
