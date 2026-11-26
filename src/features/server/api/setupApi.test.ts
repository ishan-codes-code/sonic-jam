// --------------------------------------------------------------------------
// Tests for the backend setup API (setup token status, config save, and the
// post-save readiness poll).
//
// Run (no test runner in this repo; uses the installed tsc + node's runner):
//   npx tsc src/features/server/api/setupApi.test.ts \
//     --outDir /tmp/sonic-test-build --rootDir . \
//     --module commonjs --target es2022 --moduleResolution node \
//     --esModuleInterop --skipLibCheck
//   node --test /tmp/sonic-test-build/src/features/server/api/setupApi.test.js
//
// These files are never imported by app code, so Metro never bundles them.
// --------------------------------------------------------------------------

import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  API_KEY_FIELD_KEYS,
  buildConfigPatch,
  getSetupStatus,
  missingSetupFields,
  PLAYBACK_FIELD_KEYS,
  pollHealthUntilReady,
  R2_FIELD_KEYS,
  redactSecrets,
  saveSetupConfig,
  SETUP_CONFIG_KEYS,
  validateWorkerStreamUrl,
} from './setupApi';

const realFetch = globalThis.fetch;
const SERVER_URL = 'https://sonic.example.com';
const TOKEN = 'test-setup-token-abcdef123456';

let lastUrl = '';
let lastInit: RequestInit | undefined;
let fetchCalls = 0;
let lastBody: string | undefined;

function recordCall(url: unknown, init?: RequestInit): void {
  fetchCalls += 1;
  lastUrl = String(url);
  lastInit = init;
  const body = (init as { body?: unknown } | undefined)?.body;
  lastBody = typeof body === 'string' ? body : undefined;
}

/** Stub fetch with a canned HTTP status + JSON body. */
function respond(status: number, body: unknown): void {
  const ok = status >= 200 && status < 300;
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    recordCall(url, init);
    return { ok, status, json: async () => body };
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
  lastBody = undefined;
  fetchCalls = 0;
});

function headers(): Record<string, string> {
  return (lastInit?.headers ?? {}) as Record<string, string>;
}

const READY_HEALTH = {
  app: 'sonic-backend',
  version: '0.0.1',
  apiVersion: 1,
  minAppVersion: '4.0.0',
  setupRequired: false,
  db: 'ok',
  features: { storage: 'none' },
};

const SETUP_HEALTH = {
  ...READY_HEALTH,
  setupRequired: true,
  db: 'unconfigured',
};

describe('getSetupStatus', () => {
  test('sends the setup token header and parses the status', async () => {
    respond(200, {
      setupRequired: true,
      configured: { R2_BUCKET: false, JWT_PLAYBACK_SECRET: true },
      envLocked: ['YOUTUBE_API_KEY'],
    });

    const result = await getSetupStatus(SERVER_URL, TOKEN);

    assert.equal(fetchCalls, 1);
    assert.equal(lastUrl, `${SERVER_URL}/setup/status`);
    assert.equal(headers()['X-Setup-Token'], TOKEN);
    assert.equal(headers().Authorization, undefined);
    assert.deepEqual(result, {
      ok: true,
      status: {
        setupRequired: true,
        configured: { R2_BUCKET: false, JWT_PLAYBACK_SECRET: true },
        envLocked: ['YOUTUBE_API_KEY'],
      },
    });
  });

  test('rejects an invalid token without exposing it', async () => {
    for (const status of [401, 403]) {
      respond(status, { statusCode: status, message: 'Invalid setup token' });

      const result = await getSetupStatus(SERVER_URL, 'wrong-token');

      assert.equal(result.ok, false);
      assert.equal(result.ok ? null : result.code, 'unauthorized');
      assert.ok(!(result.ok ? '' : result.message).includes('wrong-token'));
    }
  });

  test('rejects malformed status bodies', async () => {
    for (const body of [
      { configured: {}, envLocked: [] },
      { setupRequired: true, envLocked: [] },
      { setupRequired: true, configured: {}, envLocked: 'nope' },
      { setupRequired: true, configured: { R2_BUCKET: 'yes' }, envLocked: [] },
      'ok',
      null,
    ]) {
      respond(200, body);
      const result = await getSetupStatus(SERVER_URL, TOKEN);
      assert.equal(result.ok, false, `body ${JSON.stringify(body)} accepted`);
      assert.equal(result.ok ? null : result.code, 'unexpected');
    }
  });

  test('network failure and timeout stay retryable', async () => {
    failWithNetworkError();
    const unreachable = await getSetupStatus(SERVER_URL, TOKEN);
    assert.equal(unreachable.ok, false);
    assert.equal(unreachable.ok ? null : unreachable.code, 'unreachable');

    hangUntilAborted();
    const timedOut = await getSetupStatus(SERVER_URL, TOKEN, {
      timeoutMs: 50,
    });
    assert.equal(timedOut.ok, false);
    assert.equal(timedOut.ok ? null : timedOut.code, 'timeout');
  });
});

describe('saveSetupConfig', () => {
  const SAVED_BODY = {
    saved: true,
    setupRequired: false,
    migration: {
      status: 'completed',
      steps: ['Database connection validated', 'Drizzle migrations applied'],
    },
    restartRequired: true,
  };

  test('posts the patch as JSON with the setup token header', async () => {
    respond(200, SAVED_BODY);

    const result = await saveSetupConfig(
      SERVER_URL,
      TOKEN,
      {
        R2_BUCKET: 'music',
        WORKER_STREAM_URL: 'https://stream.example.dev',
        JWT_PLAYBACK_SECRET: 'playback-secret',
      },
      { timeoutMs: 1000 },
    );

    assert.equal(fetchCalls, 1);
    assert.equal(lastUrl, `${SERVER_URL}/setup/config`);
    assert.equal(headers()['X-Setup-Token'], TOKEN);
    assert.equal(headers().Authorization, undefined);
    assert.equal(headers()['Content-Type'], 'application/json');
    assert.equal(
      (lastInit as { method?: string } | undefined)?.method,
      'POST',
    );
    assert.deepEqual(JSON.parse(lastBody ?? ''), {
      R2_BUCKET: 'music',
      WORKER_STREAM_URL: 'https://stream.example.dev',
      JWT_PLAYBACK_SECRET: 'playback-secret',
    });
    assert.deepEqual(result, { ok: true, result: SAVED_BODY });
  });

  test('refuses empty and non-string patches without a request', async () => {
    const empty = await saveSetupConfig(SERVER_URL, TOKEN, {});
    assert.equal(empty.ok, false);
    assert.equal(empty.ok ? null : empty.code, 'rejected');

    const nonString = await saveSetupConfig(SERVER_URL, TOKEN, {
      R2_BUCKET: 42,
    } as unknown as Record<string, string>);
    assert.equal(nonString.ok, false);
    assert.equal(nonString.ok ? null : nonString.code, 'rejected');

    assert.equal(fetchCalls, 0);
  });

  test('rejects an invalid token without exposing it', async () => {
    respond(401, { statusCode: 401, message: 'Invalid setup token' });

    const result = await saveSetupConfig(SERVER_URL, 'wrong-token', {
      R2_BUCKET: 'music',
    });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'unauthorized');
    assert.ok(!(result.ok ? '' : result.message).includes('wrong-token'));
  });

  test('surfaces migration failures with their steps', async () => {
    respond(500, {
      statusCode: 500,
      message: 'Migration failed',
      migration: { status: 'failed', steps: ['Database connection validated'] },
    });

    const result = await saveSetupConfig(SERVER_URL, TOKEN, {
      R2_BUCKET: 'music',
    });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'migration');
    assert.deepEqual(result.ok ? null : result.migrationSteps, [
      'Database connection validated',
    ]);
  });

  test('redacts submitted secrets from backend error messages', async () => {
    const secret = 'worker-playback-s3cret';
    respond(400, {
      statusCode: 400,
      message: `Rejected configuration value ${secret}, check it`,
    });

    const result = await saveSetupConfig(SERVER_URL, TOKEN, {
      JWT_PLAYBACK_SECRET: secret,
    });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'rejected');
    const message = result.ok ? '' : result.message;
    assert.ok(!message.includes('s3cret'), `leaked secret: ${message}`);
    assert.ok(!message.includes(TOKEN), `leaked token: ${message}`);
  });

  test('network failure and timeout stay retryable', async () => {
    failWithNetworkError();
    const unreachable = await saveSetupConfig(SERVER_URL, TOKEN, {
      R2_BUCKET: 'music',
    });
    assert.equal(unreachable.ok, false);
    assert.equal(unreachable.ok ? null : unreachable.code, 'unreachable');

    hangUntilAborted();
    const timedOut = await saveSetupConfig(
      SERVER_URL,
      TOKEN,
      { R2_BUCKET: 'music' },
      { timeoutMs: 50 },
    );
    assert.equal(timedOut.ok, false);
    assert.equal(timedOut.ok ? null : timedOut.code, 'timeout');
  });
});

describe('setup config keys', () => {
  test('covers storage, playback, and API keys — never the database URL', () => {
    assert.deepEqual([...SETUP_CONFIG_KEYS], [
      ...R2_FIELD_KEYS,
      ...PLAYBACK_FIELD_KEYS,
      ...API_KEY_FIELD_KEYS,
    ]);
    assert.equal(SETUP_CONFIG_KEYS.length, 8);
    assert.ok(!SETUP_CONFIG_KEYS.includes('DATABASE_URL' as never));
  });
});

describe('buildConfigPatch', () => {
  test('trims values and drops empties', () => {
    assert.deepEqual(
      buildConfigPatch(
        { JWT_PLAYBACK_SECRET: '  s3cret  ', R2_BUCKET: '   ' },
        [],
      ),
      { JWT_PLAYBACK_SECRET: 's3cret' },
    );
  });

  test('never submits environment-locked keys', () => {
    assert.deepEqual(
      buildConfigPatch(
        {
          R2_BUCKET: 'music',
          YOUTUBE_API_KEY: 'yt-key',
        },
        ['R2_BUCKET'],
      ),
      { YOUTUBE_API_KEY: 'yt-key' },
    );
  });
});

describe('missingSetupFields', () => {
  test('reports every key when the step is untouched', () => {
    assert.deepEqual(missingSetupFields({}, [...R2_FIELD_KEYS]), [
      ...R2_FIELD_KEYS,
    ]);
  });

  test('reports only the unfilled, unlocked, unconfigured remainder', () => {
    assert.deepEqual(
      missingSetupFields(
        { R2_ACCOUNT_ID: 'abc', R2_BUCKET: '  ' },
        [...R2_FIELD_KEYS],
        {
          envLocked: ['R2_ACCESS_KEY'],
          configured: { R2_SECRET_KEY: true },
        },
      ),
      ['R2_BUCKET'],
    );
  });

  test('is empty when every required key is filled', () => {
    assert.deepEqual(
      missingSetupFields(
        {
          R2_ACCOUNT_ID: 'abc',
          R2_ACCESS_KEY: 'key',
          R2_SECRET_KEY: 'secret',
          R2_BUCKET: 'music',
        },
        [...R2_FIELD_KEYS],
      ),
      [],
    );
    assert.deepEqual(
      missingSetupFields(
        {
          R2_ACCESS_KEY: 'key',
          R2_SECRET_KEY: 'secret',
          R2_BUCKET: 'music',
        },
        [...R2_FIELD_KEYS],
        { envLocked: ['R2_ACCOUNT_ID'] },
      ),
      [],
    );
  });

  test('blank keeps the saved value for configured keys', () => {
    assert.deepEqual(
      missingSetupFields(
        { WORKER_STREAM_URL: '', JWT_PLAYBACK_SECRET: '' },
        [...PLAYBACK_FIELD_KEYS],
        {
          configured: { WORKER_STREAM_URL: true, JWT_PLAYBACK_SECRET: true },
        },
      ),
      [],
    );
  });
});

describe('validateWorkerStreamUrl', () => {
  test('accepts http(s) URLs including sub-paths', () => {
    assert.equal(
      validateWorkerStreamUrl('https://stream.example.dev'),
      null,
    );
    assert.equal(
      validateWorkerStreamUrl('https://stream.example.dev/stream/'),
      null,
    );
    assert.equal(validateWorkerStreamUrl('http://192.168.1.10:8787'), null);
    assert.equal(
      validateWorkerStreamUrl('  https://stream.example.dev  '),
      null,
    );
  });

  test('rejects blank, schemeless, and non-http(s) inputs', () => {
    assert.ok(validateWorkerStreamUrl(''));
    assert.ok(validateWorkerStreamUrl('   '));
    assert.ok(validateWorkerStreamUrl('stream.example.dev'));
    assert.ok(validateWorkerStreamUrl('ftp://stream.example.dev'));
    assert.ok(validateWorkerStreamUrl('not a url'));
  });
});

describe('redactSecrets', () => {
  test('redacts secrets but leaves ordinary text alone', () => {
    assert.equal(
      redactSecrets(`bad token ${TOKEN} here`, [TOKEN]),
      'bad token •••••• here',
    );
    assert.equal(redactSecrets('plain message', [TOKEN]), 'plain message');
  });

  test('ignores tiny secrets that would mangle normal text', () => {
    assert.equal(redactSecrets('a bucket of water', ['a', '']), 'a bucket of water');
  });
});

describe('pollHealthUntilReady', () => {
  test('succeeds immediately when the backend is already ready', async () => {
    respond(200, READY_HEALTH);
    const sleeps: number[] = [];

    const result = await pollHealthUntilReady(SERVER_URL, {
      sleep: async (ms: number) => {
        sleeps.push(ms);
      },
    });

    assert.deepEqual(result, { ready: true, lastDb: 'ok' });
    assert.deepEqual(sleeps, []);
  });

  test('tolerates restart outages and non-ready states until ready', async () => {
    const behaviors: ('fail' | unknown)[] = [
      'fail',
      SETUP_HEALTH,
      { ...READY_HEALTH, db: 'down' },
      READY_HEALTH,
    ];
    let step = 0;
    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      recordCall(url, init);
      const behavior = behaviors[Math.min(step, behaviors.length - 1)];
      step += 1;
      if (behavior === 'fail') {
        throw new Error('socket hang up');
      }
      return { ok: true, status: 200, json: async () => behavior };
    }) as unknown as typeof fetch;
    const sleeps: number[] = [];

    const result = await pollHealthUntilReady(SERVER_URL, {
      intervalMs: 10,
      timeoutMs: 1000,
      sleep: async (ms: number) => {
        sleeps.push(ms);
      },
    });

    assert.deepEqual(result, { ready: true, lastDb: 'ok' });
    assert.equal(fetchCalls, 4);
    assert.deepEqual(sleeps, [10, 10, 10]);
  });

  test('gives up after the retry window with the last known state', async () => {
    respond(200, SETUP_HEALTH);
    const sleeps: number[] = [];
    // Real short sleeps: the window is deadline-based, so instant fake
    // sleeps would spin an unbounded number of iterations here.
    const sleep = (ms: number): Promise<void> =>
      new Promise((resolve) => {
        sleeps.push(ms);
        setTimeout(resolve, ms);
      });

    const result = await pollHealthUntilReady(SERVER_URL, {
      intervalMs: 10,
      timeoutMs: 25,
      sleep,
    });

    assert.equal(result.ready, false);
    assert.equal(result.lastDb, 'unconfigured');
    assert.ok(sleeps.length >= 1 && sleeps.length <= 5);
  });

  test('storage none never blocks readiness', async () => {
    respond(200, { ...READY_HEALTH, features: { storage: 'none' } });

    const result = await pollHealthUntilReady(SERVER_URL, {
      sleep: async () => {},
    });

    assert.deepEqual(result, { ready: true, lastDb: 'ok' });
  });

  test('aborts promptly when the signal fires', async () => {
    respond(200, SETUP_HEALTH);
    const controller = new AbortController();
    controller.abort();

    await assert.rejects(
      pollHealthUntilReady(SERVER_URL, {
        sleep: async () => {},
        signal: controller.signal,
      }),
      (error: unknown) =>
        typeof error === 'object' &&
        error !== null &&
        (error as { name?: unknown }).name === 'AbortError',
    );
  });

  test('polls without any auth headers', async () => {
    respond(200, READY_HEALTH);

    await pollHealthUntilReady(SERVER_URL, {
      sleep: async () => {},
    });

    assert.equal(lastUrl, `${SERVER_URL}/health`);
    assert.equal(headers().Authorization, undefined);
    assert.equal(headers()['X-Setup-Token'], undefined);
  });
});
