import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { roadmapSummary } from "@/content/roadmap";

const statusStyles: Record<string, string> = {
  "IN PROGRESS": "bg-signal text-ink",
  NEXT: "bg-ink text-bone",
  PLANNED: "bg-card-warm text-muted-foreground",
  RESEARCH: "bg-card-warm text-muted-foreground",
};

export function RoadmapSection() {
  return (
    <section className="section-block border-t border-border">
      <div className="container-site container-content">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">ROADMAP</p>
            <h2 className="headline mt-4 text-4xl md:text-5xl">
              Built in stages, in the open.
            </h2>
          </div>
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 hover:underline"
          >
            View full roadmap
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roadmapSummary.map((stage) => (
            <li
              key={stage.index}
              className="flex flex-col rounded-xl border border-border bg-background p-6"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">
                  {stage.index}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.1em] ${statusStyles[stage.status]}`}
                >
                  {stage.status}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {stage.name}
              </h3>
              <ul className="mt-4 flex-1 space-y-2">
                {stage.items.map((item) => (
                  <li key={item} className="text-sm text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
