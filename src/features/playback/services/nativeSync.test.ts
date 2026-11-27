// --------------------------------------------------------------------------
// Tests for waitForNativeQueue: poll-before-recreate dead-player handling.
//
// Run (no test runner in this repo; uses the installed tsc + node's runner):
//   npx tsc src/features/playback/services/nativeSync.test.ts \
//     --outDir /tmp/sonic-test-build --rootDir . \
//     --module commonjs --target es2022 --moduleResolution node \
//     --esModuleInterop --skipLibCheck
//   NODE_PATH="$PWD/node_modules" node --test \
//     /tmp/sonic-test-build/src/features/playback/services/nativeSync.test.js
//
// The standalone compile prints TS2307 errors for `@/`-aliased imports in
// files nativeSync pulls in (the project tsconfig's `paths` don't apply to
// a single-file compile). Same as the versionService suite's `__DEV__`
// note: tsc still emits runnable JS, and the real type gate is the clean
// project-wide `npx tsc --noEmit`.
// @rntp/player is stubbed via require.cache before nativeSync loads (see
// installStubs): waitForNativeQueue only uses injected deps, so the stub is
// never touched. These files are never imported by app code, so Metro never
// bundles them.
// --------------------------------------------------------------------------

import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

type NativeSyncModule = typeof import('./nativeSync');
let nativeSync!: NativeSyncModule;

function installStubs(): void {
  const playerStub = { __esModule: true, default: {} };
  require.cache[require.resolve('@rntp/player')] = {
    exports: playerStub,
  } as unknown as NodeModule;
}

before(async () => {
  installStubs();
  nativeSync = await import('./nativeSync');
});

type Script = Array<number | 'throw'>;

function makeDeps(script: Script, isCurrent: () => boolean = () => true) {
  const calls = { queue: 0, sleep: 0, recreate: 0, rebuild: 0 };
  let reads = 0;
  return {
    calls,
    deps: {
      getQueueLength: async (): Promise<number> => {
        calls.queue++;
        const next = script[Math.min(reads++, script.length - 1)] ?? 0;
        if (next === 'throw') throw new Error('bridge down');
        return next;
      },
      recreate: async (): Promise<unknown> => {
        calls.recreate++;
        return true;
      },
      rebuild: async (): Promise<void> => {
        calls.rebuild++;
      },
      isCurrent,
      sleep: async (_ms: number): Promise<void> => {
        calls.sleep++;
      },
    },
  };
}

describe('waitForNativeQueue', () => {
  test('healthy queue returns true immediately with no wait or recreate', async () => {
    const f = makeDeps([1]);

    const ok = await nativeSync.waitForNativeQueue(f.deps, 1, 3);

    assert.equal(ok, true);
    assert.deepEqual(f.calls, { queue: 1, sleep: 0, recreate: 0, rebuild: 0 });
  });

  test('connecting controller resolves without resending or recreating', async () => {
    const f = makeDeps([0, 0, 1]);

    const ok = await nativeSync.waitForNativeQueue(f.deps, 1, 5);

    assert.equal(ok, true);
    assert.equal(f.calls.recreate, 0);
    assert.equal(f.calls.rebuild, 0);
  });

  test('empty first wait recreates once with a single rebuild, then succeeds', async () => {
    // The queue lands only after the rebuild runs.
    let rebuilt = false;
    const f = makeDeps([0]);
    const deps = {
      ...f.deps,
      getQueueLength: async (): Promise<number> => {
        f.calls.queue++;
        return rebuilt ? 1 : 0;
      },
      rebuild: async (): Promise<void> => {
        f.calls.rebuild++;
        rebuilt = true;
      },
    };

    const ok = await nativeSync.waitForNativeQueue(deps, 1, 3);

    assert.equal(ok, true);
    assert.equal(f.calls.recreate, 1);
    assert.equal(f.calls.rebuild, 1);
  });

  test('dead player gets exactly two recreates and rebuilds, then false', async () => {
    const f = makeDeps([0]);

    const ok = await nativeSync.waitForNativeQueue(f.deps, 1, 3);

    assert.equal(ok, false);
    assert.equal(f.calls.recreate, 2);
    assert.equal(f.calls.rebuild, 2);
  });

  test('stale op bails the wait without recreating', async () => {
    let polls = 0;
    const f = makeDeps([0], () => ++polls <= 2);

    const ok = await nativeSync.waitForNativeQueue(f.deps, 1, 10);

    assert.equal(ok, false);
    assert.equal(f.calls.recreate, 0);
    assert.equal(f.calls.rebuild, 0);
  });

  test('op that goes stale during the wait skips the recreate', async () => {
    // True for every in-round check (3 rounds), false at the post-round gate.
    let checks = 0;
    const f = makeDeps([0], () => ++checks <= 3);

    const ok = await nativeSync.waitForNativeQueue(f.deps, 1, 3);

    assert.equal(ok, false);
    assert.equal(f.calls.recreate, 0);
    assert.equal(f.calls.rebuild, 0);
  });

  test('queue read throw counts as empty', async () => {
    const f = makeDeps(['throw', 'throw', 1]);

    const ok = await nativeSync.waitForNativeQueue(f.deps, 1, 5);

    assert.equal(ok, true);
    assert.equal(f.calls.recreate, 0);
  });

  test('production defaults span the 10 s controller timeout', () => {
    assert.equal(
      nativeSync.NATIVE_QUEUE_POLL_MS * nativeSync.NATIVE_QUEUE_WAIT_ROUNDS,
      10_000,
    );
  });
});
