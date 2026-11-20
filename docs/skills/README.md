# Agent Skills

Reusable procedural checklists for specialized work. Skills assume `AGENTS.md` has been read and
do NOT repeat its rules — they link back to it.

> Location note: the requested home for these skills is `.agents/skills/`, but `.agents/` is a
> read-only filesystem in this environment (verified 2026-11-21: `touch .agents/.write_test`
> fails). Until the project owner makes `.agents/` writable, skills live here in `docs/skills/`
> and are linked from `AGENTS.md`. If `.agents/skills/` becomes available, move these files there
> unchanged and keep this README as a pointer.

## Index

| Skill | Use when |
|-------|----------|
| [feature-slice](feature-slice.md) | Adding a new feature slice or new screen + route |
| [api-integration](api-integration.md) | Adding or changing a backend endpoint call |
| [playback-queue](playback-queue.md) | Adding or changing a player/queue operation |

Deliberately NOT created (would duplicate `AGENTS.md` or lack a concrete need): generic
React Native guidance, auth-session handling (covered by `AGENTS.md` + `docs/contracts/`),
Expo native-module guidance (no native-module task exists yet — add when one does).
