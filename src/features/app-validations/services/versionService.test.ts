// --------------------------------------------------------------------------
// Tests for the remote version-config fetch: bounded timeout + cache fallback.
//
// Run (no test runner in this repo; uses the installed tsc + node's runner):
//   npx tsc src/features/app-validations/services/versionService.test.ts \
//     --outDir /tmp/sonic-test-build --rootDir . \
//     --module commonjs --target es2022 --moduleResolution node \
//     --resolveJsonModule --esModuleInterop --skipLibCheck
//   mkdir -p /tmp/sonic-test-build/assets
//   cp assets/version.json /tmp/sonic-test-build/assets/version.json
//   NODE_PATH="$PWD/node_modules" node --test \
//     /tmp/sonic-test-build/src/features/app-validations/services/versionService.test.js
//
// React Native modules are stubbed via require.cache before versionService
// loads (see installStubs). These files are never imported by app code, so
// Metro never bundles them.
// --------------------------------------------------------------------------

import { afterEach, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

type VersionServiceModule = typeof import('./versionService');
let versionService!: VersionServiceModule;

const realFetch = globalThis.fetch;

// In-memory AsyncStorage stand-in.
const memStore = new Map<string, string>();

function installStubs(): void {
  const asyncStorageStub = {
    __esModule: true,
    default: {
      getItem: async (key: string): Promise<string | null> =>
        memStore.has(key) ? (memStore.get(key) as string) : null,
      setItem: async (key: string, value: string): Promise<void> => {
        memStore.set(key, value);
      },
      removeItem: async (key: string): Promise<void> => {
        memStore.delete(key);
      },
    },
  };
  // versionService only reads Constants.expoConfig?.version.
  const expoConstantsStub = {
    __esModule: true,
    default: { expoConfig: { version: '3.0.0' } },
  };
  require.cache[require.resolve('@react-native-async-storage/async-storage')] =
    { exports: asyncStorageStub } as unknown as NodeModule;
  require.cache[require.resolve('expo-constants')] = {
    exports: expoConstantsStub,
  } as unknown as NodeModule;
}

before(async () => {
  installStubs();
  (globalThis as Record<string, unknown>).__DEV__ = false;
  versionService = await import('./versionService');
});

afterEach(() => {
  globalThis.fetch = realFetch;
  memStore.clear();
});

let lastInit: RequestInit | undefined;

/** Stub fetch with a canned HTTP status + JSON body. */
function respond(status: number, body: unknown): void {
  const ok = status >= 200 && status < 300;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    lastInit = init;
    return { ok, status, json: async () => body };
  }) as unknown as typeof fetch;
  lastInit = undefined;
}

/** Stub fetch with a network failure. */
function failWithNetworkError(): void {
  globalThis.fetch = (async () => {
    throw new Error('socket hang up');
  }) as unknown as typeof fetch;
}

/**
 * Stub fetch with a request that hangs until aborted (emulates real fetch
 * abort semantics: the promise rejects once the signal fires).
 */
function hangUntilAborted(): void {
  globalThis.fetch = ((_url: unknown, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      lastInit = init;
      init?.signal?.addEventListener('abort', () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      });
    })) as unknown as typeof fetch;
  lastInit = undefined;
}

const REMOTE_CONFIG = {
  maintenance: { enabled: false, message: '' },
  native: {
    version: '3.0.0',
    minRequiredVersion: '3.0.0',
    forceUpdate: false,
    updateUrl: 'https://example.com/app.apk',
  },
  ota: { version: '3.0.0', force: false, message: '' },
};

describe('fetchRemoteConfig', () => {
  test('returns the parsed config on success', async () => {
    respond(200, REMOTE_CONFIG);

    const config = await versionService.fetchRemoteConfig();

    assert.deepEqual(config, REMOTE_CONFIG);
  });

  test('returns null on HTTP errors and network failures', async () => {
    respond(500, { message: 'boom' });
    assert.equal(await versionService.fetchRemoteConfig(), null);

    failWithNetworkError();
    assert.equal(await versionService.fetchRemoteConfig(), null);
  });

  test(
    'aborts a hanging request after the configured timeout',
    { timeout: 5000 },
    async () => {
      hangUntilAborted();

      const startedAt = Date.now();
      const config = await versionService.fetchRemoteConfig({
        timeoutMs: 60,
      });

      assert.equal(config, null);
      assert.ok(
        Date.now() - startedAt < 4000,
        'remote config fetch was not bounded',
      );
      assert.ok(
        lastInit?.signal instanceof AbortSignal,
        'fetch must receive an abort signal',
      );
    },
  );

  test('the default timeout is bounded', () => {
    assert.equal(typeof versionService.REMOTE_CONFIG_TIMEOUT_MS, 'number');
    assert.ok(Number.isFinite(versionService.REMOTE_CONFIG_TIMEOUT_MS));
    assert.ok(versionService.REMOTE_CONFIG_TIMEOUT_MS > 0);
    assert.ok(versionService.REMOTE_CONFIG_TIMEOUT_MS <= 15_000);
  });
});

describe('getConfig', () => {
  test('persists a fresh remote config for later fallback', async () => {
    respond(200, REMOTE_CONFIG);
    assert.deepEqual(await versionService.getConfig(), REMOTE_CONFIG);

    // The remote dies afterwards: the persisted copy must serve.
    failWithNetworkError();
    assert.deepEqual(await versionService.getConfig(), REMOTE_CONFIG);
  });

  test('falls back to the cached config when the remote fails', async () => {
    respond(200, REMOTE_CONFIG);
    await versionService.getConfig();

    failWithNetworkError();
    assert.deepEqual(await versionService.getConfig(), REMOTE_CONFIG);
  });

  test('returns null when the remote fails and nothing is cached', async () => {
    failWithNetworkError();

    assert.equal(await versionService.getConfig(), null);
  });
});

describe('checkAppVersion', () => {
  test('fails open when the remote is unreachable and nothing is cached', async () => {
    failWithNetworkError();

    const status = await versionService.checkAppVersion();

    assert.deepEqual(status, {
      isMaintenance: false,
      maintenanceMessage: null,
      isForce: false,
      isOptional: false,
      updateUrl: null,
      nativeVersion: null,
      nativeWhatsNew: null,
      nativeMessage: null,
      isOtaForce: false,
      isOtaOptional: false,
      otaVersion: null,
      otaMessage: null,
    });
  });

  test('honors a cached maintenance flag when the remote is down', async () => {
    const maintenanceConfig = {
      ...REMOTE_CONFIG,
      maintenance: { enabled: true, message: 'Down for maintenance' },
    };
    respond(200, maintenanceConfig);
    await versionService.getConfig();

    failWithNetworkError();
    const status = await versionService.checkAppVersion();

    assert.equal(status.isMaintenance, true);
    assert.equal(status.maintenanceMessage, 'Down for maintenance');
    assert.equal(status.isForce, false);
  });
});
