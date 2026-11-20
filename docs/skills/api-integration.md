# Skill: API Integration

Use when adding or changing a backend endpoint call. Assumes `AGENTS.md` has been read.
Never invent endpoint shapes — `docs/contracts/` + source are the only authorities.

## Steps

1. Read the matching contract in `docs/contracts/` first. If the endpoint is undocumented,
   establish the shape from the backend (or owner) before coding — not from guesses.
2. Put the call in the owning feature's `api/` module as a method on the existing client object
   (e.g. `libraryApi` in `src/features/library/api/library.api.ts`), wrapping the shared
   `apiClient` from `src/api/apiClient.ts`. Never create a second Axios instance for backend calls.
3. Type request/response in the feature's `types`/`api/*.types.ts`. If the response shape is
   unknown, leave it explicitly untyped and mark the contract `[Partial]` — do not fake a type.
4. Remember the interceptor behavior (confirmed in `apiClient.ts`): auth + `x-device-id` attach
   automatically; mutations with `data.message` toast on success; mutations/5xx toast on error;
   401 triggers one refresh + retry, then session reset. Design the call accordingly (e.g. batch
   deletes should tolerate the benign 404 the interceptor already bypasses for playlist songs).
5. Queries: use React Query in the feature's `hooks/` with an owned, namespaced `queryKey` and a
   sensible `staleTime` (charts/slow data: minutes; user mutations: invalidate, don't cache long).
   Mutations: invalidate every affected key, including keys owned by other features — via their
   exported key factories, not string copies.
6. External (non-backend) calls (iTunes/RSS style) use plain `fetch`/`axios` with no auth headers,
   live in the owning feature's `api/`, and map to shared result types in one place — do not copy
   mapping blocks into new files (see audit R4).
7. After landing: update the touched contract file (method, path, shapes, errors, impl refs) and
   re-verify the 401 path if auth behavior changed.
