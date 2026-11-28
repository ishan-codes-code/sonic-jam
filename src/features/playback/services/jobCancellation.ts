// --------------------------------------------------------------------------
// Shared job-cancellation signal (zero imports).
//
// Used by the single-song poller and the playlist pending-track runs alike:
// any async playback job that must die silently on a server switch or a
// superseded run throws this, and owners let it through without marking
// failures or toasting. Lives here (not in pollingResolver) so the
// dependency-light playlist service can share the exact identity without
// importing the heavy poller chain — node:test loads this module directly.
// --------------------------------------------------------------------------

export class JobPollingCancelledError extends Error {
  constructor() {
    super('Job polling cancelled (server switched)');
    this.name = 'JobPollingCancelledError';
  }
}

export function isJobPollingCancelled(error: unknown): boolean {
  return error instanceof JobPollingCancelledError;
}
