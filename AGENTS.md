<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent Instructions

This repository is the official Freemy AI website.

## Priorities

1. Truthful product claims.
2. Excellent performance.
3. Accessibility.
4. Minimal dependencies.
5. Clear brand consistency.
6. Server Components by default.

## Never

- invent customer logos
- invent user counts
- invent testimonials
- invent product availability
- add analytics trackers without approval
- add large animation dependencies
- introduce authentication
- introduce an AI chat backend
- add cloud AI APIs
- expose secrets

## Verification loop

After each change: `pnpm lint` → `pnpm typecheck` → `pnpm build` → visual
check → commit.
