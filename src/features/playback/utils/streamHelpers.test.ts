// --------------------------------------------------------------------------
// Tests for the pure stream-URL + playlist-pending predicates the player
// runs (playability, pending detection, RNTP header shape, queue positions).
//
// Run (no test runner in this repo; uses the installed tsc + node's runner):
//   npx tsc src/features/playback/utils/streamHelpers.test.ts \
//     --outDir /tmp/sonic-test-build --rootDir . \
//     --module commonjs --target es2022 --moduleResolution node \
//     --esModuleInterop --skipLibCheck
//   node --test /tmp/sonic-test-build/src/features/playback/utils/streamHelpers.test.js
//
// These files are never imported by app code, so Metro never bundles them.
// --------------------------------------------------------------------------

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPlaybackHeaders,
  countEnqueuedBefore,
  hasUsableStreamUrl,
  isPendingPlaylistTrack,
  nearestReadyIndex,
  normalizeJobId,
  partitionPlaylistTracks,
} from './streamHelpers';

describe('hasUsableStreamUrl', () => {
  test('accepts only non-blank string URLs', () => {
    assert.equal(hasUsableStreamUrl('https://cdn.example/stream/abc'), true);
    assert.equal(hasUsableStreamUrl('http://192.168.1.10:3000/stream/abc'), true);
    assert.equal(hasUsableStreamUrl(''), false);
    assert.equal(hasUsableStreamUrl('   '), false);
    assert.equal(hasUsableStreamUrl(null), false);
    assert.equal(hasUsableStreamUrl(undefined), false);
    assert.equal(hasUsableStreamUrl(42), false);
    assert.equal(hasUsableStreamUrl({}), false);
  });
});

describe('normalizeJobId', () => {
  test('trims usable ids and nulls the rest', () => {
    assert.equal(normalizeJobId('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.equal(normalizeJobId('  dQw4w9WgXcQ  '), 'dQw4w9WgXcQ');
    assert.equal(normalizeJobId(''), null);
    assert.equal(normalizeJobId('   '), null);
    assert.equal(normalizeJobId(null), null);
    assert.equal(normalizeJobId(undefined), null);
    assert.equal(normalizeJobId(42), null);
  });
});

describe('isPendingPlaylistTrack', () => {
  test('detects the missing-file shape: empty URL plus jobId', () => {
    assert.equal(
      isPendingPlaylistTrack({ streamUrl: '', jobId: 'dQw4w9WgXcQ' }),
      true,
    );
    assert.equal(
      isPendingPlaylistTrack({ streamUrl: '   ', jobId: 'dQw4w9WgXcQ' }),
      true,
    );
  });

  test('ready and unplayable tracks both read false', () => {
    // Ready: a URL means playable, even with a (stale) jobId attached.
    assert.equal(
      isPendingPlaylistTrack({
        streamUrl: 'https://cdn.example/stream/abc',
        jobId: 'dQw4w9WgXcQ',
      }),
      false,
    );
    assert.equal(
      isPendingPlaylistTrack({
        streamUrl: 'https://cdn.example/stream/abc',
      }),
      false,
    );
    // Unplayable: no URL and no job to resolve it with.
    assert.equal(
      isPendingPlaylistTrack({ streamUrl: '', jobId: '' }),
      false,
    );
    assert.equal(isPendingPlaylistTrack({ streamUrl: '' }), false);
    assert.equal(isPendingPlaylistTrack({}), false);
  });
});

describe('partitionPlaylistTracks', () => {
  const ready = (id: string) => ({
    id,
    streamUrl: `https://cdn.example/stream/${id}`,
  });
  const pending = (id: string) => ({ id, streamUrl: '', jobId: id });
  const broken = (id: string) => ({ id, streamUrl: '' });

  test('splits every track into exactly one group, order kept', () => {
    const tracks = [
      ready('a'),
      pending('b'),
      ready('c'),
      broken('d'),
      pending('e'),
    ];

    const partition = partitionPlaylistTracks(tracks);

    assert.deepEqual(
      partition.ready.map((entry) => entry.track.id),
      ['a', 'c'],
    );
    assert.deepEqual(
      partition.ready.map((entry) => entry.index),
      [0, 2],
    );
    assert.deepEqual(
      partition.pending.map((entry) => entry.track.id),
      ['b', 'e'],
    );
    assert.deepEqual(
      partition.pending.map((entry) => entry.index),
      [1, 4],
    );
    assert.deepEqual(
      partition.unplayable.map((entry) => entry.track.id),
      ['d'],
    );
    assert.deepEqual(
      partition.unplayable.map((entry) => entry.index),
      [3],
    );
  });

  test('an all-ready R2 playlist has no pending or unplayable tracks', () => {
    const partition = partitionPlaylistTracks([
      ready('a'),
      ready('b'),
      ready('c'),
    ]);

    assert.equal(partition.ready.length, 3);
    assert.deepEqual(partition.pending, []);
    assert.deepEqual(partition.unplayable, []);
  });
});

describe('buildPlaybackHeaders', () => {
  test('sends the playback token as a Bearer token, verbatim', () => {
    assert.deepEqual(buildPlaybackHeaders('playback-token-abc.123'), {
      Authorization: 'Bearer playback-token-abc.123',
    });
    // No trimming, no prefixing, no query params: the exact token goes out.
    assert.deepEqual(buildPlaybackHeaders('  spaced  '), {
      Authorization: 'Bearer   spaced  ',
    });
  });
});

describe('countEnqueuedBefore', () => {
  test('counts playlist-order insert positions', () => {
    // Playlist [R, P, R, P, R], all ready enqueued: pendings slot home.
    assert.equal(
      countEnqueuedBefore([true, false, true, false, true], 1),
      1,
    );
    assert.equal(
      countEnqueuedBefore([true, false, true, false, true], 3),
      2,
    );
    assert.equal(
      countEnqueuedBefore([true, true, true, false, true], 3),
      3,
    );
    assert.equal(countEnqueuedBefore([false, false], 0), 0);
    assert.equal(countEnqueuedBefore([], 0), 0);
  });

  test('clamps out-of-range indices instead of throwing', () => {
    assert.equal(countEnqueuedBefore([true, true], 99), 2);
    assert.equal(countEnqueuedBefore([true, true], -1), 0);
  });
});

describe('nearestReadyIndex', () => {
  test('prefers later tracks, then earlier ones', () => {
    assert.equal(nearestReadyIndex([true, false, true], 1), 2);
    assert.equal(nearestReadyIndex([true, false, false], 1), 0);
    assert.equal(nearestReadyIndex([false, false, true], 0), 2);
    assert.equal(nearestReadyIndex([true, false, true], 0), 0);
  });

  test('reports -1 when nothing is playable', () => {
    assert.equal(nearestReadyIndex([false, false], 0), -1);
    assert.equal(nearestReadyIndex([], 0), -1);
  });
});
