# Source and learning rollout

The site remains a static build. Reviewed resources live in `data/learning-resources.json`; candidate research under `data/candidates/source-discovery/` is never imported into the production build. The license allowlist records only the license identifiers reviewed for this release; it is not a substitute for checking a particular file or project. Published bilingual learning notes use structured JSON under `content/learning/` and are checked together before either language is exposed.

Run `npm run learning:audit`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run seo:audit` before publishing. Browser verification should cover both languages, narrow and wide screens, source and learning clicks, modal switching, filter behavior, and no-JavaScript fallback links. Analytics tests should use the existing QA mode and must not send source URLs or search terms.

The `source_open` and `learning_open` events mean entry clicks, not completed learning. They use the existing analytics switch and QA isolation. Set the optional `FREEMY_LEARNING_EVENTS_STARTED_AT` production variable to the actual UTC time the new events first became live; until it is configured, the private report intentionally treats those earlier values as not collected rather than zero. Follow the existing deployment process; do not change the team's billing or plan.

To roll back, revert the relevant feature and content commits on the current main branch and redeploy; do not delete existing creation records. An empty `records` array is valid and leaves the original catalog and experience links available. Keep the source research records separate from published data.
