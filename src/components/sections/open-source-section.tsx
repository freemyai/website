import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TrackedAnchor, analyticsEvents } from "@/components/track-link";
import { site } from "@/content/site";

export function OpenSourceSection() {
  return (
    <section className="section-block">
      <div className="container-site container-content">
        <div className="theme-dark rounded-2xl p-8 md:p-14">
          <h2 className="headline text-4xl md:text-5xl">Built in the open.</h2>
          <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-relaxed">
            Freemy is starting in public because ownership means little if the
            system itself is a black box.
          </p>
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg leading-relaxed">
            The website, experiments and early tooling will be developed openly
            as the project evolves.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <TrackedAnchor
              href={site.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              event={analyticsEvents.githubOpen}
              eventProps={{ location: "open_source" }}
              className={`${buttonVariants({ variant: "default" })} bg-signal text-ink hover:bg-signal-bright h-11 rounded-lg px-5 font-semibold`}
            >
              Explore GitHub
              <ArrowUpRightIcon data-icon="inline-end" />
            </TrackedAnchor>
            <Link
              href="/roadmap"
              className={`${buttonVariants({ variant: "outline" })} h-11 rounded-lg px-5 font-semibold`}
            >
              Read the Roadmap
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
