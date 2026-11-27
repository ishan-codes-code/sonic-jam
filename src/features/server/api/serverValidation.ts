import {
  normalizeServerUrl,
  validateServerUrl,
} from '../utils/serverConfig';

// --------------------------------------------------------------------------
// Server connection validation (unauthenticated bootstrap request).
//
// Strategy: GET /health, the public Sonic backend endpoint (no auth token is
// sent, and the shared apiClient is bypassed so no interceptors, token
// refresh, or global toasts can fire — validation errors stay inline on the
// setup screen). Contract: docs/contracts/server-health.md.
//
// Proof of a Sonic backend is the response SHAPE, not the HTTP status: the
// body must identify as the Sonic backend (`app`), carry the setup flag, and
// report a documented database state. The status itself is ignored so a
// backend reporting trouble (e.g. 503 with `db: 'down'`) still yields its
// specific message.
// --------------------------------------------------------------------------

export type ServerCheckFailureCode =
  | 'invalid-url'
  | 'unreachable'
  | 'timeout'
  | 'not-sonic'
  | 'db-unconfigured'
  | 'db-down';

export type HealthStorage = 'r2' | 'local' | 'none';

/**
 * Storage modes a backend can be configured with. `storageModes` (plural) is
 * the capability list the backend advertises; `storage` (singular) is the
 * currently configured mode. Backends that predate the Local mode omit
 * `storageModes`, which reads as R2-only.
 */
export type StorageMode = 'local' | 'r2';

export type HealthDbState = 'ok' | 'down' | 'unconfigured';

export interface HealthPayload {
  setupRequired: boolean;
  db: HealthDbState;
  storage: HealthStorage | null;
  storageModes: StorageMode[];
}

export type ServerCheckResult =
  | {
      ok: true;
      serverUrl: string;
      storage: HealthStorage | null;
      storageModes: StorageMode[];
      setupRequired: boolean;
    }
  | { ok: false; code: ServerCheckFailureCode; message: string };

// Render free-tier cold starts were observed above 10s; 15s keeps additions
// usable without hanging the UI indefinitely.
const DEFAULT_TIMEOUT_MS = 15_000;

const SONIC_BACKEND_APP = 'sonic-backend';

interface CheckOptions {
  timeoutMs?: number;
}

/**
 * Validate an unauthenticated /health body against the backend contract.
 * Shared with the setup readiness poll so validation and polling can never
 * disagree on what a Sonic backend looks like.
 */
export function parseHealthPayload(body: unknown): HealthPayload | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }
  const record = body as {
    app?: unknown;
    setupRequired?: unknown;
    db?: unknown;
    features?: unknown;
  };
  if (record.app !== SONIC_BACKEND_APP) {
    return null;
  }
  if (typeof record.setupRequired !== 'boolean') {
    return null;
  }
  const db = record.db;
  if (db !== 'ok' && db !== 'down' && db !== 'unconfigured') {
    return null;
  }
  return {
    setupRequired: record.setupRequired,
    db,
    storage: parseStorage(record.features),
    storageModes: parseStorageModes(record.features),
  };
}

function parseStorage(features: unknown): HealthStorage | null {
  if (features === null || typeof features !== 'object') {
    return null;
  }
  const storage = (features as { storage?: unknown }).storage;
  if (storage === 'r2' || storage === 'local' || storage === 'none') {
    return storage;
  }
  return null;
}

/**
 * Capability list for the setup wizard's mode selector. A missing or
 * unusable value means an older R2-only backend, so it defaults to `['r2']`
 * — never empty, so the wizard always has a mode to offer. Unknown entries
 * are dropped, never trusted.
 */
export function parseStorageModes(features: unknown): StorageMode[] {
  if (features === null || typeof features !== 'object') {
    return ['r2'];
  }
  const modes = (features as { storageModes?: unknown }).storageModes;
  if (!Array.isArray(modes)) {
    return ['r2'];
  }
  const known = modes.filter(
    (mode): mode is StorageMode => mode === 'local' || mode === 'r2',
  );
  return known.length > 0 ? [...new Set(known)] : ['r2'];
}

export async function checkServerConnection(
  input: string,
  options?: CheckOptions,
): Promise<ServerCheckResult> {
  const normalized = normalizeServerUrl(input);
  if (!normalized) {
    return {
      ok: false,
      code: 'invalid-url',
      message: validateServerUrl(input) ?? 'Enter a valid server URL.',
    };
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${normalized}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    const health = parseHealthPayload(
      await response.json().catch(() => null),
    );

    if (health === null) {
      return {
        ok: false,
        code: 'not-sonic',
        message:
          "That address responded, but it doesn't look like a Sonic server.",
      };
    }

    // A down database is retryable and never opens the setup wizard, even if
    // the backend still reports that setup is required.
    if (health.db === 'down') {
      return {
        ok: false,
        code: 'db-down',
        message:
          "This server's database is unavailable right now. Try again in a little while, or check with the server administrator.",
      };
    }

    // Setup still required: the wizard opens only when the database is up.
    // An unconfigured database means the Termux installer step was skipped —
    // the database URL is entered there, never in the app — so this stays a
    // retryable message instead of opening the wizard.
    if (health.setupRequired) {
      if (health.db === 'unconfigured') {
        return {
          ok: false,
          code: 'db-unconfigured',
          message:
            "This server's database isn't configured yet. Run the Termux installer on your server and enter the database URL, then try again.",
        };
      }
      return {
        ok: true,
        serverUrl: normalized,
        storage: health.storage,
        storageModes: health.storageModes,
        setupRequired: true,
      };
    }

    if (health.db === 'unconfigured') {
      return {
        ok: false,
        code: 'db-unconfigured',
        message:
          "This server's database isn't configured yet. The server administrator needs to complete the backend setup before you can sign in.",
      };
    }

    // Storage readiness is informational only: R2 is not required to accept
    // a server URL, and its absence limits only storage-backed features.
    // A Local backend is a valid Sonic server exactly like an R2 one.
    return {
      ok: true,
      serverUrl: normalized,
      storage: health.storage,
      storageModes: health.storageModes,
      setupRequired: false,
    };
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      return {
        ok: false,
        code: 'timeout',
        message:
          'The server took too long to respond. If it was asleep, wait a moment and try again.',
      };
    }
    return {
      ok: false,
      code: 'unreachable',
      message:
        "Couldn't reach that address. Check the URL and your connection, then try again.",
    };
  } finally {
    clearTimeout(timer);
  }
}
