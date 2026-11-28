// --------------------------------------------------------------------------
// Tests for HTTP 429 parsing: status detection, Retry-After header variants
// (exact, suffixed, any case), seconds vs HTTP-date values, and the body
// fallback. pollingResolver itself is too heavy to load in node (Axios
// client chain), so its 429 branch delegates all parsing here and these
// tests execute that EXACT code.
//
// Run (no test runner in this repo; uses the installed tsc + node's runner):
//   npx tsc src/features/playback/services/rateLimit.test.ts \
//     --outDir /tmp/sonic-test-build --rootDir . \
//     --module commonjs --target es2022 --moduleResolution node \
//     --esModuleInterop --skipLibCheck
//   node --test /tmp/sonic-test-build/src/features/playback/services/rateLimit.test.js
//
// These files are never imported by app code, so Metro never bundles them.
// --------------------------------------------------------------------------

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isRateLimitError, parseRateLimitDelayMs } from './rateLimit';

const NOW = Date.parse('2026-11-28T12:00:00.000Z');

function axiosError(
  status: unknown,
  headers?: unknown,
  data?: unknown,
): unknown {
  return { response: { status, headers, data } };
}

describe('isRateLimitError', () => {
  test('matches HTTP 429 responses only', () => {
    assert.equal(isRateLimitError(axiosError(429)), true);
    assert.equal(
      isRateLimitError(axiosError(429, { 'retry-after': '5' })),
      true,
    );
    assert.equal(isRateLimitError(axiosError(500)), false);
    assert.equal(isRateLimitError(axiosError(404)), false);
    assert.equal(isRateLimitError(axiosError('429')), false);
    assert.equal(isRateLimitError(axiosError(undefined)), false);
    assert.equal(isRateLimitError({ code: 'ERR_NETWORK' }), false);
    assert.equal(isRateLimitError(new Error('socket hang up')), false);
    assert.equal(isRateLimitError(null), false);
    assert.equal(isRateLimitError(undefined), false);
    assert.equal(isRateLimitError('429'), false);
  });
});

describe('parseRateLimitDelayMs', () => {
  test('honors an exact Retry-After header in seconds', () => {
    assert.equal(
      parseRateLimitDelayMs(axiosError(429, { 'retry-after': '15' }), NOW),
      15000,
    );
    assert.equal(
      parseRateLimitDelayMs(axiosError(429, { 'retry-after': 7 }), NOW),
      7000,
    );
    assert.equal(
      parseRateLimitDelayMs(axiosError(429, { 'retry-after': ' 3 ' }), NOW),
      3000,
    );
  });

  test('matches the header name case-insensitively', () => {
    for (const name of ['Retry-After', 'RETRY-AFTER', 'rEtRy-AfTeR']) {
      assert.equal(
        parseRateLimitDelayMs(axiosError(429, { [name]: '9' }), NOW),
        9000,
        `header ${name} missed`,
      );
    }
  });

  test('honors suffixed header names (named throttlers)', () => {
    assert.equal(
      parseRateLimitDelayMs(
        axiosError(429, { 'retry-after-default': '4' }),
        NOW,
      ),
      4000,
    );
    assert.equal(
      parseRateLimitDelayMs(
        axiosError(429, { 'Retry-After-Jobs': '11' }),
        NOW,
      ),
      11000,
    );
  });

  test('reads AxiosHeaders-style instances via toJSON', () => {
    const headers = {
      toJSON: () => ({ 'Retry-After': '6' }),
    };
    assert.equal(parseRateLimitDelayMs(axiosError(429, headers), NOW), 6000);
  });

  test('takes the first element of array values', () => {
    assert.equal(
      parseRateLimitDelayMs(axiosError(429, { 'retry-after': ['8', '9'] }), NOW),
      8000,
    );
    assert.equal(
      parseRateLimitDelayMs(axiosError(429, { 'retry-after': [] }), NOW),
      null,
    );
  });

  test('accepts HTTP-date values relative to now', () => {
    assert.equal(
      parseRateLimitDelayMs(
        axiosError(429, { 'retry-after': 'Fri, 28 Nov 2026 12:00:30 GMT' }),
        NOW,
      ),
      30000,
    );
    // A past date means retry immediately, never a negative sleep.
    assert.equal(
      parseRateLimitDelayMs(
        axiosError(429, { 'retry-after': 'Fri, 28 Nov 2026 11:59:00 GMT' }),
        NOW,
      ),
      0,
    );
  });

  test('falls back to a numeric body retryAfter in seconds', () => {
    assert.equal(
      parseRateLimitDelayMs(
        axiosError(429, { 'content-type': 'application/json' }, { retryAfter: 12 }),
        NOW,
      ),
      12000,
    );
    // Header wins over body.
    assert.equal(
      parseRateLimitDelayMs(
        axiosError(429, { 'retry-after': '5' }, { retryAfter: 12 }),
        NOW,
      ),
      5000,
    );
  });

  test('returns null when nothing parseable is present', () => {
    assert.equal(parseRateLimitDelayMs(axiosError(429), NOW), null);
    assert.equal(
      parseRateLimitDelayMs(axiosError(429, {}), NOW),
      null,
    );
    assert.equal(
      parseRateLimitDelayMs(axiosError(429, { 'retry-after': 'soon' }), NOW),
      null,
    );
    assert.equal(
      parseRateLimitDelayMs(axiosError(429, { 'retry-after': '-5' }), NOW),
      null,
    );
    assert.equal(
      parseRateLimitDelayMs(axiosError(429, { 'retry-after': '' }), NOW),
      null,
    );
    assert.equal(
      parseRateLimitDelayMs(
        axiosError(429, { 'x-ratelimit-reset': '30' }),
        NOW,
      ),
      null,
    );
    assert.equal(
      parseRateLimitDelayMs(axiosError(429, null, { retryAfter: 'later' }), NOW),
      null,
    );
    // Non-429 errors never yield a delay, even with the header set.
    assert.equal(
      parseRateLimitDelayMs(axiosError(500, { 'retry-after': '5' }), NOW),
      null,
    );
    assert.equal(parseRateLimitDelayMs(null, NOW), null);
  });
});
