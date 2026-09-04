# Contributing

Thanks for helping build the Freemy AI website.

## What we welcome

- Bug fixes
- Accessibility improvements
- Performance improvements
- Copy corrections
- General website improvements

Product strategy, positioning and roadmap are set by the Freemy team — pull
requests that change them will be closed, but issues proposing ideas are
welcome.

## Before opening a PR

All of these must pass:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

## Ground rules

- Truthful product claims only — no invented users, testimonials, benchmarks
  or availability.
- No new analytics trackers.
- No large animation or 3D dependencies.
- No authentication, payments, CMS, or AI chat backend in this repository.
- Server Components by default; client components only where interactivity
  requires them.
