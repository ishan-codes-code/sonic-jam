// --------------------------------------------------------------------------
// Tests for first-launch server validation (GET /health contract).
//
// Run (no test runner in this repo; uses the installed tsc + node's runner):
//   npx tsc src/features/server/api/serverValidation.test.ts \
//     --outDir /tmp/sonic-test-build --rootDir . \
//     --module commonjs --target es2022 --moduleResolution node \
//     --esModuleInterop --skipLibCheck
//   node --test /tmp/sonic-test-build/src/features/server/api/serverValidation.test.js
//
// These files are never imported by app code, so Metro never bundles them.
// --------------------------------------------------------------------------

import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkServerConnection } from './serverValidation';

const realFetch = globalThis.fetch;

let lastUrl = '';
let lastInit: RequestInit | undefined;
let fetchCalls = 0;

function recordCall(url: unknown, init?: RequestInit): void {
  fetchCalls += 1;
  lastUrl = String(url);
  lastInit = init;
}

/** Stub fetch with a canned HTTP status + JSON body. */
function respond(status: number, body: unknown): void {
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    recordCall(url, init);
    return { status, json: async () => body };
  }) as unknown as typeof fetch;
}

/** Stub fetch with a body whose parsing fails (e.g. an HTML page). */
function respondUnparsable(status: number): void {
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    recordCall(url, init);
    return {
      status,
      json: async () => {
        throw new Error('Unexpected token');
      },
    };
  }) as unknown as typeof fetch;
}

/** Stub fetch with a network failure. */
function failWithNetworkError(): void {
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    recordCall(url, init);
    throw new Error('socket hang up');
  }) as unknown as typeof fetch;
}

/**
 * Stub fetch with a request that hangs until aborted (emulates real fetch
 * abort semantics: the promise rejects once the signal fires).
 */
function hangUntilAborted(): void {
  globalThis.fetch = ((url: unknown, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      recordCall(url, init);
      init?.signal?.addEventListener('abort', () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      });
    })) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  lastUrl = '';
  lastInit = undefined;
  fetchCalls = 0;
});

// Authoritative backend health shapes (backend-sonic feat/setup-mode-health).
const READY_BODY = {
  app: 'sonic-backend',
  version: '0.0.1',
  apiVersion: 1,
  minAppVersion: '4.0.0',
  setupRequired: false,
  db: 'ok',
  features: { storage: 'r2' },
};

const SETUP_BODY = {
  app: 'sonic-backend',
  version: '0.0.1',
  apiVersion: 1,
  minAppVersion: '4.0.0',
  setupRequired: true,
  db: 'unconfigured',
  features: { storage: 'none' },
};

const DOWN_BODY = {
  app: 'sonic-backend',
  version: '0.0.1',
  apiVersion: 1,
  minAppVersion: '4.0.0',
  setupRequired: false,
  db: 'down',
  features: { storage: 'r2' },
};

describe('checkServerConnection via GET /health', () => {
  test('probes GET /health on the normalized origin', async () => {
    respond(200, READY_BODY);

    const result = await checkServerConnection('https://sonic.example.com/');

    assert.equal(fetchCalls, 1);
    assert.equal(lastUrl, 'https://sonic.example.com/health');
    assert.equal(result.ok, true);
    assert.equal(
      result.ok ? result.serverUrl : null,
      'https://sonic.example.com',
    );
  });

  test('sends no auth token and asks for JSON', async () => {
    respond(200, READY_BODY);

    await checkServerConnection('https://sonic.example.com');

    const headers = (lastInit?.headers ?? {}) as Record<string, string>;
    assert.equal(headers.Authorization, undefined);
    assert.equal(headers.Accept, 'application/json');
  });

  test('accepts a ready Sonic backend (setupRequired false, db ok)', async () => {
    respond(200, { ...READY_BODY, extra: 'ignored' });

    const result = await checkServerConnection('https://sonic.example.com');

    assert.deepEqual(result, {
      ok: true,
      serverUrl: 'https://sonic.example.com',
      storage: 'r2',
      setupRequired: false,
    });
  });

  test('setupRequired true routes to the wizard (not an error)', async () => {
    respond(200, SETUP_BODY);

    const result = await checkServerConnection('https://sonic.example.com');

    assert.deepEqual(result, {
      ok: true,
      serverUrl: 'https://sonic.example.com',
      storage: 'none',
      setupRequired: true,
    });
  });

  test('does not require R2: db ok with storage none still connects', async () => {
    respond(200, { ...READY_BODY, features: { storage: 'none' } });

    const result = await checkServerConnection('http://192.168.1.10:3000');

    assert.deepEqual(result, {
      ok: true,
      serverUrl: 'http://192.168.1.10:3000',
      storage: 'none',
      setupRequired: false,
    });
  });

  test('accepts db ok when storage is absent (informational only)', async () => {
    const { features: _dropped, ...withoutFeatures } = READY_BODY;
    respond(200, withoutFeatures);

    const result = await checkServerConnection('https://sonic.example.com');

    assert.deepEqual(result, {
      ok: true,
      serverUrl: 'https://sonic.example.com',
      storage: null,
      setupRequired: false,
    });
  });

  test('db down reports a database-unavailable message', async () => {
    respond(200, DOWN_BODY);

    const result = await checkServerConnection('https://sonic.example.com');

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'db-down');
    assert.match(result.ok ? '' : result.message, /database/i);
  });

  test('db down wins over setupRequired (no wizard on a down database)', async () => {
    respond(200, { ...DOWN_BODY, setupRequired: true });

    const result = await checkServerConnection('https://sonic.example.com');

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'db-down');
  });

  test('unconfigured db without setupRequired keeps the admin message', async () => {
    respond(200, { ...SETUP_BODY, setupRequired: false });

    const result = await checkServerConnection('https://sonic.example.com');

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'db-unconfigured');
    assert.match(result.ok ? '' : result.message, /administrator/);
    assert.match(result.ok ? '' : result.message, /sign in/);
  });

  test('reads the db state even on non-2xx statuses (e.g. 503)', async () => {
    respond(503, DOWN_BODY);

    const result = await checkServerConnection('https://sonic.example.com');

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'db-down');
  });

  test('HTTP success alone is not proof: 200 without a db state is not-sonic', async () => {
    respond(200, {});

    const result = await checkServerConnection('https://sonic.example.com');

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'not-sonic');
  });

  test('rejects responses with a wrong or missing identity', async () => {
    for (const body of [
      { ...READY_BODY, app: 'other-backend' },
      { ...READY_BODY, app: undefined },
      { ...READY_BODY, setupRequired: undefined },
      { ...READY_BODY, setupRequired: 'false' },
      { ...READY_BODY, db: undefined },
    ]) {
      respond(200, body);
      const result = await checkServerConnection('https://sonic.example.com');
      assert.equal(
        result.ok,
        false,
        `body ${JSON.stringify(body)} accepted`,
      );
      assert.equal(result.ok ? null : result.code, 'not-sonic');
    }
  });

  test('rejects unexpected shapes and unknown db values', async () => {
    for (const body of [
      'Hello World!',
      { status: 'ok' },
      { ...READY_BODY, db: 'ready' },
      { ...READY_BODY, db: null },
      ['db', 'ok'],
      42,
      null,
    ]) {
      respond(200, body);
      const result = await checkServerConnection('https://sonic.example.com');
      assert.equal(result.ok, false, `body ${JSON.stringify(body)} accepted`);
      assert.equal(result.ok ? null : result.code, 'not-sonic');
    }
  });

  test('rejects unparsable bodies', async () => {
    respondUnparsable(200);

    const result = await checkServerConnection('https://sonic.example.com');

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'not-sonic');
  });

  test('rejects backends without /health (old 404 NestJS shape)', async () => {
    respond(404, {
      statusCode: 404,
      message: 'Cannot GET /health',
      error: 'Not Found',
    });

    const result = await checkServerConnection('https://old-backend.example');

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'not-sonic');
  });

  test('network failure reports unreachable', async () => {
    failWithNetworkError();

    const result = await checkServerConnection('https://sonic.example.com');

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'unreachable');
    assert.match(result.ok ? '' : result.message, /reach/i);
  });

  test('hanging request aborts with a timeout code', async () => {
    hangUntilAborted();

    const startedAt = Date.now();
    const result = await checkServerConnection('https://sonic.example.com', {
      timeoutMs: 50,
    });

    assert.ok(Date.now() - startedAt < 5000, 'validation was not bounded');
    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'timeout');
  });

  test('invalid URL never hits the network', async () => {
    const result = await checkServerConnection('not a url');

    assert.equal(fetchCalls, 0);
    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'invalid-url');
  });
});
