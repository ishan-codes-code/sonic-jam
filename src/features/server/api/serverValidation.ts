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
// body must be a JSON object whose `db` field is one of the documented
// readiness states. The status itself is ignored so a backend reporting
// trouble (e.g. 503 with `db: 'down'`) still yields its specific message.
// --------------------------------------------------------------------------

export type ServerCheckFailureCode =
  | 'invalid-url'
  | 'unreachable'
  | 'timeout'
  | 'not-sonic'
  | 'db-unconfigured'
  | 'db-down';

export type HealthStorage = 'r2' | 'none';

export type ServerCheckResult =
  | { ok: true; serverUrl: string; storage: HealthStorage | null }
  | { ok: false; code: ServerCheckFailureCode; message: string };

// Render free-tier cold starts were observed above 10s; 15s keeps additions
// usable without hanging the UI indefinitely.
const DEFAULT_TIMEOUT_MS = 15_000;

interface CheckOptions {
  timeoutMs?: number;
}

type DbState = 'ok' | 'down' | 'unconfigured';

function parseDbState(body: unknown): DbState | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }
  const db = (body as { db?: unknown }).db;
  if (db === 'ok' || db === 'down' || db === 'unconfigured') {
    return db;
  }
  return null;
}

function parseStorage(body: object): HealthStorage | null {
  const storage = (body as { storage?: unknown }).storage;
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

    const data: unknown = await response.json().catch(() => null);
    const db = parseDbState(data);

    if (db === null) {
      return {
        ok: false,
        code: 'not-sonic',
        message:
          "That address responded, but it doesn't look like a Sonic server.",
      };
    }

    if (db === 'unconfigured') {
      return {
        ok: false,
        code: 'db-unconfigured',
        message:
          "This server's database isn't configured yet. The server administrator needs to complete the backend setup before you can sign in.",
      };
    }

    if (db === 'down') {
      return {
        ok: false,
        code: 'db-down',
        message:
          "This server's database is unavailable right now. Try again in a little while, or check with the server administrator.",
      };
    }

    // Storage readiness is informational only: R2 is not required to accept
    // a server URL, and its absence limits only storage-backed features.
    return {
      ok: true,
      serverUrl: normalized,
      storage: parseStorage(data as object),
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
