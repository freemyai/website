/**
 * Central registry of analytics events. Components must not invent
 * event names — add them here first.
 */
export const analyticsEvents = {
  heroJoinAlpha: "hero_join_alpha",
  heroGithub: "hero_github",
  headerJoinAlpha: "header_join_alpha",
  waitlistSubmit: "waitlist_submit",
  waitlistSuccess: "waitlist_success",
  developerInterest: "developer_interest",
  roadmapView: "roadmap_view",
  githubOpen: "github_open",
} as const;

export type AnalyticsEventName = (typeof analyticsEvents)[keyof typeof analyticsEvents];

type TrackProps = Record<string, string | number | boolean>;

/**
 * Fires a Vercel Analytics custom event. Safe to call anywhere on the
 * client — it no-ops when analytics is unavailable (e.g. local dev).
 */
export function track(name: AnalyticsEventName, props?: TrackProps) {
  if (typeof window === "undefined") return;
  import("@vercel/analytics")
    .then(({ track: vercelTrack }) => vercelTrack(name, props))
    .catch(() => {
      /* analytics unavailable — ignore */
    });
}
