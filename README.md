# Freemy AI Website

Official website for https://freemy.ai.

> The AI you own.

This repository contains the public Freemy marketing website.
It is not the Freemy AI runtime.

## Development

Requires Node.js 24 and pnpm.

```bash
pnpm install
pnpm dev
```

Useful scripts:

```bash
pnpm lint          # eslint
pnpm typecheck     # next typegen + tsc --noEmit
pnpm format        # prettier --write
pnpm format:check  # prettier --check
pnpm build         # production build
pnpm test:e2e      # Playwright smoke tests
pnpm db:migrate    # apply db/migrations/*.sql (requires DATABASE_URL)
```

## Architecture

See [docs/architecture.md](docs/architecture.md). In short: Next.js App
Router, Server Components by default, Tailwind CSS 4, shadcn/ui on Base UI,
and a single Server Action for the alpha waitlist backed by Neon Postgres.

## Environment

Copy `.env.example` to `.env.local`. Only `DATABASE_URL` is sensitive; the
`NEXT_PUBLIC_*` values are build-time public configuration. The site builds
and runs without `DATABASE_URL` — waitlist signup then reports itself as
temporarily unavailable instead of failing.

## Database

The waitlist uses Neon Postgres. Schema lives in `db/migrations/`. Apply it
manually with:

```bash
pnpm db:migrate
```

Migrations never run during build, so concurrent preview deployments cannot
race.

## Deployment

See [docs/deployment.md](docs/deployment.md). The site deploys to Vercel
(Node 24, `pnpm build`), with Neon connected through the Vercel Marketplace.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Code is [MIT](LICENSE). The Freemy name and brand are not — see
[TRADEMARKS.md](TRADEMARKS.md).
