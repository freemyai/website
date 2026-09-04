import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Terms",
  description: "Terms of use for the Freemy AI website.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <section className="section-block">
      <div className="container-site container-content max-w-3xl">
        <p className="eyebrow">TERMS</p>
        <h1 className="headline mt-4 text-4xl md:text-5xl">Terms of use.</h1>
        <p className="text-muted-foreground mt-6 text-lg leading-relaxed">
          These terms cover the Freemy AI website. They were last updated on
          September 4, 2026.
        </p>

        <div className="text-muted-foreground mt-12 space-y-10 text-[17px] leading-relaxed">
          <section aria-labelledby="pre-release">
            <h2
              id="pre-release"
              className="text-foreground text-xl font-semibold tracking-tight"
            >
              Pre-release status
            </h2>
            <p className="mt-3">
              Freemy is pre-release software in active development. Website
              content, planned features and timelines may change at any time.
              Nothing on this site is a warranty or promise about unreleased
              product features.
            </p>
          </section>

          <section aria-labelledby="no-service">
            <h2
              id="no-service"
              className="text-foreground text-xl font-semibold tracking-tight"
            >
              No hosted AI service
            </h2>
            <p className="mt-3">
              This website does not currently provide hosted AI inference, user
              accounts, or any downloadable product. The waitlist is an email
              signup for product updates — nothing more.
            </p>
          </section>

          <section aria-labelledby="acceptable-use">
            <h2
              id="acceptable-use"
              className="text-foreground text-xl font-semibold tracking-tight"
            >
              Acceptable use
            </h2>
            <p className="mt-3">
              Don&apos;t abuse the website or the waitlist form, attempt to
              disrupt the service, or misrepresent affiliation with Freemy AI.
            </p>
          </section>

          <section aria-labelledby="liability">
            <h2
              id="liability"
              className="text-foreground text-xl font-semibold tracking-tight"
            >
              Liability
            </h2>
            <p className="mt-3">
              The website is provided &quot;as is&quot; without warranties of
              any kind, to the maximum extent permitted by law.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
