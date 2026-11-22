# Contract: Server Health and Validation — **[Partial]**

The `/auth/me` heuristic below is **[Implemented]** in
`src/features/server/api/serverValidation.ts` (`checkServerConnection()`). The
`/health` contract is **[Proposed]**: no `/health` client, response type, or
probe exists in the repo. Do not implement against the proposed section until
the backend confirms it; when confirmed, rewrite that section as **[Confirmed]**
with the exact method, path, and response shape.

## Implemented: `GET /auth/me` heuristic

- Purpose: validate a user-supplied server URL (manual input) before saving it
  as the active backend. Must work WITHOUT authentication.
- Behavior: unauthenticated `GET /auth/me` against the candidate origin, via
  plain global `fetch` (no auth headers, no interceptors, no global toasts —
  validation errors stay inline on the setup screen), with a 15s timeout.
- Acceptance (all required): HTTP `401` AND a JSON object body with
  `statusCode: 401` AND a string `message` — the live Sonic backend answers
  `401 {"statusCode":401,…,"message":"Authentication invalid"}` (verified
  2026-11-21; see `docs/contracts/authentication.md`). Anything else —
  unreachable/timeout, non-401 status, non-JSON, or JSON without that shape —
  is rejected as `unreachable`, `timeout`, or `not-sonic` with inline copy.
- Limitation: this is a heuristic, not definitive Sonic identification. A
  generic 401 response proves only that some guarded endpoint exists, and the
  required body shape is the stock NestJS auth-layer error — any NestJS
  service (Sonic or not) can emit it. The check establishes reachability plus
  "looks like the Sonic auth layer"; it cannot prove the host runs Sonic.
  definitive identification awaits the `/health` contract below.

## Field verification (2026-11-21, live hosted backend)

- `GET /health` → `404 {"statusCode":404,…,"message":"Cannot GET /health"}`. The endpoint
  does not exist on the current backend; setup validation must NOT depend on it.
- `GET /` → `200 "Hello World!"` (default NestJS root; not Sonic-specific, unused).
- `GET /auth/me` without a token → `401 {"statusCode":401,…,"message":"Authentication
  invalid"}`. The setup validator relies on this shape as described above.
- Smallest future contract (unchanged): unauthenticated `GET /health` → `200`
  `{ status: 'ok', service: 'sonic', version }`, so the client can also check
  version compatibility. When the backend ships it, add it as the first probe in
  `serverValidation.ts` ahead of the `/auth/me` fallback.

## Needed: `GET /health` (or equivalent) — **[Proposed]**

- Purpose: validate a user-supplied server URL (manual input or QR) before saving it as the
  active backend. Must work WITHOUT authentication.
- Proposed client requirements (need backend confirmation):
  - Fast (< ~5s) and unauthenticated; reachable over both `http` (LAN) and `https`.
  - Response identifies a compatible Sonic backend: at minimum a status field plus a version or
    capability marker the client can compare (exact fields TBD by backend).
  - Distinguishable failure modes: unreachable/timeout (network), reachable-but-not-Sonic
    (wrong host), reachable-but-incompatible (version mismatch).
- Open questions for the project owner / backend:
  1. Exact path and response JSON.
  2. Minimum compatible backend version and how the client should compare it.
  3. Whether one URL serves API + share links + stream hosts, or whether they can split
     (today `MEDIA_URL` falls back to `BASE_URL`; see `docs/SELF_HOST_IMPACT.md` §2).

## Needed: validation UX behavior (client-side, proposed)

- States: idle → checking → reachable (save) / unreachable (inline error, keep old server).
- Must not double-toast with the global Axios error handler; validation errors stay inline.
- Timeouts must be short and explicit; a hanging check is treated as unreachable.
