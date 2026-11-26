// --------------------------------------------------------------------------
// Regression tests: first-launch setup navigation + root navigator race.
//
// Run (no test runner in this repo; uses the installed tsc + node's runner):
//   npx tsc src/features/server/utils/setupNavigation.test.ts \
//     --outDir /tmp/sonic-test-build --rootDir . \
//     --module commonjs --target es2022 --moduleResolution node \
//     --esModuleInterop --skipLibCheck
//   node --test /tmp/sonic-test-build/src/features/server/utils/setupNavigation.test.js
//
// These files are never imported by app code, so Metro never bundles them.
//
// What this covers (and what it cannot):
// - The guards' redirect effects (`ServerGuard`/`AuthGuard` in
//   `src/app/_layout.tsx`) and the connect flow (`useServerSetup`) all call
//   into `setupNavigation.ts`. This suite executes that EXACT decision code
//   through scripted store/segment timelines that mirror the components tick
//   for tick (same inputs, same one-shot memory updates, same navigator
//   segment results) — so guard sequencing, single-ownership, exclusivity,
//   and stale-attempt behavior are genuinely tested, not re-implemented.
// - What node:test cannot do here: mount the real Expo Router navigator
//   (needs a React Native renderer + native modules, absent from this repo's
//   deliberately runner-free setup). The navigator-readiness half of the fix
//   — "the Stack stays mounted, guards only overlay" — is structural (see
//   `_layout.tsx`: both guards always render `{children}`) and is covered by
//   manual verification + the decision-level guarantee this suite proves:
//   every emitted action targets a registered route while a guard observes a
//   settled navigator, and no two actions ever compete on one tick.
// --------------------------------------------------------------------------

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  authGuardAction,
  createAttemptGuard,
  isAuthRoute,
  isReviewUnchanged,
  isServerSetupRoute,
  isSetupWizardRoute,
  planConnectResult,
  serverGuardAction,
} from './setupNavigation';
import type {
  GuardAuthStatus,
  GuardServerStatus,
  ServerGuardMemory,
  ServerGuardSnapshot,
  SetupNavAction,
} from './setupNavigation';
import type { ServerCheckResult } from '../api/serverValidation';

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

const URL_A = 'https://sonic-a.example.com';
const URL_B = 'https://sonic-b.example.com';

// Segment shapes as `useSegments()` reports them (groups included; the root
// index route reports [] — expo-router pops the trailing 'index').
const INDEX: string[] = [];
const SETUP = ['(auth)', 'server-setup'];
const WIZARD = ['(auth)', 'setup-wizard'];
const LOGIN = ['(auth)', 'login'];
const SIGNUP = ['(auth)', 'signup'];
const HOME = ['(tabs)', 'home'];
const SERVER_SETTINGS = ['(tabs)', 'settings', 'server'];

const REGISTERED_HREFS = ['/server-setup', '/setup-wizard', '/login', '/home'];

const okReady = (serverUrl: string): ServerCheckResult => ({
  ok: true,
  serverUrl,
  storage: null,
  setupRequired: false,
});

const okSetupRequired = (serverUrl: string): ServerCheckResult => ({
  ok: true,
  serverUrl,
  storage: null,
  setupRequired: true,
});

const failed = (
  code:
    | 'invalid-url'
    | 'unreachable'
    | 'timeout'
    | 'not-sonic'
    | 'db-down'
    | 'db-unconfigured',
): ServerCheckResult => ({ ok: false, code, message: `${code} fixture` });

function fmt(action: SetupNavAction | null): string {
  return action === null ? '(silent)' : `${action.method} ${action.href}`;
}

// --------------------------------------------------------------------------
// Harness: mirrors the two guard effects tick for tick.
// --------------------------------------------------------------------------

interface World {
  serverStatus: GuardServerStatus;
  setupPending: boolean;
  setupRequestId: number;
  authStatus: GuardAuthStatus;
  segments: string[];
}

/** Navigator result of applying one guard action. */
function applyNav(action: SetupNavAction): string[] {
  switch (action.href) {
    case '/server-setup':
      return [...SETUP];
    case '/setup-wizard':
      return [...WIZARD];
    case '/login':
      return [...LOGIN];
    case '/home':
      return [...HOME];
  }
}

function createHarness(initial: World) {
  // Component mirror: memory initializes from the first render's values.
  const memory: ServerGuardMemory = {
    prevStatus: initial.serverStatus,
    handledSetupRequestId: initial.setupRequestId,
  };
  const world: World = { ...initial, segments: [...initial.segments] };
  const actions: SetupNavAction[] = [];

  function tick(patch?: Partial<World>): {
    server: SetupNavAction | null;
    auth: SetupNavAction | null;
  } {
    if (patch) {
      Object.assign(world, patch);
      if (patch.segments) {
        world.segments = [...patch.segments];
      }
    }
    const snap: ServerGuardSnapshot = {
      status: world.serverStatus,
      setupPending: world.setupPending,
      setupRequestId: world.setupRequestId,
      segments: world.segments,
    };
    const server = serverGuardAction(memory, snap);
    // Component mirror: memory is written back after every run.
    memory.prevStatus = snap.status;
    memory.handledSetupRequestId = snap.setupRequestId;
    const auth = authGuardAction({
      authStatus: world.authStatus,
      serverStatus: world.serverStatus,
      setupPending: world.setupPending,
      segments: world.segments,
    });
    if (server) {
      actions.push(server);
    }
    if (auth) {
      actions.push(auth);
    }
    // Mirror the navigator: the single redirect (tests assert there is never
    // more than one per tick) lands before the next tick's effects run.
    const applied = server ?? auth;
    if (applied) {
      world.segments = applyNav(applied);
    }
    return { server, auth };
  }

  return { world, memory, actions, tick };
}

// --------------------------------------------------------------------------
// 1. Fresh install + setupRequired → Setup Wizard, never Login.
// --------------------------------------------------------------------------

describe('fresh install with an unconfigured backend', () => {
  test('validate → persist → Setup Wizard, with no Login action anywhere', () => {
    const h = createHarness({
      serverStatus: 'loading',
      setupPending: false,
      setupRequestId: 0,
      authStatus: 'idle',
      segments: INDEX,
    });
    // Boot render: both guards silent.
    const bootRender = h.tick();
    assert.equal(fmt(bootRender.server), '(silent)');
    assert.equal(fmt(bootRender.auth), '(silent)');
    // loadServer(): no stored server.
    const boot = h.tick({ serverStatus: 'unconfigured' });
    assert.equal(fmt(boot.server), 'replace /server-setup');
    assert.equal(fmt(boot.auth), '(silent)');
    assert.deepEqual(h.world.segments, SETUP);

    // Connect: URL validates, setupRequired commits atomically (URL + flag +
    // request id in one setServer call). Segments may still be stale (index)
    // on this exact tick — the wizard push must win regardless.
    const commit = h.tick({
      serverStatus: 'configured',
      setupPending: true,
      setupRequestId: 1,
      authStatus: 'unauthenticated',
      segments: INDEX,
    });
    assert.equal(fmt(commit.server), 'push /setup-wizard');
    assert.equal(
      fmt(commit.auth),
      '(silent)',
      'AuthGuard must yield while setup is pending',
    );
    assert.deepEqual(h.world.segments, WIZARD);

    // Settle: no further navigation, no Login flash, ever.
    for (let i = 0; i < 5; i += 1) {
      const settled = h.tick();
      assert.equal(fmt(settled.server), '(silent)');
      assert.equal(fmt(settled.auth), '(silent)');
    }
    assert.deepEqual(
      h.actions.map((a) => `${a.method} ${a.href}`),
      ['replace /server-setup', 'push /setup-wizard'],
    );
    assert.ok(
      h.actions.every((a) => a.href !== '/login'),
      'Login must not appear between URL validation and the Setup Wizard',
    );
  });

  test('wizard-bound plan claims no hook-owned follow-up navigation', () => {
    // The connect flow relinquishes wizard navigation to ServerGuard (single
    // owner): a wizard-bound commit plans no imperative follow-up.
    const plan = planConnectResult(null, okSetupRequired(URL_A));
    assert.equal(plan.commit, 'set');
    assert.equal(plan.setupPending, true);
    assert.equal(plan.followUp, 'none');
    assert.equal(plan.toast, null);
  });
});

// --------------------------------------------------------------------------
// 2. Unmount after URL persistence does not cancel wizard navigation.
// --------------------------------------------------------------------------

describe('setup screen unmount after persistence', () => {
  test('committed wizard navigation survives the setup screen unmounting', () => {
    const h = createHarness({
      serverStatus: 'unconfigured',
      setupPending: false,
      setupRequestId: 0,
      authStatus: 'idle',
      segments: SETUP,
    });
    h.tick();
    // setServer() commits (URL persisted). The setup screen unmounts here —
    // the harness performs no further hook calls at all — yet the guard,
    // which never unmounts, still routes the committed request id.
    const { server, auth } = h.tick({
      serverStatus: 'configured',
      setupPending: true,
      setupRequestId: 1,
      authStatus: 'unauthenticated',
    });
    assert.deepEqual(server, { method: 'push', href: '/setup-wizard' });
    assert.equal(auth, null);
  });

  test('guard decision takes no screen/hook input', () => {
    // Static shape check: the decision inputs are store snapshot + segments
    // + one-shot memory — nothing a mounted screen could withhold.
    const memory: ServerGuardMemory = {
      prevStatus: 'unconfigured',
      handledSetupRequestId: 0,
    };
    const action = serverGuardAction(memory, {
      status: 'configured',
      setupPending: true,
      setupRequestId: 1,
      segments: SETUP,
    });
    assert.deepEqual(action, { method: 'push', href: '/setup-wizard' });
  });
});

// --------------------------------------------------------------------------
// 3. Ready backend → Login exactly once.
// --------------------------------------------------------------------------

describe('ready backend', () => {
  test('fresh install with a ready backend reaches Login exactly once', () => {
    const h = createHarness({
      serverStatus: 'loading',
      setupPending: false,
      setupRequestId: 0,
      authStatus: 'idle',
      segments: INDEX,
    });
    h.tick();
    h.tick({ serverStatus: 'unconfigured' });
    // Ready commit from the setup screen.
    const commit = h.tick({
      serverStatus: 'configured',
      setupPending: false,
      setupRequestId: 1,
      authStatus: 'unauthenticated',
    });
    assert.equal(fmt(commit.server), 'replace /login');
    assert.equal(fmt(commit.auth), '(silent)');
    for (let i = 0; i < 5; i += 1) {
      h.tick();
    }
    const logins = h.actions.filter((a) => a.href === '/login');
    assert.equal(logins.length, 1);
    assert.deepEqual(
      h.actions.map((a) => `${a.method} ${a.href}`),
      ['replace /server-setup', 'replace /login'],
    );
  });

  test('boot with a stored URL routes to Login exactly once (server silent)', () => {
    const h = createHarness({
      serverStatus: 'loading',
      setupPending: false,
      setupRequestId: 0,
      authStatus: 'idle',
      segments: INDEX,
    });
    h.tick();
    // Stored URL adopted: NO request id bump (loadServer is not a commit).
    const boot = h.tick({ serverStatus: 'configured' });
    assert.equal(
      fmt(boot.server),
      '(silent)',
      'a boot with a stored URL is not a connect commit',
    );
    assert.equal(fmt(boot.auth), '(silent)');
    const checking = h.tick({ authStatus: 'loading' });
    assert.equal(fmt(checking.server), '(silent)');
    assert.equal(fmt(checking.auth), '(silent)');
    const resolved = h.tick({ authStatus: 'unauthenticated' });
    assert.equal(fmt(resolved.server), '(silent)');
    assert.equal(fmt(resolved.auth), 'replace /login');
    for (let i = 0; i < 5; i += 1) {
      h.tick();
    }
    assert.deepEqual(
      h.actions.map((a) => `${a.method} ${a.href}`),
      ['replace /login'],
    );
  });

  test('ready plan toasts, commits, and claims no follow-up', () => {
    const plan = planConnectResult(null, okReady(URL_A));
    assert.equal(plan.commit, 'set');
    assert.equal(plan.setupPending, false);
    assert.equal(plan.toast, 'connected');
    assert.equal(plan.followUp, 'none');
  });
});

// --------------------------------------------------------------------------
// 4. Auth loading dispatches nothing.
// --------------------------------------------------------------------------

describe('auth loading', () => {
  test('idle/loading auth never navigates, whatever else is stale', () => {
    const serverStatuses: GuardServerStatus[] = [
      'loading',
      'unconfigured',
      'configured',
    ];
    const segmentSets: string[][] = [INDEX, SETUP, WIZARD, LOGIN, HOME];
    for (const serverStatus of serverStatuses) {
      for (const segments of segmentSets) {
        for (const setupPending of [false, true]) {
          for (const authStatus of ['idle', 'loading'] as const) {
            assert.equal(
              authGuardAction({
                authStatus,
                serverStatus,
                setupPending,
                segments,
              }),
              null,
              `auth=${authStatus} server=${serverStatus} pending=${setupPending} segments=${JSON.stringify(segments)}`,
            );
          }
        }
      }
    }
  });

  test('server loading never navigates', () => {
    const memory: ServerGuardMemory = {
      prevStatus: 'loading',
      handledSetupRequestId: 0,
    };
    for (const segments of [INDEX, SETUP, LOGIN, HOME]) {
      assert.equal(
        serverGuardAction(memory, {
          status: 'loading',
          setupPending: false,
          setupRequestId: 0,
          segments,
        }),
        null,
      );
    }
  });
});

// --------------------------------------------------------------------------
// 5. Index handling never competes with AuthGuard.
// --------------------------------------------------------------------------

describe('single navigation owner', () => {
  test('at most one guard acts per tick across all settled states', () => {
    const serverStatuses: GuardServerStatus[] = [
      'loading',
      'unconfigured',
      'configured',
    ];
    const authStatuses: GuardAuthStatus[] = [
      'idle',
      'loading',
      'authenticated',
      'unauthenticated',
    ];
    const segmentSets: string[][] = [INDEX, SETUP, WIZARD, LOGIN, HOME];
    for (const serverStatus of serverStatuses) {
      for (const authStatus of authStatuses) {
        for (const segments of segmentSets) {
          for (const setupPending of [false, true]) {
            // Settled state: memory matches the snapshot (no fresh commit).
            const h = createHarness({
              serverStatus,
              setupPending,
              setupRequestId: 3,
              authStatus,
              segments,
            });
            const { server, auth } = h.tick();
            const count = (server ? 1 : 0) + (auth ? 1 : 0);
            assert.ok(
              count <= 1,
              `competition: server=${fmt(server)} auth=${fmt(auth)} ` +
                `(server=${serverStatus} auth=${authStatus} pending=${setupPending} segments=${JSON.stringify(segments)})`,
            );
          }
        }
      }
    }
  });

  test('at most one guard acts on a fresh commit tick', () => {
    // Every setServer commit is preceded by resetAuth in the same flow
    // (first-time setup clears stale tokens; switches reset before
    // persisting), so a fresh commit always observes 'unauthenticated'.
    const prevStatuses: GuardServerStatus[] = ['unconfigured', 'configured'];
    for (const prevStatus of prevStatuses) {
      for (const setupPending of [false, true]) {
        for (const segments of [INDEX, SETUP, WIZARD]) {
          const memory: ServerGuardMemory = {
            prevStatus,
            handledSetupRequestId: 7,
          };
          const server = serverGuardAction(memory, {
            status: 'configured',
            setupPending,
            setupRequestId: 8,
            segments,
          });
          const auth = authGuardAction({
            authStatus: 'unauthenticated',
            serverStatus: 'configured',
            setupPending,
            segments,
          });
          const count = (server ? 1 : 0) + (auth ? 1 : 0);
          assert.ok(
            count <= 1,
            `competition on commit: server=${fmt(server)} auth=${fmt(auth)} ` +
              `(prev=${prevStatus} pending=${setupPending} segments=${JSON.stringify(segments)})`,
          );
        }
      }
    }
  });
});

// --------------------------------------------------------------------------
// 6. Setup pending prevents Login redirects.
// --------------------------------------------------------------------------

describe('setup pending', () => {
  test('AuthGuard yields on every route while setup is pending', () => {
    for (const segments of [INDEX, SETUP, WIZARD, LOGIN, SIGNUP, HOME]) {
      assert.equal(
        authGuardAction({
          authStatus: 'unauthenticated',
          serverStatus: 'configured',
          setupPending: true,
          segments,
        }),
        null,
        `segments=${JSON.stringify(segments)}`,
      );
    }
  });

  test('AuthGuard yields while the server is unknown', () => {
    for (const serverStatus of ['loading', 'unconfigured'] as const) {
      for (const segments of [INDEX, HOME]) {
        assert.equal(
          authGuardAction({
            authStatus: 'unauthenticated',
            serverStatus,
            setupPending: false,
            segments,
          }),
          null,
        );
      }
    }
  });
});

// --------------------------------------------------------------------------
// 7. Database down stays retryable and never enters the wizard.
// --------------------------------------------------------------------------

describe('unhealthy backends', () => {
  test('failures commit nothing and navigate nowhere', () => {
    const codes = [
      'invalid-url',
      'unreachable',
      'timeout',
      'not-sonic',
      'db-down',
      'db-unconfigured',
    ] as const;
    const currentUrls: (string | null)[] = [null, URL_A];
    for (const code of codes) {
      for (const currentUrl of currentUrls) {
        const plan = planConnectResult(currentUrl, failed(code));
        assert.deepEqual(
          plan,
          { commit: null, setupPending: false, toast: null, followUp: 'none' },
          `code=${code} currentUrl=${currentUrl}`,
        );
      }
    }
  });

  test('a failed attempt leaves the guards silent (no id bump, no route)', () => {
    const h = createHarness({
      serverStatus: 'unconfigured',
      setupPending: false,
      setupRequestId: 0,
      authStatus: 'idle',
      segments: SETUP,
    });
    h.tick();
    // No commit happens, so the world is unchanged: another tick (e.g. a
    // re-render after the inline error lands) must stay silent.
    const { server, auth } = h.tick();
    assert.equal(server, null);
    assert.equal(auth, null);
    assert.deepEqual(h.actions, []);
  });
});

// --------------------------------------------------------------------------
// 8. A superseded connection attempt cannot navigate.
// --------------------------------------------------------------------------

describe('stale attempt protection', () => {
  test('only the latest attempt is current; unmount stales everything', () => {
    const guard = createAttemptGuard();
    const first = guard.start();
    assert.ok(guard.isCurrent(first));
    const second = guard.start();
    assert.ok(!guard.isCurrent(first), 'superseded attempt stays stale');
    assert.ok(guard.isCurrent(second));
    guard.unmount();
    assert.ok(!guard.isCurrent(second), 'unmount stales the latest attempt');
    assert.ok(
      !guard.isCurrent(guard.start()),
      'starting after unmount is still stale',
    );
  });

  test('a late loser commits nothing, so the guard routes the winner once', () => {
    const h = createHarness({
      serverStatus: 'unconfigured',
      setupPending: false,
      setupRequestId: 0,
      authStatus: 'idle',
      segments: SETUP,
    });
    h.tick();
    // Mirror of the hook: commit only while isCurrent().
    const guard = createAttemptGuard();
    const loser = guard.start();
    const winner = guard.start();
    let commits = 0;
    const maybeCommit = (attempt: number, setupRequired: boolean) => {
      if (!guard.isCurrent(attempt)) {
        return;
      }
      commits += 1;
      h.tick({
        serverStatus: 'configured',
        setupPending: setupRequired,
        setupRequestId: commits,
        authStatus: 'unauthenticated',
      });
    };
    maybeCommit(winner, true);
    maybeCommit(loser, false); // resolves late — must be ignored.
    assert.equal(commits, 1);
    assert.deepEqual(
      h.actions.map((a) => `${a.method} ${a.href}`),
      ['push /setup-wizard'],
    );
  });

  test('unmount before resolve commits nothing', () => {
    const guard = createAttemptGuard();
    const attempt = guard.start();
    guard.unmount();
    assert.ok(!guard.isCurrent(attempt));
  });
});

// --------------------------------------------------------------------------
// 9. Review-mode back navigation stays safe.
// --------------------------------------------------------------------------

describe('review mode', () => {
  test('review same-URL ready re-commit pops back to Login', () => {
    // Unchanged Continue re-validates, commits the fresh result, and the hook
    // pops back — ServerGuard stays silent (previous status configured).
    const plan = planConnectResult(URL_A, okReady(URL_A), {
      isReviewMode: true,
    });
    assert.equal(plan.commit, 'set');
    assert.equal(plan.setupPending, false);
    assert.equal(plan.toast, null);
    assert.equal(plan.followUp, 'back');
  });

  test('review same-URL setup re-commit re-enters the wizard (no loop)', () => {
    // Backed out of the wizard with the same URL: re-validating commits a
    // fresh setup id and ServerGuard pushes the wizard again.
    const plan = planConnectResult(URL_A, okSetupRequired(URL_A), {
      isReviewMode: true,
    });
    assert.equal(plan.commit, 'set');
    assert.equal(plan.setupPending, true);
    assert.equal(plan.toast, null);
    assert.equal(plan.followUp, 'none');
  });

  test('first-launch back-out re-commit to a ready backend replaces to Login', () => {
    // Same shape as review, but ServerGuard owns nothing here (previous
    // status already configured) and there is no Login to pop to — the hook
    // replaces to Login itself.
    const plan = planConnectResult(URL_A, okReady(URL_A));
    assert.equal(plan.commit, 'set');
    assert.equal(plan.setupPending, false);
    assert.equal(plan.toast, 'connected');
    assert.equal(plan.followUp, 'login');
  });

  test('isReviewUnchanged is review-only and normalization-aware', () => {
    assert.ok(isReviewUnchanged(true, URL_A, URL_A));
    assert.ok(isReviewUnchanged(true, URL_A, `${URL_A}/`));
    assert.ok(!isReviewUnchanged(true, URL_A, URL_B));
    assert.ok(!isReviewUnchanged(true, null, URL_A));
    assert.ok(
      !isReviewUnchanged(false, URL_A, URL_A),
      'first-launch back-out is not review mode even when the input matches',
    );
  });

  test('review-mode ready switch pops back; wizard switch does not', () => {
    const readySwitch = planConnectResult(URL_A, okReady(URL_B));
    assert.equal(readySwitch.commit, 'switch');
    assert.equal(readySwitch.toast, 'updated');
    assert.equal(readySwitch.followUp, 'back');

    const wizardSwitch = planConnectResult(URL_A, okSetupRequired(URL_B));
    assert.equal(wizardSwitch.commit, 'switch');
    assert.equal(wizardSwitch.toast, null);
    assert.equal(wizardSwitch.followUp, 'none');
  });

  test('review-mode screens never trigger auth redirects', () => {
    for (const segments of [SETUP, WIZARD, LOGIN, SIGNUP]) {
      assert.equal(
        authGuardAction({
          authStatus: 'unauthenticated',
          serverStatus: 'configured',
          setupPending: false,
          segments,
        }),
        null,
        `auth-group route must be left alone: ${JSON.stringify(segments)}`,
      );
    }
  });
});

// --------------------------------------------------------------------------
// 10. Startup emits no duplicate or unhandled navigation.
// --------------------------------------------------------------------------

describe('startup navigation sequences', () => {
  test('authenticated boot lands on home exactly once', () => {
    const h = createHarness({
      serverStatus: 'loading',
      setupPending: false,
      setupRequestId: 0,
      authStatus: 'idle',
      segments: INDEX,
    });
    h.tick();
    h.tick({ serverStatus: 'configured' });
    h.tick({ authStatus: 'loading' });
    const resolved = h.tick({ authStatus: 'authenticated' });
    assert.equal(fmt(resolved.auth), 'replace /home');
    assert.equal(fmt(resolved.server), '(silent)');
    for (let i = 0; i < 5; i += 1) {
      h.tick();
    }
    assert.deepEqual(
      h.actions.map((a) => `${a.method} ${a.href}`),
      ['replace /home'],
    );
  });

  test('login success leaves the auth group for home; tabs stay silent', () => {
    assert.deepEqual(
      authGuardAction({
        authStatus: 'authenticated',
        serverStatus: 'configured',
        setupPending: false,
        segments: LOGIN,
      }),
      { method: 'replace', href: '/home' },
    );
    assert.equal(
      authGuardAction({
        authStatus: 'authenticated',
        serverStatus: 'configured',
        setupPending: false,
        segments: HOME,
      }),
      null,
    );
  });

  test('review switch to an unconfigured server pushes the wizard once', () => {
    const h = createHarness({
      serverStatus: 'configured',
      setupPending: false,
      setupRequestId: 0,
      authStatus: 'unauthenticated',
      segments: LOGIN,
    });
    h.tick();
    // User taps through to the setup screen (user navigation, not a guard).
    const onSetup = h.tick({ segments: SETUP });
    assert.equal(fmt(onSetup.server), '(silent)');
    assert.equal(fmt(onSetup.auth), '(silent)');
    // Switch commits with setupRequired (status stays configured: no status
    // transition — the request id alone carries the commit).
    const commit = h.tick({ setupPending: true, setupRequestId: 1 });
    assert.equal(fmt(commit.server), 'push /setup-wizard');
    assert.equal(fmt(commit.auth), '(silent)');
    // Backing out of the wizard changes no commit: no trap, no re-push.
    const backedOut = h.tick({ segments: SETUP });
    assert.equal(fmt(backedOut.server), '(silent)');
    assert.equal(fmt(backedOut.auth), '(silent)');
    // Reconnecting commits a fresh id and routes again.
    const reconnect = h.tick({ setupRequestId: 2 });
    assert.equal(fmt(reconnect.server), 'push /setup-wizard');
    for (let i = 0; i < 3; i += 1) {
      h.tick();
    }
    assert.deepEqual(
      h.actions.map((a) => `${a.method} ${a.href}`),
      ['push /setup-wizard', 'push /setup-wizard'],
    );
  });

  test('review switch to a ready server stays put for the back pop', () => {
    const h = createHarness({
      serverStatus: 'configured',
      setupPending: false,
      setupRequestId: 0,
      authStatus: 'unauthenticated',
      segments: SETUP,
    });
    h.tick();
    // Ready switch: no status transition, no pending — the guard stays out
    // and the connect flow pops back to Login itself.
    const { server, auth } = h.tick({ setupRequestId: 1 });
    assert.equal(server, null);
    assert.equal(auth, null);
  });

  test('wizard completion settles on Login with no trailing redirects', () => {
    const h = createHarness({
      serverStatus: 'configured',
      setupPending: true,
      setupRequestId: 1,
      authStatus: 'unauthenticated',
      segments: WIZARD,
    });
    h.tick();
    // Completion clears pending WITHOUT bumping the id, then the wizard
    // replaces to Login itself (user-flow navigation, applied externally).
    const cleared = h.tick({ setupPending: false });
    assert.equal(fmt(cleared.server), '(silent)');
    assert.equal(fmt(cleared.auth), '(silent)');
    const onLogin = h.tick({ segments: LOGIN });
    assert.equal(fmt(onLogin.server), '(silent)');
    assert.equal(fmt(onLogin.auth), '(silent)');
    assert.deepEqual(h.actions, []);
  });

  test('wizard completion with a valid session settles on home', () => {
    const h = createHarness({
      serverStatus: 'configured',
      setupPending: true,
      setupRequestId: 1,
      authStatus: 'authenticated',
      segments: WIZARD,
    });
    h.tick();
    // Completion clears pending WITHOUT bumping the id, then the wizard
    // replaces to home itself (it validated the kept session). If a guard
    // tick observes the cleared flag first, AuthGuard agrees on the same
    // destination — it can never override completion with another route.
    const cleared = h.tick({ setupPending: false });
    assert.equal(fmt(cleared.server), '(silent)');
    assert.equal(fmt(cleared.auth), 'replace /home');
    const onHome = h.tick({ segments: HOME });
    assert.equal(fmt(onHome.server), '(silent)');
    assert.equal(fmt(onHome.auth), '(silent)');
    assert.deepEqual(
      h.actions.map((a) => `${a.method} ${a.href}`),
      ['replace /home'],
    );
  });

  test('boot setup discovery pushes the wizard over a session exactly once', () => {
    for (const authStatus of ['authenticated', 'unauthenticated'] as const) {
      const h = createHarness({
        serverStatus: 'configured',
        setupPending: false,
        setupRequestId: 0,
        authStatus,
        segments: authStatus === 'authenticated' ? HOME : LOGIN,
      });
      h.tick();
      // Background /health found setupRequired: the atomic pending commit
      // (URL untouched, session kept) routes to the wizard once, and
      // AuthGuard yields instead of pulling back.
      const commit = h.tick({ setupPending: true, setupRequestId: 1 });
      assert.equal(fmt(commit.server), 'push /setup-wizard');
      assert.equal(fmt(commit.auth), '(silent)');
      // Backing out changes no commit: no trap, no re-push, no loop.
      const start = authStatus === 'authenticated' ? HOME : LOGIN;
      const backedOut = h.tick({ segments: start });
      assert.equal(fmt(backedOut.server), '(silent)');
      assert.equal(fmt(backedOut.auth), '(silent)');
      assert.deepEqual(
        h.actions.map((a) => `${a.method} ${a.href}`),
        ['push /setup-wizard'],
      );
    }
  });

  test('settings server switch is yanked to Login exactly once by AuthGuard', () => {
    // Pre-existing behavior, preserved: the atomic switch resets auth before
    // persisting, and AuthGuard routes the resulting unauthenticated status.
    const h = createHarness({
      serverStatus: 'configured',
      setupPending: false,
      setupRequestId: 0,
      authStatus: 'authenticated',
      segments: SERVER_SETTINGS,
    });
    h.tick();
    const reset = h.tick({ authStatus: 'unauthenticated' });
    assert.equal(fmt(reset.auth), 'replace /login');
    assert.equal(fmt(reset.server), '(silent)');
    // Persist lands after (switch to a ready server): no second redirect.
    const persisted = h.tick({ setupRequestId: 1 });
    assert.equal(fmt(persisted.server), '(silent)');
    assert.equal(fmt(persisted.auth), '(silent)');
    assert.deepEqual(
      h.actions.map((a) => `${a.method} ${a.href}`),
      ['replace /login'],
    );
  });

  test('repeated effect runs never duplicate a commit (StrictMode shape)', () => {
    const h = createHarness({
      serverStatus: 'unconfigured',
      setupPending: false,
      setupRequestId: 0,
      authStatus: 'idle',
      segments: SETUP,
    });
    h.tick();
    // Same commit observed twice before segments settle (dev double-invoke):
    // the component writes memory back after the first run, so the second
    // run sees a handled id and stays silent.
    const first = h.tick({
      serverStatus: 'configured',
      setupPending: true,
      setupRequestId: 1,
      authStatus: 'unauthenticated',
      segments: SETUP,
    });
    assert.equal(fmt(first.server), 'push /setup-wizard');
    // Simulate the second run WITHOUT applying navigation (segments stale).
    const memoryOnly: ServerGuardMemory = { ...h.memory };
    const second = serverGuardAction(memoryOnly, {
      status: 'configured',
      setupPending: true,
      setupRequestId: 1,
      segments: SETUP,
    });
    assert.equal(second, null);
  });

  test('every emitted action targets a registered route', () => {
    const serverStatuses: GuardServerStatus[] = [
      'loading',
      'unconfigured',
      'configured',
    ];
    const authStatuses: GuardAuthStatus[] = [
      'idle',
      'loading',
      'authenticated',
      'unauthenticated',
    ];
    for (const serverStatus of serverStatuses) {
      for (const authStatus of authStatuses) {
        for (const segments of [INDEX, SETUP, WIZARD, LOGIN, HOME]) {
          for (const setupPending of [false, true]) {
            for (const fresh of [false, true]) {
              const memory: ServerGuardMemory = {
                prevStatus: serverStatus,
                handledSetupRequestId: fresh ? 0 : 1,
              };
              const server = serverGuardAction(memory, {
                status: serverStatus,
                setupPending,
                setupRequestId: 1,
                segments,
              });
              const auth = authGuardAction({
                authStatus,
                serverStatus,
                setupPending,
                segments,
              });
              for (const action of [server, auth]) {
                if (action) {
                  assert.ok(
                    REGISTERED_HREFS.includes(action.href),
                    `unregistered target: ${action.href}`,
                  );
                }
              }
            }
          }
        }
      }
    }
  });
});

// --------------------------------------------------------------------------
// Segment predicates.
// --------------------------------------------------------------------------

describe('segment predicates', () => {
  test('auth group detection', () => {
    assert.ok(isAuthRoute(LOGIN));
    assert.ok(isAuthRoute(SETUP));
    assert.ok(isAuthRoute(WIZARD));
    assert.ok(!isAuthRoute(INDEX));
    assert.ok(!isAuthRoute(HOME));
  });

  test('setup route detection', () => {
    assert.ok(isServerSetupRoute(SETUP));
    assert.ok(!isServerSetupRoute(LOGIN));
    assert.ok(!isServerSetupRoute(INDEX));
    assert.ok(isSetupWizardRoute(WIZARD));
    assert.ok(!isSetupWizardRoute(SETUP));
    assert.ok(!isSetupWizardRoute(INDEX));
  });
});
