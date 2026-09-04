# Architecture

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS 4 with shadcn/ui components on Base UI
- Neon Postgres (serverless driver) for the alpha waitlist
- Vercel Analytics + Speed Insights — no other trackers
- Deployed on Vercel, Node 24

## Principles

- **Server Components by default.** Only the mobile nav, the waitlist form
  and small tracked-link wrappers are client components.
- **No photography, no heavy JS.** All product visuals are HTML/CSS/SVG.
  Animations are pure CSS and fully disabled under
  `prefers-reduced-motion`.
- **Truthful claims.** Nothing on the site may imply features that do not
  exist yet. Concept UI is labelled `CONCEPT PREVIEW`.

## Data flow

The only server-side write path is the `joinWaitlist` Server Action:

```
waitlist-form.tsx (client)
  → joinWaitlist() (Server Action)
      → zod validation (trim, lowercase, email, max 254)
      → honeypot check (fake success for bots)
      → duplicate lookup on LOWER(email)
      → parameterized INSERT (Neon serverless driver)
```

`DATABASE_URL` is server-only and never appears in the client bundle. When
it is absent (local dev, CI), the site still builds and runs; the waitlist
reports itself as temporarily unavailable.

## Directory map

- `src/app` — routes, metadata, OG/Twitter images, sitemap, robots, manifest
- `src/components/sections` — homepage sections
- `src/components/layout` — header, footer, mobile nav
- `src/components/brand` — logo mark / wordmark
- `src/components/waitlist` — waitlist form + success state
- `src/components/ui` — shadcn/ui primitives (Base UI)
- `src/content` — site copy, navigation, roadmap data
- `src/lib` — analytics registry, db access, metadata helpers
- `src/actions` — Server Actions
- `src/schemas` — zod schemas
- `db/migrations` — SQL migrations, applied manually via `pnpm db:migrate`
