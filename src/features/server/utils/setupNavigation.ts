// --------------------------------------------------------------------------
// Setup + auth routing decisions (pure, UI-framework-free).
//
// Single source of truth for the boot/setup redirects, shared by the root
// guards in `src/app/_layout.tsx`, the connect flow in
// `useServerSetup.ts`, and the node:test suite next to this file. It has no
// React, React Native, or expo-router imports, so the tests execute the
// EXACT decision code the guards run — only the React scheduling around it
// is left to manual verification.
//
// Navigator-readiness contract (the first-launch race this module encodes):
// - The root Stack stays mounted across server/auth transitions; guards
//   overlay loaders instead of replacing the navigator, so a dispatched
//   action always finds its navigator and is never dropped with an
//   "unhandled action" warning.
// - Exactly one owner per redirect: ServerGuard owns setup routing
//   (server-setup / setup-wizard / first-launch login), AuthGuard owns
//   auth routing (login / home). `src/app/index.tsx` renders null.
// - Post-connect routing is commit-driven, not screen-driven: the connect
//   flow commits (serverUrl, setupPending, setupRequestId) atomically and
//   ServerGuard navigates on the fresh commit. The setup screen may unmount
//   freely afterwards — committed wizard navigation is never cancelled.
// - AuthGuard yields while the server is unknown or setup is pending, so it
//   can never redirect to Login ahead of the Setup Wizard.
// - Auth initialization runs only from the untouched 'idle' state
//   (`shouldInitAuth`): boot checks the session once, and the wizard's own
//   completion check never triggers a second refresh from the guard.
// --------------------------------------------------------------------------

import type { ServerCheckResult } from '../api/serverValidation';
import { normalizeServerUrl } from './serverConfig';

// Local mirrors of the store status unions (structurally identical to
// `ServerStatus` / `AuthStatus`). Deliberately NOT imported: the stores pull
// `@/`-aliased modules that single-file `tsc` (how this repo runs node:test
// suites — see the `.test.ts` header) cannot resolve without tsconfig paths,
// while this module must stay dependency-light. Drift is still caught: the
// guard call sites pass the real store values, so a widened store union
// fails to compile against these aliases.
export type GuardServerStatus = 'loading' | 'unconfigured' | 'configured';
export type GuardAuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';

export type SetupNavMethod = 'push' | 'replace';

// Every href below is a registered route (see `src/app/`): setup screens in
// the `(auth)` group, `/login` for unauthenticated users, `/home` for the
// authenticated app landing. Guards must never navigate anywhere else.
export type SetupNavHref = '/server-setup' | '/setup-wizard' | '/login' | '/home';

export interface SetupNavAction {
  method: SetupNavMethod;
  href: SetupNavHref;
}

// --------------------------------------------------------------------------
// Segment predicates (`useSegments()` shape, groups included; the root index
// route reports `[]` — expo-router pops the trailing 'index').
// --------------------------------------------------------------------------

export function isAuthRoute(segments: readonly string[]): boolean {
  return segments[0] === '(auth)';
}

export function isServerSetupRoute(segments: readonly string[]): boolean {
  return segments[0] === '(auth)' && segments[1] === 'server-setup';
}

export function isSetupWizardRoute(segments: readonly string[]): boolean {
  return segments[0] === '(auth)' && segments[1] === 'setup-wizard';
}

// --------------------------------------------------------------------------
// ServerGuard: owns server-setup + setup-wizard + first-launch login routing.
// --------------------------------------------------------------------------

export interface ServerGuardMemory {
  /** Server status seen by the previous guard run (transition detection). */
  prevStatus: GuardServerStatus;
  /** Last connect commit this guard already routed (one-shot per commit). */
  handledSetupRequestId: number;
}

export interface ServerGuardSnapshot {
  status: GuardServerStatus;
  setupPending: boolean;
  setupRequestId: number;
  segments: readonly string[];
}

/**
 * Pure body of the ServerGuard redirect effect. The component keeps `memory`
 * in a ref, passes the live store snapshot + segments, then writes the
 * snapshot's status/id back into `memory` after every run.
 *
 * One-shot semantics: a commit (`setupRequestId` bump from `setServer()`)
 * routes exactly once, even if the effect re-runs before segments settle
 * (dev StrictMode double-invoke included — the second run sees the same id
 * and stays silent). Backing out of the wizard changes no commit, so the
 * guard never drags the user forward again; reconnecting commits a fresh id
 * and routes again.
 */
export function serverGuardAction(
  memory: ServerGuardMemory,
  snap: ServerGuardSnapshot,
): SetupNavAction | null {
  if (snap.status === 'loading') {
    return null;
  }
  if (snap.status === 'unconfigured') {
    // Continuous ensure is safe here: no legitimate away-route exists while
    // unconfigured (Login implies a configured server), so this only ever
    // fires on boot before the first replace lands.
    return isServerSetupRoute(snap.segments)
      ? null
      : { method: 'replace', href: '/server-setup' };
  }
  // Configured: act only on a fresh connect commit. A boot with a stored URL
  // bumps no id, so `handledSetupRequestId` already matches and the guard
  // stays silent (AuthGuard owns the login redirect there).
  if (snap.setupRequestId === memory.handledSetupRequestId) {
    return null;
  }
  if (snap.setupPending) {
    // Push (not replace) so the wizard's back button returns to the setup
    // screen, where the URL can be changed and reconnected.
    return isSetupWizardRoute(snap.segments)
      ? null
      : { method: 'push', href: '/setup-wizard' };
  }
  // Ready commit straight after the first-launch setup screen: advance to
  // Login. Review-mode commits (previous status already 'configured') stay
  // put — the connect flow pops back to Login itself.
  if (
    memory.prevStatus === 'unconfigured' &&
    isServerSetupRoute(snap.segments)
  ) {
    return { method: 'replace', href: '/login' };
  }
  return null;
}

// --------------------------------------------------------------------------
// AuthGuard: owns login/home routing. Yields while setup owns the screen.
// --------------------------------------------------------------------------

export interface AuthGuardSnapshot {
  authStatus: GuardAuthStatus;
  serverStatus: GuardServerStatus;
  setupPending: boolean;
  segments: readonly string[];
}

export function authGuardAction(
  snap: AuthGuardSnapshot,
): SetupNavAction | null {
  // Setup owns routing until the server is configured AND no wizard flow is
  // pending. This is what prevents the Login redirect from racing (or
  // preceding) the Setup Wizard on the commit that configures the server.
  if (snap.serverStatus !== 'configured' || snap.setupPending) {
    return null;
  }
  if (snap.authStatus === 'idle' || snap.authStatus === 'loading') {
    return null;
  }
  if (snap.authStatus === 'authenticated') {
    // Authenticated users leave the auth group for the app; `[]` is the boot
    // index route (index renders null now — nothing else bounces them).
    if (isAuthRoute(snap.segments) || snap.segments.length === 0) {
      return { method: 'replace', href: '/home' };
    }
    return null;
  }
  // Unauthenticated users outside the auth group go to Login — exactly once:
  // after the replace lands, `isAuthRoute` holds and the guard stays silent.
  return isAuthRoute(snap.segments)
    ? null
    : { method: 'replace', href: '/login' };
}

// --------------------------------------------------------------------------
// AuthGuard: when to run the session check (checkAuth).
// --------------------------------------------------------------------------

export interface AuthInitSnapshot {
  serverStatus: GuardServerStatus;
  setupPending: boolean;
  authStatus: GuardAuthStatus;
}

/**
 * Pure body of AuthGuard's auth-initialization effect. The session check runs
 * only from the untouched 'idle' state on a ready backend: boot initializes
 * exactly once, while any already-resolved status is left alone — in
 * particular, the wizard's own completion check resolves the status BEFORE
 * clearing the flag, so this effect never starts a second refresh after
 * setup. Abandoning the wizard with auth still 'idle' re-arms boot
 * initialization on the cleared flag, which is exactly the desired resume.
 */
export function shouldInitAuth(snap: AuthInitSnapshot): boolean {
  return (
    snap.serverStatus === 'configured' &&
    !snap.setupPending &&
    snap.authStatus === 'idle'
  );
}

// --------------------------------------------------------------------------
// Connect-flow planning (useServerSetup): what a validated result commits.
// --------------------------------------------------------------------------

export interface ConnectPlan {
  /** Store commit: 'set' (first launch / same URL) or 'switch' (new URL). */
  commit: 'set' | 'switch' | null;
  /** Setup flag to persist atomically with the URL (valid when committing). */
  setupPending: boolean;
  /** Success toast, if any (wizard-bound servers skip it). */
  toast: 'connected' | 'updated' | null;
  /**
   * Screen-owned follow-up. Wizard entry and first-launch login from a fresh
   * URL are ServerGuard's (single owner), so the hook navigates to neither.
   * The hook owns only the same-URL ready re-commits ServerGuard stays silent
   * on: 'back' pops review mode to Login, 'login' replaces a first-launch
   * wizard back-out to Login once the backend reports ready.
   */
  followUp: 'back' | 'login' | 'none';
}

export interface ConnectPlanOptions {
  /**
   * True when the setup screen was reached from Login (review mode) rather
   * than first launch. Only affects the same-URL ready re-commit follow-up.
   */
  isReviewMode?: boolean;
}

/**
 * Pure post-validation plan. Failures (unreachable, not-Sonic, db down,
 * db unconfigured, timeout) commit nothing and navigate nowhere: the error
 * stays inline and retryable on the setup screen. A down or unconfigured
 * database never opens the wizard, even if the backend also reports
 * `setupRequired` (the validator rejects those states before the setup
 * branch — see `serverValidation.ts`).
 *
 * Every Continue re-validates via /health — including an unchanged URL — so
 * a same-URL commit always carries a fresh setup flag and request id.
 */
export function planConnectResult(
  currentUrl: string | null,
  result: ServerCheckResult,
  opts?: ConnectPlanOptions,
): ConnectPlan {
  if (!result.ok) {
    return {
      commit: null,
      setupPending: false,
      toast: null,
      followUp: 'none',
    };
  }
  const setupPending = result.setupRequired;
  if (currentUrl !== null && result.serverUrl !== currentUrl) {
    return {
      commit: 'switch',
      setupPending,
      toast: setupPending ? null : 'updated',
      followUp: setupPending ? 'none' : 'back',
    };
  }
  if (setupPending) {
    // Same-URL setup commit (first connect or wizard back-out reconnect):
    // ServerGuard pushes the wizard on the fresh request id.
    return {
      commit: 'set',
      setupPending: true,
      toast: null,
      followUp: 'none',
    };
  }
  if (currentUrl === null) {
    // First-launch ready commit: ServerGuard advances to Login.
    return {
      commit: 'set',
      setupPending: false,
      toast: 'connected',
      followUp: 'none',
    };
  }
  // Same-URL ready re-commit. ServerGuard stays silent here (no pending flag
  // and the previous status is already 'configured'), so the hook owns the
  // single follow-up: review mode pops to Login, while a first-launch wizard
  // back-out whose backend turned ready replaces to Login.
  if (opts?.isReviewMode) {
    return {
      commit: 'set',
      setupPending: false,
      toast: null,
      followUp: 'back',
    };
  }
  return {
    commit: 'set',
    setupPending: false,
    toast: 'connected',
    followUp: 'login',
  };
}

/**
 * True only for Login review mode with the verified URL untouched. Drives the
 * Continue label + verified check only — every Continue still re-validates
 * via /health (there is no unchanged shortcut). Deliberately false after a
 * first-launch back-out of the wizard (not review mode, even if the input now
 * equals the persisted URL).
 */
export function isReviewUnchanged(
  isReviewMode: boolean,
  currentUrl: string | null,
  input: string,
): boolean {
  return (
    isReviewMode &&
    currentUrl !== null &&
    normalizeServerUrl(input) === currentUrl
  );
}

// --------------------------------------------------------------------------
// Stale-attempt guard (same mounted + attempt-current discipline the connect
// flow already used, extracted so the regression suite can hammer it).
// --------------------------------------------------------------------------

export interface AttemptGuard {
  /** Starts an attempt, superseding all previous ones. Returns its id. */
  start: () => number;
  /** True only while mounted AND no newer attempt has started. */
  isCurrent: (attempt: number) => boolean;
  /** Marks the owner unmounted: every attempt goes stale permanently. */
  unmount: () => void;
}

export function createAttemptGuard(): AttemptGuard {
  let latest = 0;
  let mounted = true;
  return {
    start() {
      latest += 1;
      return latest;
    },
    isCurrent(attempt) {
      return mounted && attempt === latest;
    },
    unmount() {
      mounted = false;
    },
  };
}
