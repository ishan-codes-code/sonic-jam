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
// --------------------------------------------------------------------------

let sessionGeneration = 0;

/** Current session generation. Capture before starting a refresh. */
export function getSessionGeneration(): number {
  return sessionGeneration;
}

/** Invalidate every in-flight refresh. Never throws. */
export function invalidateSession(): void {
  sessionGeneration++;
}
