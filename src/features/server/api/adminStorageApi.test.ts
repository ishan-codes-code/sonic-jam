// --------------------------------------------------------------------------
// Tests for the admin storage API (Settings → Storage, admins only).
//
// Run (no test runner in this repo; uses the installed tsc + node's runner):
//   npx tsc src/features/server/api/adminStorageApi.test.ts \
//     --outDir /tmp/sonic-test-build --rootDir . \
//     --module commonjs --target es2022 --moduleResolution node \
//     --esModuleInterop --skipLibCheck
//   node --test /tmp/sonic-test-build/src/features/server/api/adminStorageApi.test.js
//
// These files are never imported by app code, so Metro never bundles them.
// --------------------------------------------------------------------------

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isNetworkRefreshError } from '../../auth/utils/refreshError';
import {
  ADMIN_STORAGE_GET_TIMEOUT_MS,
  ADMIN_STORAGE_SAVE_TIMEOUT_MS,
  ADMIN_STORAGE_VALUE_KEYS,
  adminStorageModeLabel,
  buildAdminStoragePatch,
  getAdminStorage,
  hasAdminStorageChanges,
  isAdmin,
  missingAdminStorageFields,
  parseAdminSaveResult,
  parseAdminStorageInfo,
  planUnknownResultRetry,
  saveAdminStorage,
  type AdminStorageHttpClient,
  type AdminStorageInfo,
} from './adminStorageApi';
import { STORAGE_MODE_KEY } from './setupApi';

const ALL_SIX = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY',
  'R2_SECRET_KEY',
  'R2_BUCKET',
  'WORKER_STREAM_URL',
  'JWT_PLAYBACK_SECRET',
];

const CONFIGURED_ALL: Record<string, boolean> = {
  R2_ACCOUNT_ID: true,
  R2_ACCESS_KEY: true,
  R2_SECRET_KEY: true,
  R2_BUCKET: true,
  WORKER_STREAM_URL: true,
  JWT_PLAYBACK_SECRET: true,
};

function makeInfo(overrides?: Partial<AdminStorageInfo>): AdminStorageInfo {
  return {
    mode: 'r2',
    modeLocked: false,
    storageModes: ['local', 'r2'],
    configured: { ...CONFIGURED_ALL },
    envLocked: [],
    playbackSecretRequired: false,
    ...overrides,
  };
}

const VALID_INFO_BODY = {
  mode: 'r2',
  modeLocked: false,
  storageModes: ['local', 'r2'],
  configured: { ...CONFIGURED_ALL },
  envLocked: [],
  playbackSecretRequired: false,
};

/** Mock client with recorded calls. */
function mockClient(impl: {
  get?: (url: string, config?: { timeout?: number }) => Promise<unknown>;
  post?: (
    url: string,
    body: unknown,
    config?: { timeout?: number },
  ) => Promise<unknown>;
}): { client: AdminStorageHttpClient; calls: { url: string; body?: unknown; config?: unknown }[] } {
  const calls: { url: string; body?: unknown; config?: unknown }[] = [];
  return {
    calls,
    client: {
      get: async <T,>(
        url: string,
        config?: { timeout?: number },
      ): Promise<{ data: T }> => {
        calls.push({ url, config });
        return { data: (await impl.get?.(url, config)) as T };
      },
      post: async <T,>(
        url: string,
        body: unknown,
        config?: { timeout?: number },
      ): Promise<{ data: T }> => {
        calls.push({ url, body, config });
        return { data: (await impl.post?.(url, body, config)) as T };
      },
    },
  };
}

function httpError(status: number, data?: unknown): unknown {
  return { response: { status, data: data ?? {} }, message: `HTTP ${status}` };
}

function networkError(): unknown {
  return { request: {}, message: 'Network Error' };
}

function timeoutError(): unknown {
  return { code: 'ECONNABORTED', message: 'timeout of 60000ms exceeded' };
}

describe('isAdmin', () => {
  test('only an explicit admin role counts', () => {
    assert.equal(isAdmin({ role: 'admin' }), true);
    assert.equal(isAdmin({ role: 'user' }), false);
  });

  test('a missing role means non-admin', () => {
    assert.equal(isAdmin({}), false);
    assert.equal(isAdmin(null), false);
    assert.equal(isAdmin(undefined), false);
    assert.equal(isAdmin({ role: 'owner' }), false);
  });
});

describe('adminStorageModeLabel', () => {
  test('matches the wizard labels', () => {
    assert.equal(adminStorageModeLabel('local'), 'Local storage');
    assert.equal(adminStorageModeLabel('r2'), 'Cloudflare R2');
  });
});

describe('admin storage value keys', () => {
  test('covers the six credential keys — never the mode, database, or tokens', () => {
    assert.deepEqual([...ADMIN_STORAGE_VALUE_KEYS], ALL_SIX);
    assert.equal(ADMIN_STORAGE_VALUE_KEYS.length, 6);
    assert.ok(!ADMIN_STORAGE_VALUE_KEYS.includes('DATABASE_URL' as never));
    assert.ok(!ADMIN_STORAGE_VALUE_KEYS.includes('STORAGE_MODE' as never));
  });
});

describe('missingAdminStorageFields', () => {
  test('local mode needs nothing', () => {
    assert.deepEqual(
      missingAdminStorageFields({}, 'local', {
        envLocked: [],
        configured: {},
        playbackSecretRequired: false,
      }),
      [],
    );
  });

  test('first-time r2 requires all six fields', () => {
    assert.deepEqual(
      missingAdminStorageFields({}, 'r2', {
        envLocked: [],
        configured: {},
        playbackSecretRequired: false,
      }),
      ALL_SIX,
    );
  });

  test('blank configured fields keep their saved values', () => {
    assert.deepEqual(
      missingAdminStorageFields(
        { R2_BUCKET: '', JWT_PLAYBACK_SECRET: '' },
        'r2',
        {
          envLocked: [],
          configured: CONFIGURED_ALL,
          playbackSecretRequired: false,
        },
      ),
      [],
    );
  });

  test('reports only the unfilled, unlocked, unconfigured remainder', () => {
    assert.deepEqual(
      missingAdminStorageFields(
        { R2_ACCOUNT_ID: 'abc', R2_BUCKET: '  ' },
        'r2',
        {
          envLocked: ['R2_ACCESS_KEY'],
          configured: { R2_SECRET_KEY: true },
          playbackSecretRequired: false,
        },
      ),
      ['R2_BUCKET', 'WORKER_STREAM_URL', 'JWT_PLAYBACK_SECRET'],
    );
  });

  test('env-locked keys are never required', () => {
    assert.deepEqual(
      missingAdminStorageFields({}, 'r2', {
        envLocked: [...ALL_SIX],
        configured: {},
        playbackSecretRequired: true,
      }),
      [],
    );
  });

  test('playbackSecretRequired forces the secret even though configured', () => {
    assert.deepEqual(
      missingAdminStorageFields({}, 'r2', {
        envLocked: [],
        configured: CONFIGURED_ALL,
        playbackSecretRequired: true,
      }),
      ['JWT_PLAYBACK_SECRET'],
    );
    // An entered secret satisfies it.
    assert.deepEqual(
      missingAdminStorageFields(
        { JWT_PLAYBACK_SECRET: 'new-secret' },
        'r2',
        {
          envLocked: [],
          configured: CONFIGURED_ALL,
          playbackSecretRequired: true,
        },
      ),
      [],
    );
  });
});

describe('buildAdminStoragePatch', () => {
  test('always sends STORAGE_MODE, even for settings-only updates', () => {
    assert.deepEqual(
      buildAdminStoragePatch({
        selectedMode: 'r2',
        values: {},
        envLocked: [],
        modeLocked: false,
        currentMode: 'r2',
      }),
      { [STORAGE_MODE_KEY]: 'r2' },
    );
  });

  test('r2 trims values and drops blanks', () => {
    assert.deepEqual(
      buildAdminStoragePatch({
        selectedMode: 'r2',
        values: {
          R2_BUCKET: '  music  ',
          R2_ACCOUNT_ID: '   ',
          JWT_PLAYBACK_SECRET: 's3cret',
        },
        envLocked: [],
        modeLocked: false,
        currentMode: 'r2',
      }),
      {
        [STORAGE_MODE_KEY]: 'r2',
        R2_BUCKET: 'music',
        JWT_PLAYBACK_SECRET: 's3cret',
      },
    );
  });

  test('never submits environment-locked keys', () => {
    assert.deepEqual(
      buildAdminStoragePatch({
        selectedMode: 'r2',
        values: { R2_BUCKET: 'music', R2_ACCOUNT_ID: 'abc' },
        envLocked: ['R2_BUCKET'],
        modeLocked: false,
        currentMode: 'r2',
      }),
      { [STORAGE_MODE_KEY]: 'r2', R2_ACCOUNT_ID: 'abc' },
    );
  });

  test('modeLocked sends the current mode, not the selection', () => {
    assert.deepEqual(
      buildAdminStoragePatch({
        selectedMode: 'r2',
        values: { R2_BUCKET: 'music' },
        envLocked: [],
        modeLocked: true,
        currentMode: 'local',
      }),
      { [STORAGE_MODE_KEY]: 'local' },
    );
  });

  test('local sends the mode alone, ignoring any entered values', () => {
    const patch = buildAdminStoragePatch({
      selectedMode: 'local',
      values: { R2_BUCKET: 'music', JWT_PLAYBACK_SECRET: 's3cret' },
      envLocked: [],
      modeLocked: false,
      currentMode: 'r2',
    });
    assert.deepEqual(patch, { [STORAGE_MODE_KEY]: 'local' });
  });

  test('patch keys are the mode plus the six credentials only', () => {
    const patch = buildAdminStoragePatch({
      selectedMode: 'r2',
      values: {
        R2_ACCOUNT_ID: 'a',
        R2_ACCESS_KEY: 'b',
        R2_SECRET_KEY: 'c',
        R2_BUCKET: 'd',
        WORKER_STREAM_URL: 'https://w.example.dev',
        JWT_PLAYBACK_SECRET: 'e',
        DATABASE_URL: 'postgres://x',
      },
      envLocked: [],
      modeLocked: false,
      currentMode: 'r2',
    });
    assert.deepEqual(Object.keys(patch).sort(), [
      'JWT_PLAYBACK_SECRET',
      'R2_ACCESS_KEY',
      'R2_ACCOUNT_ID',
      'R2_BUCKET',
      'R2_SECRET_KEY',
      'STORAGE_MODE',
      'WORKER_STREAM_URL',
    ]);
  });
});

describe('hasAdminStorageChanges', () => {
  test('false when the mode matches and nothing is entered', () => {
    assert.equal(hasAdminStorageChanges('r2', {}, makeInfo()), false);
    assert.equal(
      hasAdminStorageChanges('r2', { R2_BUCKET: '   ' }, makeInfo()),
      false,
    );
  });

  test('true on a mode change', () => {
    assert.equal(hasAdminStorageChanges('local', {}, makeInfo()), true);
  });

  test('true for settings-only r2 updates', () => {
    assert.equal(
      hasAdminStorageChanges('r2', { R2_BUCKET: 'music' }, makeInfo()),
      true,
    );
  });

  test('values in env-locked fields do not count', () => {
    assert.equal(
      hasAdminStorageChanges(
        'r2',
        { R2_BUCKET: 'music' },
        makeInfo({ envLocked: ['R2_BUCKET'] }),
      ),
      false,
    );
  });

  test('values do not count for an effective local mode', () => {
    assert.equal(
      hasAdminStorageChanges(
        'local',
        { R2_BUCKET: 'music' },
        makeInfo({ mode: 'local' }),
      ),
      false,
    );
    // Locked to local: entered values are never sent, so nothing changed.
    assert.equal(
      hasAdminStorageChanges(
        'local',
        { R2_BUCKET: 'music' },
        makeInfo({ mode: 'local', modeLocked: true }),
      ),
      false,
    );
  });
});

describe('parseAdminStorageInfo', () => {
  test('parses a full valid body', () => {
    assert.deepEqual(parseAdminStorageInfo(VALID_INFO_BODY), {
      mode: 'r2',
      modeLocked: false,
      storageModes: ['local', 'r2'],
      configured: { ...CONFIGURED_ALL },
      envLocked: [],
      playbackSecretRequired: false,
    });
  });

  test('missing configured keys read as unconfigured; extras ignored', () => {
    const info = parseAdminStorageInfo({
      ...VALID_INFO_BODY,
      configured: { R2_BUCKET: true, YOUTUBE_API_KEY: true },
    });
    assert.deepEqual(info?.configured, {
      R2_ACCOUNT_ID: false,
      R2_ACCESS_KEY: false,
      R2_SECRET_KEY: false,
      R2_BUCKET: true,
      WORKER_STREAM_URL: false,
      JWT_PLAYBACK_SECRET: false,
    });
  });

  test('storage modes reuse the wizard parsing (R2 default, unknowns dropped)', () => {
    const { storageModes, ...rest } = VALID_INFO_BODY;
    assert.deepEqual(parseAdminStorageInfo(rest)?.storageModes, ['r2']);
    assert.deepEqual(
      parseAdminStorageInfo({ ...rest, storageModes: ['local', 's3'] })
        ?.storageModes,
      ['local'],
    );
  });

  test('rejects malformed bodies', () => {
    for (const body of [
      null,
      'ok',
      [],
      { ...VALID_INFO_BODY, mode: 's3' },
      { ...VALID_INFO_BODY, mode: 'none' },
      { ...VALID_INFO_BODY, modeLocked: 'no' },
      { ...VALID_INFO_BODY, configured: null },
      { ...VALID_INFO_BODY, configured: [] },
      { ...VALID_INFO_BODY, configured: { R2_BUCKET: 'yes' } },
      { ...VALID_INFO_BODY, envLocked: 'R2_BUCKET' },
      { ...VALID_INFO_BODY, envLocked: [42] },
      { ...VALID_INFO_BODY, playbackSecretRequired: 'no' },
      { ...VALID_INFO_BODY, playbackSecretRequired: undefined },
    ]) {
      assert.equal(
        parseAdminStorageInfo(body),
        null,
        `accepted ${JSON.stringify(body)}`,
      );
    }
  });
});

describe('parseAdminSaveResult', () => {
  test('parses a full valid body', () => {
    assert.deepEqual(
      parseAdminSaveResult({
        saved: true,
        storageMode: 'local',
        restartRequired: true,
        generatedKeys: ['JWT_PLAYBACK_SECRET'],
      }),
      {
        saved: true,
        storageMode: 'local',
        restartRequired: true,
        generatedKeys: ['JWT_PLAYBACK_SECRET'],
      },
    );
  });

  test('optional fields may be absent', () => {
    assert.deepEqual(
      parseAdminSaveResult({ saved: true, storageMode: 'r2' }),
      { saved: true, storageMode: 'r2' },
    );
  });

  test('rejects malformed bodies', () => {
    for (const body of [
      null,
      'ok',
      { saved: true },
      { saved: false, storageMode: 'r2' },
      { saved: true, storageMode: 's3' },
    ]) {
      assert.equal(
        parseAdminSaveResult(body),
        null,
        `accepted ${JSON.stringify(body)}`,
      );
    }
  });

  test('ignores a malformed generated-keys list (wizard discipline)', () => {
    assert.deepEqual(
      parseAdminSaveResult({
        saved: true,
        storageMode: 'r2',
        generatedKeys: 'JWT_PLAYBACK_SECRET',
      }),
      { saved: true, storageMode: 'r2' },
    );
  });
});

describe('getAdminStorage', () => {
  test('GETs /admin/storage with a bounded timeout', async () => {
    const { client, calls } = mockClient({
      get: async () => VALID_INFO_BODY,
    });

    const result = await getAdminStorage(client);

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, '/admin/storage');
    assert.deepEqual(calls[0]?.config, {
      timeout: ADMIN_STORAGE_GET_TIMEOUT_MS,
    });
    assert.equal(result.ok, true);
    assert.equal(result.ok ? result.info.mode : null, 'r2');
  });

  test('maps 403 to forbidden and 404 to outdated', async () => {
    const forbidden = await getAdminStorage(
      mockClient({
        get: async () => {
          throw httpError(403, { message: 'Forbidden' });
        },
      }).client,
    );
    assert.equal(forbidden.ok, false);
    assert.equal(forbidden.ok ? null : forbidden.code, 'forbidden');
    assert.match(
      forbidden.ok ? '' : forbidden.message,
      /[Aa]dmin access is required/,
    );

    const outdated = await getAdminStorage(
      mockClient({
        get: async () => {
          throw httpError(404, { message: 'Cannot GET /admin/storage' });
        },
      }).client,
    );
    assert.equal(outdated.ok, false);
    assert.equal(outdated.ok ? null : outdated.code, 'outdated');
    assert.match(outdated.ok ? '' : outdated.message, /update/);
  });

  test('maps 401, network, timeout, and bad shapes', async () => {
    const unauthorized = await getAdminStorage(
      mockClient({
        get: async () => {
          throw httpError(401, { message: 'Unauthorized' });
        },
      }).client,
    );
    assert.equal(unauthorized.ok, false);
    assert.equal(unauthorized.ok ? null : unauthorized.code, 'unauthorized');

    const unreachable = await getAdminStorage(
      mockClient({
        get: async () => {
          throw networkError();
        },
      }).client,
    );
    assert.equal(unreachable.ok, false);
    assert.equal(unreachable.ok ? null : unreachable.code, 'unreachable');

    const timedOut = await getAdminStorage(
      mockClient({
        get: async () => {
          throw timeoutError();
        },
      }).client,
    );
    assert.equal(timedOut.ok, false);
    assert.equal(timedOut.ok ? null : timedOut.code, 'timeout');

    const badShape = await getAdminStorage(
      mockClient({ get: async () => ({ mode: 's3' }) }).client,
    );
    assert.equal(badShape.ok, false);
    assert.equal(badShape.ok ? null : badShape.code, 'unexpected');
  });
});

describe('saveAdminStorage', () => {
  const PATCH = { [STORAGE_MODE_KEY]: 'r2', R2_BUCKET: 'music' };

  test('POSTs the patch with a bounded timeout', async () => {
    const { client, calls } = mockClient({
      post: async () => ({ saved: true, storageMode: 'r2' }),
    });

    const result = await saveAdminStorage(client, PATCH);

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, '/admin/storage');
    assert.deepEqual(calls[0]?.body, PATCH);
    assert.deepEqual(calls[0]?.config, {
      timeout: ADMIN_STORAGE_SAVE_TIMEOUT_MS,
    });
    assert.deepEqual(result, {
      ok: true,
      result: { saved: true, storageMode: 'r2' },
    });
  });

  test('refuses patches without STORAGE_MODE without a request', async () => {
    const { client, calls } = mockClient({ post: async () => ({}) });

    const result = await saveAdminStorage(client, { R2_BUCKET: 'music' });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'rejected');
    assert.equal(calls.length, 0);
  });

  test('redacts submitted secrets from 400 messages', async () => {
    const secret = 'worker-playback-s3cret';
    const { client } = mockClient({
      post: async () => {
        throw httpError(400, {
          message: `Rejected configuration value ${secret}, check it`,
        });
      },
    });

    const result = await saveAdminStorage(client, {
      [STORAGE_MODE_KEY]: 'r2',
      JWT_PLAYBACK_SECRET: secret,
    });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.code, 'rejected');
    const message = result.ok ? '' : result.message;
    assert.ok(!message.includes('s3cret'), `leaked secret: ${message}`);
  });

  test('maps 403 to forbidden and 404 to outdated', async () => {
    const forbidden = await saveAdminStorage(
      mockClient({
        post: async () => {
          throw httpError(403, { message: 'Forbidden' });
        },
      }).client,
      PATCH,
    );
    assert.equal(forbidden.ok, false);
    assert.equal(forbidden.ok ? null : forbidden.code, 'forbidden');
    assert.match(
      forbidden.ok ? '' : forbidden.message,
      /[Aa]dmin access is required/,
    );

    const outdated = await saveAdminStorage(
      mockClient({
        post: async () => {
          throw httpError(404, { message: 'Cannot POST /admin/storage' });
        },
      }).client,
      PATCH,
    );
    assert.equal(outdated.ok, false);
    assert.equal(outdated.ok ? null : outdated.code, 'outdated');
    assert.match(outdated.ok ? '' : outdated.message, /update/);
  });

  test('timeout and connection loss stay unknown (never rejected)', async () => {
    const timedOut = await saveAdminStorage(
      mockClient({
        post: async () => {
          throw timeoutError();
        },
      }).client,
      PATCH,
    );
    assert.equal(timedOut.ok, false);
    assert.equal(timedOut.ok ? null : timedOut.code, 'timeout');

    const unreachable = await saveAdminStorage(
      mockClient({
        post: async () => {
          throw networkError();
        },
      }).client,
      PATCH,
    );
    assert.equal(unreachable.ok, false);
    assert.equal(unreachable.ok ? null : unreachable.code, 'unreachable');
  });
});

describe('planUnknownResultRetry', () => {
  test('a landed mode change continues to the health poll', () => {
    assert.deepEqual(
      planUnknownResultRetry({
        submittedMode: 'local',
        previousMode: 'r2',
        check: { ok: true, mode: 'local' },
      }),
      {
        confirmed: true,
        message:
          'The new storage mode is active. Waiting for the server to finish restarting.',
      },
    );
  });

  test('settings-only updates cannot be proven and offer a resubmit', () => {
    const plan = planUnknownResultRetry({
      submittedMode: 'r2',
      previousMode: 'r2',
      check: { ok: true, mode: 'r2' },
    });
    assert.equal(plan.confirmed, false);
    assert.match(plan.message, /could not be confirmed/);
    assert.match(plan.message, /save again/);
  });

  test('an unlanded mode change offers a resubmit', () => {
    const plan = planUnknownResultRetry({
      submittedMode: 'local',
      previousMode: 'r2',
      check: { ok: true, mode: 'r2' },
    });
    assert.equal(plan.confirmed, false);
    assert.match(plan.message, /Cloudflare R2/);
    assert.match(plan.message, /save again/);
  });

  test('a failed check offers a resubmit with a way to leave', () => {
    const plan = planUnknownResultRetry({
      submittedMode: 'r2',
      previousMode: 'r2',
      check: { ok: false },
    });
    assert.equal(plan.confirmed, false);
    assert.match(plan.message, /could not be reached/);
    assert.match(plan.message, /save again/);
    assert.match(plan.message, /leave/);
  });

  test('an unexpected concurrent mode change offers a resubmit', () => {
    const plan = planUnknownResultRetry({
      submittedMode: 'r2',
      previousMode: 'r2',
      check: { ok: true, mode: 'local' },
    });
    assert.equal(plan.confirmed, false);
    assert.match(plan.message, /Local storage/);
  });
});

describe('isNetworkRefreshError', () => {
  test('network-level failures preserve the session', () => {
    assert.equal(isNetworkRefreshError(networkError()), true);
    assert.equal(isNetworkRefreshError(timeoutError()), true);
    assert.equal(isNetworkRefreshError({ code: 'ERR_NETWORK' }), true);
    assert.equal(isNetworkRefreshError({ code: 'ETIMEDOUT' }), true);
  });

  test('server answers and non-transport errors keep clearing it', () => {
    assert.equal(isNetworkRefreshError(httpError(401)), false);
    assert.equal(isNetworkRefreshError(httpError(400)), false);
    assert.equal(
      isNetworkRefreshError({ response: { status: 500 }, request: {} }),
      false,
    );
    assert.equal(isNetworkRefreshError(new Error('No refresh token')), false);
    assert.equal(isNetworkRefreshError(null), false);
    assert.equal(isNetworkRefreshError(undefined), false);
    assert.equal(isNetworkRefreshError('nope'), false);
  });
});
