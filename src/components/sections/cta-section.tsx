import { Suspense } from "react";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";

type CtaSectionProps = {
  title: string;
  body: string;
  interest?: "alpha" | "developer";
  dark?: boolean;
};

/** Reusable conversion band used by subpages. */
export function CtaSection({
  title,
  body,
  interest = "alpha",
  dark = true,
}: CtaSectionProps) {
  return (
    <section
      className={`section-block border-border border-t ${dark ? "theme-dark" : ""}`}
    >
      <div className="container-site container-content">
        <div className="max-w-2xl">
          <h2 className="headline text-3xl md:text-4xl">{title}</h2>
          <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
            {body}
          </p>
          <div className="mt-8 max-w-xl">
            <Suspense fallback={null}>
              <WaitlistForm interest={interest} dark={dark} />
            </Suspense>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            No spam. Product updates only. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
