# Contract: Server Health and Validation

## Implemented: `GET /health` — **[Implemented]**

- Purpose: validate a user-supplied server URL (manual input) before saving it
  as the active backend. Must work WITHOUT authentication.
- Method/path: unauthenticated `GET {serverUrl}/health`, via plain global
  `fetch` (no auth headers, no Axios interceptors, no token refresh, no global
  toasts — validation errors stay inline on the setup screen), with a 15s
  timeout. Implementation: `src/features/server/api/serverValidation.ts`
  (`checkServerConnection()`).
- Response contract (backend: `feat/setup-mode-health` branch):
  - `db`: `"ok"` (ready for authentication) | `"down"` (database unavailable)
    | `"unconfigured"` (backend needs initial setup by its administrator).
  - `storage`: `"r2"` | `"none"` — storage capability indicator,
    informational only. R2 is NOT required to accept a server URL.
  - The endpoint also carries overall health information; the client keys only
    on `db` (+ `storage` passthrough) and ignores any other fields.
- Acceptance: the body must be a JSON object whose `db` is one of the three
  states above. The HTTP status is NOT part of the proof — the body is parsed
  regardless of status, so a backend reporting trouble (e.g. 503 with
  `db: "down"`) still yields its specific message. Anything else —
  unreachable/timeout, unparsable body, or JSON without a valid `db` — is
  rejected as `unreachable`, `timeout`, or `not-sonic` with inline copy.
- Failure codes: `invalid-url` (local format check, no request sent),
  `unreachable`, `timeout`, `not-sonic` (reachable but no Sonic health shape),
  `db-unconfigured` (admin must complete backend setup before users can sign
  in), `db-down`.
- Backends predating `/health` answer `404` with the stock NestJS error shape,
  which has no `db` field and therefore reads as `not-sonic`. There is
  intentionally no fallback probe: the wizard requires a backend that serves
  the health contract.
- Out of scope for the wizard: backend installation/configuration (setup mode,
  Neon/R2 provisioning), worker health, and playback readiness. A successful
  `/health` check proves API reachability + database readiness only.

## History

- 2026-11-21 (live hosted backend, pre-`/health`): `GET /health` → `404`
  `{"statusCode":404,…,"message":"Cannot GET /health"}`; `GET /` → `200 "Hello
  World!"` (default NestJS root, not Sonic-specific); unauthenticated
  `GET /auth/me` → `401 {"statusCode":401,…,"message":"Authentication
  invalid"}`. The setup validator previously relied on that `/auth/me`
  401-shape heuristic; it was replaced by `/health` once the backend shipped
  the endpoint, and the heuristic must not be reintroduced as a fallback.

## Validation UX behavior (client-side)

- States: idle → checking → reachable (save) / unreachable (inline error, keep old server).
- Must not double-toast with the global Axios error handler; validation errors stay inline.
- Timeouts must be short and explicit; a hanging check is treated as unreachable.
