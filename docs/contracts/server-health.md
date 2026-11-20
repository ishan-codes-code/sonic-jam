# Contract: Server Health and Validation — **[Proposed]**

Status: nothing here is implemented. No `/health` client, response type, or validation UI exists
in the repo (verified). This file records what the self-host migration NEEDS so the backend can
confirm shapes before any client code is written.

## Needed: `GET /health` (or equivalent)

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

Do not implement against this file until the backend confirms §1. When confirmed, rewrite this
file as **[Confirmed]** with the exact method, path, and response shape.
