# AGENTS.md

- [Architecture](#architecture)
- [Commits](#commits)
- [Pull Requests](#pull-requests)

## Architecture

This is a **vanilla JavaScript npm package**. No build step, no bundler, no server.

### Dependencies

- When updating dependencies, use `npm` commands (e.g. `uninstall`/`install`); do not hand-edit lockfile entries.

## Commits

- **Format:** `.gitmessage` (fallback: `~/.gitmessage`)

## Pull Requests

- **Title:** `.gitmessage` (fallback: `~/.gitmessage`)
- **Description:** `.github/PULL_REQUEST_TEMPLATE.md`
  - Be concise: plain language, simple sentences; reviewers find detail in the diff. Say what changed, then why (if it matters) — never how.
  - When updating, first re-read the current description, because it may have been edited.
