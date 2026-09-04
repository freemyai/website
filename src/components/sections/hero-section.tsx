import { ArrowUpRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TrackedAnchor, TrackedLink, analyticsEvents } from "@/components/track-link";
import { site, stageBadge } from "@/content/site";

export function HeroSection() {
  return (
    <section className="container-site pt-16 pb-20 md:pt-24 md:pb-28">
      <p className="inline-flex items-center gap-2.5 rounded-md border border-border px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.14em] text-muted-foreground">
        <span className="status-dot status-pulse" aria-hidden="true" />
        {stageBadge}
      </p>

      <h1 className="headline mt-8 max-w-4xl text-[52px] sm:text-7xl lg:text-[88px]">
        The AI you own.
      </h1>

      <p className="headline mt-5 max-w-3xl text-2xl text-muted-foreground sm:text-3xl lg:text-4xl">
        Your memory. Your models. Your machine. Your rules.
      </p>

      <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
        Freemy is a local-first personal AI being built to remember what matters,
        work on your machine, use the models you choose, and act with permissions
        you control.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <TrackedLink
          href="/#waitlist"
          event={analyticsEvents.heroJoinAlpha}
          className={`${buttonVariants({ variant: "default" })} h-12 rounded-lg px-6 text-base font-semibold`}
        >
          Join the Alpha
        </TrackedLink>
        <TrackedAnchor
          href={site.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          event={analyticsEvents.heroGithub}
          className={`${buttonVariants({ variant: "outline" })} h-12 rounded-lg px-6 text-base font-semibold`}
        >
          Follow on GitHub
          <ArrowUpRightIcon data-icon="inline-end" />
        </TrackedAnchor>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        No fake cloud magic. No permanent model lock-in. Built around ownership.
      </p>
    </section>
  );
}
