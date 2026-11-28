// --------------------------------------------------------------------------
// Refresh-failure classification (pure, no dependencies).
//
// apiClient's 401 interceptor and tokenManager's pre-flight refresh are the
// duplicated refresh pair (see AGENTS.md hard rule 4): exactly one rule
// decides whether a failed refresh ends the session. A refresh the server
// ANSWERED (any HTTP status — e.g. the token was rotated away or revoked)
// clears the session, while a refresh that never got an answer (backend
// restart, outage, client timeout) must PRESERVE it — otherwise every
// backend restart would log the user out.
// --------------------------------------------------------------------------

/**
 * True when a token-refresh failure is network-level: no HTTP response was
 * received (connection refused/dropped mid-restart, DNS failure, client
 * timeout). Callers must keep the stored tokens and auth state and let the
 * failed request reject retryably instead of logging the user out.
 *
 * Anything the server answered (a present `response`, whatever the status)
 * and non-transport errors (e.g. the missing-token backstop) return false:
 * those keep the existing clear-the-session behavior.
 */
export function isNetworkRefreshError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  const record = error as {
    response?: unknown;
    request?: unknown;
    code?: unknown;
  };
  // The server answered (rejected the refresh): not a network failure.
  if (record.response !== null && record.response !== undefined) {
    return false;
  }
  // Axios marks a sent-but-unanswered request with `request`. Timeouts carry
  // ECONNABORTED with the same shape.
  if (record.request !== null && record.request !== undefined) {
    return true;
  }
  return (
    record.code === 'ERR_NETWORK' ||
    record.code === 'ECONNABORTED' ||
    record.code === 'ETIMEDOUT'
  );
}
