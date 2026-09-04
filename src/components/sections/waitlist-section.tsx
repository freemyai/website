import { Suspense } from "react";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";

export function WaitlistSection() {
  return (
    <section id="waitlist" className="theme-dark section-block scroll-mt-24">
      <div className="container-site container-content">
        <div className="max-w-2xl">
          <h2 className="headline text-4xl md:text-5xl">
            Build your AI before a provider builds it for you.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Join the first Freemy alpha users and follow the project as we build
            a persistent, local-first personal AI.
          </p>
          <div className="mt-9 max-w-xl">
            <Suspense fallback={null}>
              <WaitlistForm dark />
            </Suspense>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            No spam. Product updates only. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
