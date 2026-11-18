# Share and contact baseline — 2026-11-18

- Published main: `70b4cd989091a04bb1c727cce4b804f15af9a234`; feature branch starts from the exact deployed commit and tree. No user edits were present.
- Existing detail URLs, canonical/hreflang, static preview images, public learning resources, private insights function, privacy controls and English default are retained.
- Baseline: lint passed (49 modules), typecheck passed (109 works), learning audit passed, build produced 288 bilingual pages, SEO audit passed (288/288), and `npm test` passed 170/170.
- An initial test run collided with a separately started build while both wrote to `dist`; it failed with ENOENT. Running the suite alone passed 170/170. Future build and test runs must not overlap.
- Official Vercel limits checked 2026-11-18: Hobby and Pro have 2,048 configured routes per deployment; see https://vercel.com/docs/limits. Generated exact routes must remain below the applicable limit and retain current functions and headers.
- Existing public site routes and original experiences were checked before starting; no mailbox send/receive or third-party social-card rendering has been verified.
