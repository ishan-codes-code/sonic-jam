// --------------------------------------------------------------------------
// Session generation: invalidates in-flight auth refreshes across server switches.
//
// Bumped synchronously by performServerSwitch() before its first await, so a
// refresh started against Server A can detect that the session moved on and
// must not save tokens, clear tokens, touch progress-sync headers, or reset
// auth state for Server B. Mirrors the polling/radio generation guards.
//
// Kept dependency-free on purpose: apiClient and tokenManager both read it,
// and neither may statically import the server store/switch modules (cycles).
//
// The listener registry below preserves that direction: dependents subscribe
// (apiClient settles its stale refresh queue at switch time) without any new
// import edges. Listeners run synchronously inside invalidateSession(), so
// they must be fast, must never touch shared refresh flags (the still-running
// refresh keeps ownership until it settles), and must never throw.
// --------------------------------------------------------------------------

let sessionGeneration = 0;

type SessionInvalidationListener = () => void;

const invalidationListeners = new Set<SessionInvalidationListener>();

/** Current session generation. Capture before starting a refresh. */
export function getSessionGeneration(): number {
  return sessionGeneration;
}

/**
 * Run `listener` synchronously on every future invalidation. Returns an
 * unsubscribe function. For settling stale waiters only — never for writes.
 */
export function onSessionInvalidated(
  listener: SessionInvalidationListener,
): () => void {
  invalidationListeners.add(listener);
  return () => {
    invalidationListeners.delete(listener);
  };
}

/** Invalidate every in-flight refresh. Never throws. */
export function invalidateSession(): void {
  sessionGeneration++;
  invalidationListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A listener must never break the switch.
    }
  });
}
