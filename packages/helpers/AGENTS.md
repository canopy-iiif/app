Helpers Agent Notes
===================

Mission
-------
- Centralize repository maintenance scripts (release guards, verification hooks, automation glue).
- Keep the repository root tidy by routing all helper utilities through this workspace.

Key Scripts
-----------
- `guard-publish.js`: Protects publishes by ensuring only `@canopy-iiif/app` is public and preflight checks pass.
- `verify-build.js`: Runs post-build assertions; invoked by the root `npm run verify` script.
- `run-changeset.js`, `version-bump.js`: Wrap Changesets commands with local conventions.
- `template/`: Logic for preparing the GitHub Pages template repo during releases.

Invariants
----------
- Never add ad-hoc scripts at the repository root; route them here and expose via npm scripts.
- Helper scripts should remain Node-compatible without bundling; avoid ESM unless necessary and document runtime requirements.
- Any script that mutates the filesystem must log its intent and respect workspace boundaries.
- Template builds omit this workspace entirely; whenever helpers change behaviour that affects release automation, document the expected template output (e.g., updated `package.json` rewrites, workflow patches).

Active Cleanup Goals
--------------------
1. Document entry points and required environment variables for each script (e.g., `TEMPLATE_PUSH_TOKEN`).
2. Identify shared utilities that can be extracted to reduce duplication (argument parsing, logging, config loading).
3. Capture missing smoke tests or dry-run modes for critical scripts before enabling automation.
4. Review `template/` exclusions to ensure the generated repo stays aligned with current workspace layout.

Session Ritual
--------------
- When editing a helper, record assumptions and follow-up actions here.
- If a script is risky/destructive, note a manual verification step or backup plan.
- Cross-reference open tasks with `packages/AGENTS.md` so root themes stay visible.

Logbook
-------
- 2025-09-26 / chatgpt: Removed fallback behaviour from helper CLIs—`run-changeset` now requires a local @changesets/cli install and `build-tailwind` throws when the Tailwind CLI is missing or fails; template rewrite now pins Tailwind `^4.1.13`.
