# Development Tooling — Investigation Report

Date: 2026-11-21. Method: inspected `package.json`, ran the failing scripts, ran `tsc` and lint.
No tooling files were changed (see §5 for the proposed fix awaiting owner approval).

## 1. Findings

### F1. Seven npm scripts are broken by a missing `scripts/` directory — confirmed

- `scripts/` does not exist (verified with `ls`).
- These scripts all fail with `Error: Cannot find module '.../scripts/generate-project-docs.js'`
  (reproduced via `npm run docs:generate`):
  `docs:generate`, `docs:watch`, `prestart`, `preandroid`, `preios`, `preweb`, `prelint`.
- Consequence: `npm start`, `npm run android`, `npm run ios`, `npm run web`, and `npm run lint`
  ALL fail in their pre-hook before the real command runs. The Expo commands themselves were not
  reached in this investigation.
- `reset-project` (`node ./scripts/reset-project.js`) is broken the same way.

### F2. `postinstall` (`patch-package`) is harmless noise — confirmed

- `patches/` does not exist. Running `npx patch-package` prints `No patch files found` and exits 0.
- It slows every `npm install` slightly and confuses agents, but breaks nothing.

### F3. Baseline type-check is CLEAN — confirmed

- `npx tsc --noEmit` exits 0 with no output (TypeScript 5.9.3, `tsc` binary present).
- This is the most reliable lightweight gate in `docs/TASK_PROTOCOL.md`.

### F4. Baseline lint is RED: 26 errors, 105 warnings — confirmed

- `npx expo lint` exits 1 with 131 problems across the repo (full output saved nowhere; rerun to inspect).
- Error breakdown (26): `react/display-name` (memoized components without display names, mostly in
  `playback/components/`), `react/no-unescaped-entities` (quotes/apostrophes in JSX text), and one
  `import/export` error (`Multiple exports of name 'FeedSection'` in `src/features/home/index.ts`).
- 20 files carry errors; warnings are dominated by `@typescript-eslint/no-unused-vars`.
- Note: `npm run lint` never reaches ESLint (F1) — invoke `npx expo lint` directly until fixed.

### F5. Environment notes — confirmed

- Node v24.22.2, npm 11.19.1 in this environment. `node_modules/.bin/{tsc,eslint}` both present.
- `eslint.config.js` (10 lines): Expo flat config (`eslint-config-expo/flat`), ignores `dist/*`.
- `nativewind-env.d.ts` is an empty (0-line) file — cosmetic only.
- No test runner, no test script, no CI config anywhere in the repo (matches the audit's F4).

## 2. What still works

| Command | State |
|---------|-------|
| `npx tsc --noEmit` | Works, clean baseline |
| `npx expo lint` | Works, red baseline (26E/105W) |
| `npx expo start`, `npx expo run:android/ios` | Presumed working (bypass broken pre-hooks); NOT executed in this investigation |
| `npm start`, `npm run android/ios/web/lint` | BROKEN via pre-hooks (F1) |
| `npm install` | Works; `postinstall` prints noise (F2) |

## 3. Proposed fix (needs project-owner approval — NOT applied)

Per the task boundaries ("do not silently change tooling"), `package.json` was left untouched.
Recommended minimal correction:

1. Remove the `docs:generate` / `docs:watch` scripts and the `prestart`, `preandroid`, `preios`,
   `preweb`, `prelint` hooks (their generator no longer exists; `docs/` is now hand-maintained).
2. Remove `reset-project` (same missing file) OR restore `scripts/reset-project.js` if the workflow is wanted.
3. Remove `postinstall: patch-package` (and the `patch-package` devDep) until a real `patches/` need appears.
4. Optionally add `"typecheck": "tsc --noEmit"` so the protocol's primary gate has a stable name.

## 4. Lint-debt decision (needs project-owner approval)

Options: (a) fix the 26 errors incrementally (display names, entity escapes, the `FeedSection`
double-export) and ratchet warnings down; (b) relax specific rules in `eslint.config.js` with a
recorded reason. Do NOT bulk-fix 105 warnings without approval, and do NOT weaken rules silently —
either choice changes the verification baseline every agent relies on.
