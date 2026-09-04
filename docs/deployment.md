# Deployment

## 1. Import into Vercel

Import `freemyai/website` into Vercel:

- Framework: **Next.js**
- Node: **24.x**
- Root directory: `/`
- Build command: `pnpm build`

## 2. Database (Neon)

1. In the Vercel dashboard, install **Neon** from the Marketplace and connect
   it to the `website` project. This sets `DATABASE_URL` for production.
2. Pull env vars locally and apply migrations:

   ```bash
   vercel env pull .env.local
   pnpm db:migrate
   ```

Migrations are manual by design — they never run during builds.

## 3. Environment variables

| Variable                    | Where                         | Notes                                   |
| --------------------------- | ----------------------------- | --------------------------------------- |
| `DATABASE_URL`              | Vercel (via Neon integration) | Required in production                  |
| `NEXT_PUBLIC_SITE_URL`      | Vercel / `.env.local`         | `https://freemy.ai`                     |
| `NEXT_PUBLIC_GITHUB_URL`    | Vercel / `.env.local`         | `https://github.com/freemyai`           |
| `NEXT_PUBLIC_PRODUCT_STAGE` | Vercel / `.env.local`         | `prealpha`                              |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Vercel / `.env.local`         | Optional; footer hides email when unset |

## 4. Domains

- Add `freemy.ai` and `www.freemy.ai` in Vercel → Settings → Domains.
- Make `https://freemy.ai` canonical; 301-redirect `www` to it.

## 5. Analytics

Enable **Web Analytics** and **Speed Insights** in the Vercel dashboard,
then visit the homepage once to confirm data flows.

## 6. Post-deploy smoke test

Verify each of these returns 200:

- https://freemy.ai
- https://freemy.ai/roadmap
- https://freemy.ai/developers
- https://freemy.ai/privacy
- https://freemy.ai/terms
- https://freemy.ai/sitemap.xml
- https://freemy.ai/robots.txt
- https://freemy.ai/llms.txt

Then submit a real test email to the waitlist, confirm the row appears in
Neon, submit it again (should succeed gracefully), and delete the test row.
