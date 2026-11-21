// --------------------------------------------------------------------------
// Server URL configuration (pure helpers, no dependencies).
//
// Single place that knows what a valid Sonic server address looks like:
// normalization, validation messages, and the build-time fallback.
// --------------------------------------------------------------------------

export const BAKED_SERVER_URL: string | undefined =
  process.env.EXPO_PUBLIC_API_URL;

export type ServerUrlErrorCode =
  | 'empty'
  | 'missing-scheme'
  | 'malformed'
  | 'protocol'
  | 'path'
  | 'host';

type ParseResult =
  | { url: string }
  | { error: ServerUrlErrorCode };

const SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

function parseServerUrl(input: string): ParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { error: 'empty' };
  }

  // The scheme is required and never guessed: defaulting a bare LAN address
  // (192.168.1.10:3000) to https:// would fail confusingly on plain-HTTP hosts.
  if (!SCHEME_PATTERN.test(trimmed)) {
    return { error: 'missing-scheme' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { error: 'malformed' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'protocol' };
  }

  if (!parsed.hostname) {
    return { error: 'host' };
  }

  // The client issues root-relative calls (e.g. /auth/me), so a sub-path base
  // could never work. Reject it explicitly instead of silently dropping it.
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    return { error: 'path' };
  }

  // origin = scheme://host[:port], lowercased, no trailing slash, no
  // query/fragment. Default ports (:80/:443) are omitted by the URL parser.
  return { url: parsed.origin };
}

/**
 * Normalize a user-supplied server address to its canonical origin form
 * (e.g. `https://sonic.example.com/` → `https://sonic.example.com`).
 * Returns null when the input is not an acceptable server URL.
 */
export function normalizeServerUrl(input: string): string | null {
  const result = parseServerUrl(input);
  return 'url' in result ? result.url : null;
}

const ERROR_MESSAGES: Record<ServerUrlErrorCode, string> = {
  empty: 'Enter your server URL.',
  'missing-scheme':
    'Include the scheme, e.g. https://sonic.example.com or http://192.168.1.10:3000.',
  malformed: "That doesn't look like a valid URL.",
  protocol: 'Only http:// and https:// URLs are supported.',
  path: 'Enter just the server address, without extra path segments.',
  host: "That doesn't look like a valid URL.",
};

/**
 * Human-readable validation feedback for the setup form.
 * Returns null when the input is acceptable.
 */
export function validateServerUrl(input: string): string | null {
  const result = parseServerUrl(input);
  if ('url' in result) return null;
  return ERROR_MESSAGES[result.error];
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Best-effort loopback check used for the Android localhost hint.
 * Never blocks: loopback is legal (e.g. a Termux server on the same device).
 */
export function isLocalHostUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  // Only parse directly when an explicit scheme is present: a bare
  // `host:port` would otherwise parse `host:` as a scheme and hide the
  // real hostname (e.g. `localhost:3000` is not scheme `localhost:`).
  const candidate = SCHEME_PATTERN.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return LOCAL_HOSTNAMES.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}
