import type { Metadata } from "next";
import { site } from "@/content/site";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Privacy",
  description:
    "What the Freemy AI website collects, and what it never touches.",
  path: "/privacy",
});

const removalHref = site.contactEmail
  ? `mailto:${site.contactEmail}`
  : site.githubUrl;
const removalLabel = site.contactEmail
  ? site.contactEmail
  : "the Freemy AI GitHub organization";

export default function PrivacyPage() {
  return (
    <section className="section-block">
      <div className="container-site container-content max-w-3xl">
        <p className="eyebrow">PRIVACY</p>
        <h1 className="headline mt-4 text-4xl md:text-5xl">
          Privacy, in plain English.
        </h1>
        <p className="text-muted-foreground mt-6 text-lg leading-relaxed">
          This policy covers the Freemy AI marketing website and its alpha
          waitlist. It was last updated on September 4, 2026.
        </p>

        <div className="mt-12 space-y-10 text-[17px] leading-relaxed">
          <section aria-labelledby="collect">
            <h2 id="collect" className="text-xl font-semibold tracking-tight">
              What we collect
            </h2>
            <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-6">
              <li>Your email address, when you join the waitlist.</li>
              <li>
                Basic anonymous site analytics (page views and performance).
              </li>
            </ul>
          </section>

          <section aria-labelledby="not-collect">
            <h2
              id="not-collect"
              className="text-xl font-semibold tracking-tight"
            >
              What we do not collect
            </h2>
            <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-6">
              <li>No advertising profiles.</li>
              <li>No sale of visitor data — ever.</li>
              <li>
                No AI conversation data, because this website currently has no
                AI chat.
              </li>
              <li>
                No IP addresses, browser fingerprints, or full user agents in
                our database.
              </li>
            </ul>
          </section>

          <section aria-labelledby="analytics">
            <h2 id="analytics" className="text-xl font-semibold tracking-tight">
              Analytics
            </h2>
            <p className="text-muted-foreground mt-3">
              We use Vercel Web Analytics and Vercel Speed Insights to
              understand aggregate traffic and performance. They do not use
              advertising cookies and do not build cross-site profiles.
            </p>
          </section>

          <section aria-labelledby="waitlist">
            <h2 id="waitlist" className="text-xl font-semibold tracking-tight">
              Waitlist
            </h2>
            <p className="text-muted-foreground mt-3">
              Waitlist emails are stored in Neon Postgres and used only for
              Freemy product updates. No spam, and you can unsubscribe anytime.
            </p>
          </section>

          <section aria-labelledby="removal">
            <h2 id="removal" className="text-xl font-semibold tracking-tight">
              Removal
            </h2>
            <p className="text-muted-foreground mt-3">
              Contact us to remove your waitlist entry at any time:{" "}
              <a
                href={removalHref}
                className="text-foreground font-medium underline underline-offset-4"
              >
                {removalLabel}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
