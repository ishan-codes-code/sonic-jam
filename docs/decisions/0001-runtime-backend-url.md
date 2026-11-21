# ADR 0001: Runtime-configurable backend URL

- Status: proposed
- Date: 2026-11-21

## Context and problem

The backend address is a build-time constant (`BASE_URL = process.env.EXPO_PUBLIC_API_URL`,
`src/api/apiClient.ts`), baked into the Axios instance, token-refresh calls, the native player's
progress-sync URL, share links, and display helpers (12 touchpoints listed in
`docs/SELF_HOST_IMPACT.md` §2). A generic APK cannot target a self-hosted server, and every
server-URL consumer would need its own migration path.

## Decision

Introduce ONE runtime server module as the single source of truth for the active backend URL:

- The URL is stored in SecureStore (new key beside the token keys), set via manual input or QR
  scan, and validated against `/health` (see `docs/contracts/server-health.md`) before saving.
- On boot with no stored URL, fall back to the baked `EXPO_PUBLIC_API_URL` once, then persist it —
  existing installs and the current hosted backend keep working unchanged.
- All 12 touchpoints read from this module; no new `BASE_URL`/`MEDIA_URL` imports are allowed
  (already a hard rule in `AGENTS.md`).

## Alternatives considered

1. Keep build-time URL + per-server APK flavors. Rejected: defeats the generic-APK goal and
   multiplies build/release work per server.
2. Store the URL in AsyncStorage. Rejected: SecureStore is already the storage boundary for
   session-adjacent secrets, and server identity gates auth behavior.
3. Let each consumer (Axios, player, sharing) manage its own URL. Rejected: guarantees drift;
   server switching must be atomic (see ADR 0002).

## Implementation note (2026-11-21, first-launch setup)

The first-launch implementation (`src/features/server/`) deliberately deviates from the
SecureStore choice above and persists the URL in AsyncStorage (`@sonic_server_url`):

- The URL is non-secret configuration, same class as the cached remote config that
  `versionService.ts` already keeps in AsyncStorage; SecureStore holds session secrets
  (tokens, device ID) with keychain/keystore failure modes a plain setting should not inherit.
- Separate stores keep lifecycles clean: a future server switch wipes tokens while keeping
  (or replacing) the URL, instead of entangling both in one secret-clearing path.
- No new dependency: `@react-native-async-storage/async-storage` is already installed and
  used for search history, recent songs, and config caching.

If this ADR is accepted as-written, either amend the storage choice to AsyncStorage or
migrate the key to SecureStore with the justification above recorded.

## Consequences

- Positive: one migration point, one validation path, atomic server switching.
- Negative: requires touching the native progress-sync URL, whose update API in `@rntp/player`
  is unverified (see ADR 0003); QR scanning needs a new camera/permission dependency.
- If accepted, `docs/SELF_HOST_IMPACT.md` §2 becomes the implementation checklist.
