# Skill: New Feature Slice / Screen

Use when adding a feature area or a screen + route. Assumes `AGENTS.md` (architecture lock,
hard rules) has been read.

## Steps

1. Confirm placement in `docs/ARCHITECTURE.md` §4–§5: reuse an existing feature if one fits.
   A new `src/features/<name>/` directory needs explicit justification and approval.
2. Mirror the slice layout (only the subdirs you need): `api/`, `components/`, `hooks/`,
   `screens/`, `store/`, `types/`, `utils/`, plus an `index.ts` barrel exporting the public
   surface (see `src/features/auth/index.ts` for the grouped style).
3. Keep route files thin: `src/app/**` renders the feature screen and holds at most route-level
   glue (params, focus toggles — see `src/app/(tabs)/search/index.tsx`). No business logic.
4. Hidden routes (not in the tab bar) must be registered with `href: null` in
   `src/app/(tabs)/_layout.tsx`, following the existing `profile/collections/song/about` entries.
5. Server data goes through React Query with a namespaced `queryKey` owned by the feature;
   export a key factory if another feature must invalidate it (never hardcode foreign keys —
   the `library`→`collection` coupling in `useLibrary.ts` is the anti-pattern).
6. Client/UI state goes in a feature Zustand store; reuse `Toast` (`useToast` /
   `toastImperative`) and `drawer` (`useBottomSheet`) instead of building new systems.
7. After landing: update `docs/ARCHITECTURE.md` (tree + §7 stats) and `docs/FILE_INVENTORY.md`,
   and record the new baseline commit hash.
