# Share and contact release checks

The released site keeps existing canonical work pages and exposes only exact,
permanent aliases. `data/share-aliases.json` is the durable registry. When a
published work is added, add a unique active entry and run `npm run share:sync`
before committing; retain old and retired names so they cannot be reassigned.
`config/share-history.json` records every alias owner; synchronization refuses
to remove or reassign historical names and adds newly registered aliases.
The build runs a read-only route check and never rewrites Vercel configuration.

Run the following sequentially where builds write the same `dist` directory:

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run share:check
npm run build
npm run learning:audit
npm run seo:audit
npm run share:audit
```

Run `tests/share-browser.mjs` with a local static server serving `dist`, plus
`tests/share-analytics-browser.mjs`. The QR decoder and browser screenshots are
additional evidence, not a substitute for a real phone scan. `reports/share/`
contains the local link index and audit; it is ignored by Git and excluded from
public output.

Before release compare the configured route count with the then-current
[Vercel limits](https://vercel.com/docs/limits). On 2026-11-18 the documented
Hobby and Pro limit was 2,048 routes per deployment; this project used 439
configured routes. Preview and production must be checked separately for 308
responses, language targets, query/fragment handling, unknown paths, OG images,
static modules, and preservation of private insights authorization and headers.

`FREEMY_SHARE_EVENTS_STARTED_AT` is a production timestamp indicating when the
new events became available. If it is missing the private report says
“未采集” rather than inventing zeros. `FREEMY_CUSTOM_EVENTS`, QA/off controls,
and the existing private report credentials remain unchanged. A browser event
or network request alone does not establish ingestion by the analytics service.

The website only prepares `mailto:` links; it does not send mail. Mailbox
delivery and replies require a separate authorized test by the owner. Social
platform cards, actual mobile-device QR scans, and individual post publication
must not be claimed as tested unless directly verified.
