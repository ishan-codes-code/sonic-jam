# Contract: Server Health and Validation

## Implemented: `GET /health` — **[Implemented]**

- Purpose: validate a user-supplied server URL (manual input) before saving it
  as the active backend, and route first launch (ready → login, unconfigured
  → setup wizard). Must work WITHOUT authentication.
- Method/path: unauthenticated `GET {serverUrl}/health`, via plain global
  `fetch` (no auth headers, no Axios interceptors, no token refresh, no global
  toasts — validation errors stay inline on the setup screen), with a 15s
  timeout. Implementation: `src/features/server/api/serverValidation.ts`
  (`checkServerConnection()`); the setup readiness poll reuses the same
  `parseHealthPayload()` (`src/features/server/api/setupApi.ts`).
- Response contract (backend: `feat/setup-mode-health` branch):
  - `app`: `"sonic-backend"` — backend identity marker, required.
  - `setupRequired`: boolean — `true` with `db: "ok"` routes into the setup
    wizard (see `docs/contracts/backend-setup.md`); `true` with
    `db: "unconfigured"` never opens the wizard (Termux installer message
    instead); `false` with `db: "ok"` proceeds to login.
  - `db`: `"ok"` (ready for authentication) | `"down"` (configured but
    unavailable — retryable error, never the wizard) | `"unconfigured"`
    (database URL not entered in the Termux installer — retryable
    guidance, never the wizard).
  - `features.storage`: `"r2"` | `"none"` — storage capability indicator,
    informational only. R2 is NOT required to accept a server URL or to
    complete setup.
  - Other fields (`version`, `apiVersion`, `minAppVersion`) are currently
    informational; the client does not enforce version compatibility.
- Acceptance: the body must be a JSON object with the Sonic identity, a
  boolean `setupRequired`, and a documented `db` state. The HTTP status is
  NOT part of the proof — the body is parsed regardless of status, so a
  backend reporting trouble (e.g. 503 with `db: "down"`) still yields its
  specific message. Anything else — unreachable/timeout, unparsable body,
  or JSON without the identity/shape — is rejected as `unreachable`,
  `timeout`, or `not-sonic` with inline copy.
- Failure codes: `invalid-url` (local format check, no request sent),
  `unreachable`, `timeout`, `not-sonic` (reachable but no Sonic health
  shape), `db-unconfigured` (with `setupRequired`: run the Termux installer
  and enter the database URL; without: admin must finish backend setup
  before users can sign in), `db-down`.
- Boot re-check: a saved server is re-checked in the background on startup
  (non-blocking, one check per URL, failures silent). Only a valid response
  with `setupRequired: true` and `db: "ok"` opens the wizard — including
  for signed-in sessions, which are kept. Stale results for a server that is
  no longer active are ignored, and backing out never re-arms the check.
- Backends predating `/health` answer `404` with the stock NestJS error
  shape, which has no `db` field and therefore reads as `not-sonic`.
  There is intentionally no fallback probe.
- Out of scope for validation: backend installation/configuration (setup
  mode, Neon/R2 provisioning — see `backend-setup.md`), worker health, and
  playback readiness. A successful `/health` check proves API reachability
  + database readiness only.

## History

- 2026-11-21 (live hosted backend, pre-`/health`): `GET /health` → `404`
  `{"statusCode":404,…,"message":"Cannot GET /health"}`; `GET /` → `200 "Hello
  World!"` (default NestJS root, not Sonic-specific); unauthenticated
  `GET /auth/me` → `401 {"statusCode":401,…,"message":"Authentication
  invalid"}`. The setup validator briefly relied on that `/auth/me`
  401-shape heuristic; it was replaced by `/health` once the backend shipped
  the endpoint, and the heuristic must not be reintroduced as a fallback.

## Validation UX behavior (client-side)

- States: idle → checking → reachable (save) / unreachable (inline error, keep old server).
- Must not double-toast with the global Axios error handler; validation errors stay inline.
- Timeouts must be short and explicit; a hanging check is treated as unreachable.
