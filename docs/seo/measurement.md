# Measurement handoff

Freemy's existing Vercel Web Analytics and Speed Insights scripts remain in place. Both receive a `beforeSend` filter that removes query strings and fragments from event URLs; malformed URLs are dropped. The configured `strict-origin` referrer policy limits referrers to the origin. The callbacks are covered by browser tests, but actual deployed payloads and headers still require verification.

The four prepared custom events are `preview_open`, `experience_open`, `related_click`, and `collection_open`. A click to the original site is a click, not proof that someone completed the experience. When enabled, event properties contain at most `work_id` and `placement`; the latter combines the language, page type and a fixed placement label. No raw search terms are included. Navigation never waits for analytics.

Custom events are **disabled by default**. Vercel's current documentation lists them for Pro and Enterprise, with two properties on Pro. The connected account's plan and event ingestion were not confirmed in this work, so neither is claimed to work. After the owner confirms plan support and any costs, a future authorized production build may opt in with `FREEMY_CUSTOM_EVENTS=1`; preview and local builds remain disabled. Confirm actual event arrival in the Vercel dashboard before relying on the data.
