import {
  normalizeServerUrl,
  validateServerUrl,
} from '../utils/serverConfig';

// --------------------------------------------------------------------------
// Server connection validation (unauthenticated bootstrap request).
//
// Strategy (grounded in the live backend, 2026-11-21):
// - GET /health does NOT exist (404), so it cannot validate today's servers.
// - GET /auth/me without a token answers 401 + the NestJS auth-layer body
//   `{ statusCode: 401, message: 'Authentication invalid', … }` on the Sonic
//   backend. That endpoint is confirmed in docs/contracts/authentication.md,
//   safe to call without credentials, and — when the full shape matches — a
//   reasonable Sonic heuristic (see docs/contracts/server-health.md: a bare
//   401 alone proves nothing, since any guarded endpoint answers 401).
// Plain global fetch is used deliberately: no auth headers, no interceptors,
// no global toasts — validation errors stay inline on the setup screen.
// When the backend ships GET /health, add it here as the first probe.
// --------------------------------------------------------------------------

export type ServerCheckFailureCode =
  | 'invalid-url'
  | 'unreachable'
  | 'timeout'
  | 'not-sonic';

export type ServerCheckResult =
  | { ok: true; serverUrl: string }
  | { ok: false; code: ServerCheckFailureCode; message: string };

// Render free-tier cold starts were observed above 10s; 15s keeps additions
// usable without hanging the UI indefinitely.
const DEFAULT_TIMEOUT_MS = 15_000;

interface CheckOptions {
  timeoutMs?: number;
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
    const response = await fetch(`${normalized}/auth/me`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    const data: unknown = await response.json().catch(() => null);

    // A Sonic backend guards this endpoint with its NestJS auth layer: no
    // token → 401 + `{ statusCode: 401, message: string, … }` (verified live;
    // see docs/contracts/authentication.md). Require that shape — a generic
    // 401 or unrelated JSON from a non-Sonic host must not pass.
    const body =
      data !== null && typeof data === 'object'
        ? (data as { statusCode?: unknown; message?: unknown })
        : null;
    if (
      response.status === 401 &&
      body !== null &&
      body.statusCode === 401 &&
      typeof body.message === 'string'
    ) {
      return { ok: true, serverUrl: normalized };
    }

    return {
      ok: false,
      code: 'not-sonic',
      message:
        "That address responded, but it doesn't look like a Sonic server.",
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
