// --------------------------------------------------------------------------
// Tests for playlist pending-track pipelines: per-entry ownership, lifecycle
// states, tap-joining, retry, and stale-run cancellation.
//
// Run (no test runner in this repo; uses the installed tsc + node's runner):
//   npx tsc src/features/playback/services/playlistPendingService.test.ts \
//     --outDir /tmp/sonic-test-build --rootDir . \
//     --module commonjs --target es2022 --moduleResolution node \
//     --esModuleInterop --skipLibCheck
//   node --test /tmp/sonic-test-build/src/features/playback/services/playlistPendingService.test.js
//
// These files are never imported by app code, so Metro never bundles them.
// --------------------------------------------------------------------------

import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cancelPlaylistResolution,
  ensurePlaylistEntryInserted,
  getPlaylistEntryState,
  isPlaylistRunJoinable,
  markPlaylistEntryEnqueued,
  markPlaylistRunJoinable,
  resolvePlaylistEntryInBackground,
  startPlaylistRun,
  type PlaylistPendingDeps,
  type PlaylistPendingResolved,
} from './playlistPendingService';
import { JobPollingCancelledError } from './jobCancellation';

interface FakeSong {
  id: string;
}

interface FakeTrack {
  mediaId: string;
  song: FakeSong;
}

type FakeDeps = PlaylistPendingDeps<FakeSong, FakeTrack>;

/** Yield one macrotask: drains every pending microtask, so pipelines run to quiescence. */
async function tick(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

interface MockHarness {
  deps: FakeDeps;
  /** Fake native queue (song ids in order). */
  nativeQueue: string[];
  /** Completed inserts, in completion order. */
  inserts: { position: number; songId: string }[];
  /** Insert calls in call order; each stays pending until released/failed. */
  insertCalls: {
    position: number;
    songId: string;
    release: () => void;
    fail: (error: unknown) => void;
  }[];
  pollCalls: { jobId: string; shouldAbort: () => boolean }[];
  registerJobCalls: { jobId: string; songId: string }[];
  notifications: { count: number };
  releasePoll: (jobId: string, songId: string) => void;
  failPoll: (jobId: string, error: unknown) => void;
}

function makeHarness(): MockHarness {
  const nativeQueue: string[] = [];
  const inserts: MockHarness['inserts'] = [];
  const insertCalls: MockHarness['insertCalls'] = [];
  const pollCalls: MockHarness['pollCalls'] = [];
  const registerJobCalls: MockHarness['registerJobCalls'] = [];
  const notifications = { count: 0 };
  const pendingPolls = new Map<
    string,
    {
      resolve: (value: PlaylistPendingResolved<FakeSong>) => void;
      reject: (error: unknown) => void;
    }
  >();
  const deps: FakeDeps = {
    pollJob: (jobId, shouldAbort) =>
      new Promise<PlaylistPendingResolved<FakeSong>>((resolve, reject) => {
        pollCalls.push({ jobId, shouldAbort });
        pendingPolls.set(jobId, { resolve, reject });
      }),
    registerJob: (jobId, songId) => {
      registerJobCalls.push({ jobId, songId });
    },
    createTrack: async (song) => ({ mediaId: song.id, song }),
    addTrackToMap: () => {},
    getNativeQueueLength: async () => nativeQueue.length,
    insertNativeTrack: (position, track) =>
      new Promise<void>((resolve, reject) => {
        insertCalls.push({
          position,
          songId: track.song.id,
          release: () => {
            nativeQueue.splice(
              Math.min(position, nativeQueue.length),
              0,
              track.song.id,
            );
            inserts.push({ position, songId: track.song.id });
            resolve();
          },
          fail: (error: unknown) => reject(error),
        });
      }),
    notifyQueueUpdate: () => {
      notifications.count += 1;
    },
  };

  return {
    deps,
    nativeQueue,
    inserts,
    insertCalls,
    pollCalls,
    registerJobCalls,
    notifications,
    releasePoll: (jobId: string, songId: string) => {
      pendingPolls
        .get(jobId)
        ?.resolve({ song: { id: songId }, playbackToken: `token-${songId}` });
    },
    failPoll: (jobId: string, error: unknown) => {
      pendingPolls.get(jobId)?.reject(error);
    },
  };
}

function isCancelled(error: unknown): boolean {
  return error instanceof JobPollingCancelledError;
}

afterEach(() => {
  cancelPlaylistResolution();
});

describe('tap joins an in-flight background insertion', () => {
  test('background insertion followed by a tap of the same entry', async () => {
    const h = makeHarness();
    const run = startPlaylistRun(
      'pl',
      1,
      [{ playlistIndex: 0, jobId: 'job-0', songId: 'song-0' }],
      h.deps,
    );
    markPlaylistRunJoinable(run);
    assert.equal(getPlaylistEntryState(run, 0), 'pending');

    resolvePlaylistEntryInBackground(run, 0);
    await tick();
    assert.equal(getPlaylistEntryState(run, 0), 'resolving');

    h.releasePoll('job-0', 'song-0');
    await tick();
    assert.equal(getPlaylistEntryState(run, 0), 'inserting');
    assert.equal(h.insertCalls.length, 1);

    // Tap while the insertion is held pending: joins, never duplicates.
    const tap = ensurePlaylistEntryInserted(run, 0);
    await tick();
    assert.equal(h.pollCalls.length, 1);
    assert.equal(h.registerJobCalls.length, 1);
    assert.equal(h.insertCalls.length, 1);
    assert.equal(getPlaylistEntryState(run, 0), 'inserting');

    h.insertCalls[0].release();
    const track = await tap;
    assert.equal(track.song.id, 'song-0');
    assert.equal(getPlaylistEntryState(run, 0), 'ready');
    assert.deepEqual(h.nativeQueue, ['song-0']);
    assert.equal(h.notifications.count, 1);
  });

  test('two simultaneous taps of the same pending entry', async () => {
    const h = makeHarness();
    const run = startPlaylistRun(
      'pl',
      1,
      [{ playlistIndex: 0, jobId: 'job-0', songId: 'song-0' }],
      h.deps,
    );
    markPlaylistRunJoinable(run);

    const tapA = ensurePlaylistEntryInserted(run, 0);
    const tapB = ensurePlaylistEntryInserted(run, 0);
    assert.equal(h.pollCalls.length, 1);
    assert.equal(h.registerJobCalls.length, 1);

    h.releasePoll('job-0', 'song-0');
    await tick();
    assert.equal(h.insertCalls.length, 1);

    h.insertCalls[0].release();
    const [trackA, trackB] = await Promise.all([tapA, tapB]);
    assert.ok(trackA === trackB);
    assert.equal(getPlaylistEntryState(run, 0), 'ready');
    assert.deepEqual(h.nativeQueue, ['song-0']);
  });

  test('no duplicate native insertion for one entry', async () => {
    const h = makeHarness();
    const run = startPlaylistRun(
      'pl',
      1,
      [{ playlistIndex: 0, jobId: 'job-0', songId: 'song-0' }],
      h.deps,
    );
    markPlaylistRunJoinable(run);

    // Background and tap start together: exactly one poll, one insertion.
    resolvePlaylistEntryInBackground(run, 0);
    const tap = ensurePlaylistEntryInserted(run, 0);
    assert.equal(h.pollCalls.length, 1);

    h.releasePoll('job-0', 'song-0');
    await tick();
    assert.equal(h.insertCalls.length, 1);

    h.insertCalls[0].release();
    const track = await tap;
    await tick();
    assert.equal(track.song.id, 'song-0');
    assert.equal(h.pollCalls.length, 1);
    assert.equal(h.insertCalls.length, 1);
    assert.equal(getPlaylistEntryState(run, 0), 'ready');
  });
});

describe('insertion failure and retry', () => {
  test('insertion failure followed by retry', async () => {
    const h = makeHarness();
    const run = startPlaylistRun(
      'pl',
      1,
      [{ playlistIndex: 0, jobId: 'job-0', songId: 'song-0' }],
      h.deps,
    );
    markPlaylistRunJoinable(run);

    const first = ensurePlaylistEntryInserted(run, 0);
    h.releasePoll('job-0', 'song-0');
    await tick();
    assert.equal(getPlaylistEntryState(run, 0), 'inserting');

    h.insertCalls[0].fail(new Error('insert boom'));
    await assert.rejects(first, /insert boom/);
    // Never falsely ready: failure releases ownership for a retry.
    assert.equal(getPlaylistEntryState(run, 0), 'failed');
    assert.deepEqual(h.nativeQueue, []);
    assert.equal(h.notifications.count, 0);

    const retry = ensurePlaylistEntryInserted(run, 0);
    await tick();
    assert.equal(h.pollCalls.length, 2);
    h.releasePoll('job-0', 'song-0');
    await tick();
    assert.equal(h.insertCalls.length, 2);

    h.insertCalls[1].release();
    const track = await retry;
    assert.equal(track.song.id, 'song-0');
    assert.equal(getPlaylistEntryState(run, 0), 'ready');
    assert.deepEqual(h.nativeQueue, ['song-0']);
  });
});

describe('playlist replacement', () => {
  test('replacement while resolution is in progress', async () => {
    const h = makeHarness();
    const runA = startPlaylistRun(
      'pl-a',
      1,
      [{ playlistIndex: 0, jobId: 'job-a', songId: 'song-a' }],
      h.deps,
    );
    markPlaylistRunJoinable(runA);

    const pending = ensurePlaylistEntryInserted(runA, 0);
    await tick();
    assert.equal(h.pollCalls.length, 1);
    const abortOfA = h.pollCalls[0].shouldAbort;
    assert.equal(abortOfA(), false);

    const runB = startPlaylistRun(
      'pl-b',
      1,
      [{ playlistIndex: 0, jobId: 'job-b', songId: 'song-b' }],
      h.deps,
    );
    assert.equal(abortOfA(), true);

    // The old poll resolving late must not insert into the new queue.
    h.releasePoll('job-a', 'song-a');
    await assert.rejects(pending, isCancelled);
    assert.equal(h.insertCalls.length, 0);
    assert.equal(h.notifications.count, 0);

    // The new run is untouched and starts clean.
    assert.equal(getPlaylistEntryState(runB, 0), 'pending');
    assert.deepEqual(runB.enqueued, [false]);
    assert.equal(getPlaylistEntryState(runA, 0), null);
  });

  test('replacement while native insertion is in progress', async () => {
    const h = makeHarness();
    const runA = startPlaylistRun(
      'pl-a',
      1,
      [{ playlistIndex: 0, jobId: 'job-a', songId: 'song-a' }],
      h.deps,
    );
    markPlaylistRunJoinable(runA);

    const pending = ensurePlaylistEntryInserted(runA, 0);
    h.releasePoll('job-a', 'song-a');
    await tick();
    assert.equal(getPlaylistEntryState(runA, 0), 'inserting');
    assert.equal(h.insertCalls.length, 1);

    const runB = startPlaylistRun(
      'pl-b',
      1,
      [{ playlistIndex: 0, jobId: 'job-b', songId: 'song-b' }],
      h.deps,
    );

    // The held insertion completing late must not mark, enqueue, or notify.
    h.insertCalls[0].release();
    await assert.rejects(pending, isCancelled);
    assert.equal(runA.entries.get(0)?.state, 'inserting');
    assert.equal(h.notifications.count, 0);

    // The new run's state is untouched by the old completion.
    assert.deepEqual(runB.enqueued, [false]);
    assert.equal(getPlaylistEntryState(runB, 0), 'pending');
    assert.equal(getPlaylistEntryState(runA, 0), null);
  });
});

describe('playlist order', () => {
  test('successful insertion preserves playlist order', async () => {
    const h = makeHarness();
    const run = startPlaylistRun(
      'pl',
      3,
      [
        { playlistIndex: 0, jobId: 'job-0', songId: 'song-0' },
        { playlistIndex: 2, jobId: 'job-2', songId: 'song-2' },
      ],
      h.deps,
    );
    // Index 1 is a ready track already in the queue.
    h.nativeQueue.push('song-1');
    markPlaylistEntryEnqueued(run, 1);
    markPlaylistRunJoinable(run);

    // Resolve out of order: later entry first.
    const second = ensurePlaylistEntryInserted(run, 2);
    const first = ensurePlaylistEntryInserted(run, 0);
    h.releasePoll('job-2', 'song-2');
    await tick();
    assert.equal(h.insertCalls.length, 1);
    assert.equal(h.insertCalls[0].position, 1);
    h.insertCalls[0].release();
    await second;

    h.releasePoll('job-0', 'song-0');
    await tick();
    assert.equal(h.insertCalls.length, 2);
    assert.equal(h.insertCalls[1].position, 0);
    h.insertCalls[1].release();
    await first;

    assert.deepEqual(h.nativeQueue, ['song-0', 'song-1', 'song-2']);
    assert.deepEqual(run.enqueued, [true, true, true]);
    assert.equal(getPlaylistEntryState(run, 0), 'ready');
    assert.equal(getPlaylistEntryState(run, 2), 'ready');
  });
});

describe('run joinability', () => {
  test('runs publish for tap-joining only once settled', async () => {
    const h = makeHarness();
    const run = startPlaylistRun(
      'pl',
      1,
      [{ playlistIndex: 0, jobId: 'job-0', songId: 'song-0' }],
      h.deps,
    );
    assert.equal(isPlaylistRunJoinable(run), false);

    markPlaylistRunJoinable(run);
    assert.equal(isPlaylistRunJoinable(run), true);

    // A superseded run is never joinable and cannot be republished.
    startPlaylistRun('pl-next', 0, [], h.deps);
    assert.equal(isPlaylistRunJoinable(run), false);
    markPlaylistRunJoinable(run);
    assert.equal(isPlaylistRunJoinable(run), false);
  });
});
