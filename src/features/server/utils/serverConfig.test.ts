// --------------------------------------------------------------------------
// Characterization tests for server URL normalization + validation.
//
// Run (no test runner in this repo; uses the installed tsc + node's runner):
//   npx tsc src/features/server/utils/serverConfig.test.ts \
//     --outDir /tmp/sonic-test-build --rootDir . \
//     --module commonjs --target es2022 --moduleResolution node \
//     --esModuleInterop --skipLibCheck
//   node --test /tmp/sonic-test-build/src/features/server/utils/serverConfig.test.js
//
// These files are never imported by app code, so Metro never bundles them.
// --------------------------------------------------------------------------

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isLocalHostUrl,
  normalizeServerUrl,
  validateServerUrl,
} from './serverConfig';

describe('normalizeServerUrl', () => {
  test('accepts https and strips the trailing slash', () => {
    assert.equal(
      normalizeServerUrl('https://sonic.example.com/'),
      'https://sonic.example.com',
    );
  });

  test('accepts http (local self-hosted servers may use plain http)', () => {
    assert.equal(
      normalizeServerUrl('http://192.168.1.10:3000'),
      'http://192.168.1.10:3000',
    );
  });

  test('lowercases scheme and host', () => {
    assert.equal(
      normalizeServerUrl('HTTPS://Sonic.Example.COM/'),
      'https://sonic.example.com',
    );
  });

  test('keeps non-default ports, drops default ports', () => {
    assert.equal(
      normalizeServerUrl('http://192.168.1.10:3000/'),
      'http://192.168.1.10:3000',
    );
    assert.equal(normalizeServerUrl('https://x.com:443'), 'https://x.com');
    assert.equal(normalizeServerUrl('http://x.com:80'), 'http://x.com');
  });

  test('accepts single-label LAN hostnames', () => {
    assert.equal(
      normalizeServerUrl('http://sonic-server:3000'),
      'http://sonic-server:3000',
    );
  });

  test('accepts bracketed IPv6 literals', () => {
    assert.equal(
      normalizeServerUrl('http://[::1]:3000/'),
      'http://[::1]:3000',
    );
    assert.equal(
      normalizeServerUrl('http://[FD00::1]:3000'),
      'http://[fd00::1]:3000',
    );
  });

  test('rejects unbracketed IPv6 literals', () => {
    assert.equal(normalizeServerUrl('http://::1:3000'), null);
  });

  test('strips query strings and fragments', () => {
    assert.equal(
      normalizeServerUrl('https://sonic.example.com/?token=abc#frag'),
      'https://sonic.example.com',
    );
  });

  test('strips credentials embedded in the URL', () => {
    assert.equal(
      normalizeServerUrl('https://user:pass@sonic.example.com/'),
      'https://sonic.example.com',
    );
    assert.equal(
      normalizeServerUrl('https://user@sonic.example.com'),
      'https://sonic.example.com',
    );
  });

  test('never guesses a scheme for bare host:port input', () => {
    assert.equal(normalizeServerUrl('192.168.1.10:3000'), null);
    assert.equal(normalizeServerUrl('sonic.example.com'), null);
  });

  test('rejects sub-path bases instead of silently dropping them', () => {
    assert.equal(normalizeServerUrl('https://sonic.example.com/api'), null);
    assert.equal(normalizeServerUrl('https://sonic.example.com/api/v1'), null);
  });

  test('rejects non-http(s) protocols', () => {
    assert.equal(normalizeServerUrl('ftp://sonic.example.com'), null);
    assert.equal(normalizeServerUrl('ws://sonic.example.com'), null);
  });

  test('rejects empty input and malformed URLs', () => {
    assert.equal(normalizeServerUrl(''), null);
    assert.equal(normalizeServerUrl('   '), null);
    assert.equal(normalizeServerUrl('https://'), null);
    assert.equal(normalizeServerUrl('https://exa mple.com'), null);
  });

  test('treats a triple-slash segment as the hostname (WHATWG parsing)', () => {
    // `new URL('https:///path')` parses `path` as the host. The `host`
    // error branch in serverConfig stays as unreachable defense-in-depth:
    // empty hosts throw for http(s) before it is reached, and other
    // schemes are rejected by the protocol check first.
    assert.equal(normalizeServerUrl('https:///path'), 'https://path');
  });

  test('allows loopback (same-device Termux servers are legal)', () => {
    assert.equal(
      normalizeServerUrl('http://localhost:3000'),
      'http://localhost:3000',
    );
    assert.equal(
      normalizeServerUrl('http://127.0.0.1:3000'),
      'http://127.0.0.1:3000',
    );
    assert.equal(normalizeServerUrl('http://[::1]:3000'), 'http://[::1]:3000');
  });
});

describe('validateServerUrl', () => {
  test('returns null for acceptable URLs', () => {
    assert.equal(validateServerUrl('https://sonic.example.com'), null);
    assert.equal(validateServerUrl('http://192.168.1.10:3000/'), null);
  });

  test('explains each rejection with actionable copy', () => {
    assert.equal(validateServerUrl(''), 'Enter your server URL.');
    assert.match(validateServerUrl('') ?? '', /server URL/);
    assert.match(
      validateServerUrl('192.168.1.10:3000') ?? '',
      /Include the scheme/,
    );
    assert.equal(
      validateServerUrl('ftp://sonic.example.com'),
      'Only http:// and https:// URLs are supported.',
    );
    assert.equal(
      validateServerUrl('https://sonic.example.com/api'),
      'Enter just the server address, without extra path segments.',
    );
    assert.equal(
      validateServerUrl('https://exa mple.com'),
      "That doesn't look like a valid URL.",
    );
  });
});

describe('isLocalHostUrl', () => {
  test('detects loopback with and without an explicit scheme', () => {
    assert.equal(isLocalHostUrl('http://localhost:3000'), true);
    assert.equal(isLocalHostUrl('localhost:3000'), true);
    assert.equal(isLocalHostUrl('http://127.0.0.1:3000'), true);
    assert.equal(isLocalHostUrl('http://[::1]:3000'), true);
  });

  test('does not flag LAN or remote hosts', () => {
    assert.equal(isLocalHostUrl('http://192.168.1.10:3000'), false);
    assert.equal(isLocalHostUrl('https://sonic.example.com'), false);
    assert.equal(isLocalHostUrl(''), false);
  });
});
