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

export type HealthStorage = 'r2' | 'none';

export type HealthDbState = 'ok' | 'down' | 'unconfigured';

export interface HealthPayload {
  setupRequired: boolean;
  db: HealthDbState;
  storage: HealthStorage | null;
}

export type ServerCheckResult =
  | {
      ok: true;
      serverUrl: string;
      storage: HealthStorage | null;
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
  };
}

function parseStorage(features: unknown): HealthStorage | null {
  if (features === null || typeof features !== 'object') {
    return null;
  }
  const storage = (features as { storage?: unknown }).storage;
  if (storage === 'r2' || storage === 'none') {
    return storage;
  }
  return null;
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

    // Valid Sonic backend requiring initial setup: route into the setup
    // wizard instead of reporting an invalid server.
    if (health.setupRequired) {
      return {
        ok: true,
        serverUrl: normalized,
        storage: health.storage,
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
    return {
      ok: true,
      serverUrl: normalized,
      storage: health.storage,
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
