// --------------------------------------------------------------------------
// HTTP 429 (rate limit) helpers — pure, zero imports.
//
// The backend API is guarded by @nestjs/throttler (60 req/min): an exceeded
// limit answers 429 with a `Retry-After` header carrying seconds, suffixed
// per named throttler (`Retry-After-<name>`). Values may also arrive as an
// HTTP-date per the standard. A numeric body `retryAfter` (the worker's 429
// convention, seconds) is accepted as a fallback.
//
// node:test executes these directly: pollingResolver itself is too heavy to
// load in node (Axios client chain), so the 429 branch there delegates all
// parsing to this module.
// --------------------------------------------------------------------------

/** True when the error carries an HTTP 429 response status. */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== "object") return false;
  return (response as { status?: unknown }).status === 429;
}

function headerEntries(headers: unknown): [string, unknown][] {
  if (!headers || typeof headers !== "object") return [];
  const container = headers as { toJSON?: unknown };
  // AxiosHeaders instances serialize via toJSON(); plain objects pass through.
  const plain =
    typeof container.toJSON === "function"
      ? (container.toJSON as () => unknown).call(headers)
      : headers;
  if (!plain || typeof plain !== "object" || Array.isArray(plain)) return [];
  return Object.entries(plain as Record<string, unknown>);
}

/**
 * One Retry-After value to milliseconds: finite non-negative seconds
 * (number or numeric string), an HTTP-date, or the first element of an
 * array. Anything else reads null so the caller falls through to the next
 * candidate or its default backoff.
 */
function parseDelayValue(value: unknown, nowMs: number): number | null {
  if (Array.isArray(value)) {
    return value.length > 0 ? parseDelayValue(value[0], nowMs) : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value * 1000 : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return numeric >= 0 ? numeric * 1000 : null;
    }
    const dateMs = Date.parse(trimmed);
    if (!Number.isNaN(dateMs)) {
      return Math.max(0, dateMs - nowMs);
    }
  }
  return null;
}

/**
 * Milliseconds to wait for an HTTP 429: the Retry-After header when present
 * and parseable (exact or `-suffixed` name, case-insensitive), else a
 * numeric body `retryAfter` in seconds, else null (the caller backs off on
 * its poll-stage interval). Always null for non-429 errors.
 */
export function parseRateLimitDelayMs(
  error: unknown,
  nowMs: number = Date.now(),
): number | null {
  if (!isRateLimitError(error)) return null;
  const response = (error as { response?: unknown }).response as
    | { headers?: unknown; data?: unknown }
    | undefined;
  for (const [name, value] of headerEntries(response?.headers)) {
    const lower = name.toLowerCase();
    if (lower === "retry-after" || lower.startsWith("retry-after-")) {
      const delayMs = parseDelayValue(value, nowMs);
      if (delayMs !== null) return delayMs;
    }
  }
  const data = response?.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return parseDelayValue(
      (data as Record<string, unknown>).retryAfter,
      nowMs,
    );
  }
  return null;
}
