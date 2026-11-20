# Agent Task Execution Protocol

Every coding task in this repo follows the same three phases. Keep the overhead proportional:
a one-line copy fix does not need a design brief, but anything touching auth, API, playback,
navigation, or structure does.

## 1. Before implementation

1. Restate the task in one or two sentences. If it is ambiguous, ask before writing code.
2. Read `AGENTS.md` (entry point) and the docs it points to for the touched area:
   - Structural change → `docs/ARCHITECTURE.md` + `docs/FILE_INVENTORY.md`
   - API work → the relevant file in `docs/contracts/`
   - Architecture-level choice → `docs/decisions/`
3. Inspect the relevant source files and their direct dependencies (callers + callees).
   Do not rely on the audit's summaries for exact shapes; open the file.
4. Identify the scope: list the files you expect to touch and the files you will leave alone.
5. For substantial changes, explain the proposed implementation briefly (what + where + why)
   before editing. Wait for approval when the change needs it (new directories, moves/renames,
   new dependencies, contract changes — see `AGENTS.md`).

## 2. During implementation

- Make focused changes. One task, one concern. No drive-by refactors.
- Preserve existing functionality. Match surrounding naming, typing, and file-organization
  conventions (`api/components/hooks/screens/store/types/utils` inside the owning feature).
- Put new files inside the appropriate existing feature or shared directory. Never create a new
  top-level architectural directory without explicit justification and approval.
- Do not invent API contracts or backend behavior. If the backend shape is unknown, surface the
  gap instead of guessing. Only `docs/contracts/` (confirmed) and the source are authoritative.
- Do not widen known boundary crossings (see `docs/ARCHITECTURE.md` §5) without documenting why.
- Keep lazy imports lazy (`apiClient`, `tokenManager`, background playback service).
- Ask for clarification when a requirement is ambiguous. A wrong guess costs more than a question.

## 3. After implementation

1. Review the final diff in full. Every hunk must belong to the task.
2. Run lightweight verification (see below). Record what passed and what could not be run.
3. Report: modified files (with one-line reason each), important implementation decisions,
   and anything left unverified. Never claim manual verification that did not happen.
4. Update documentation when the change makes it inaccurate: architecture reference +
   inventory for structural changes, contracts for endpoint changes, ADRs for reversed decisions.

## 4. Lightweight verification (testing philosophy)

This repo has no committed test suite, and we are deliberately not building one now.
Manual verification is done separately by the project owner. For routine development, use:

- `npx tsc --noEmit` — TypeScript check (TS 5.9 installed; see `docs/TOOLING.md` for the exact
  invocation and its current state).
- `npx expo lint` — ESLint via the Expo config. NOTE: `npm run lint` currently fails before
  linting because its `prelint` hook points at a missing script (see `docs/TOOLING.md`).
  Invoke the linter directly until that is fixed.
- Syntax/build checks when practical (e.g. reload the dev client route you touched).

Do not introduce test infrastructure, write extensive tests, or add CI unless explicitly requested.
A green type-check is not a claim that the feature works — report it as exactly what it is.
