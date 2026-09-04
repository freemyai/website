import type { Metadata } from "next";
import { CtaSection } from "@/components/sections/cta-section";
import { roadmapStages } from "@/content/roadmap";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Roadmap",
  description:
    "How Freemy evolves: from Freedom Lab experiments to a local-first personal AI, optional cloud, and eventually dedicated hardware.",
  path: "/roadmap",
});

const statusStyles: Record<string, string> = {
  "IN PROGRESS": "bg-signal text-ink",
  NEXT: "bg-ink text-bone",
  PLANNED: "bg-card-warm text-muted-foreground",
  RESEARCH: "bg-card-warm text-muted-foreground",
  LAB: "bg-signal text-ink",
};

export default function RoadmapPage() {
  return (
    <>
      <section className="section-block">
        <div className="container-site container-content">
          <p className="eyebrow">ROADMAP</p>
          <h1 className="headline mt-4 max-w-3xl text-4xl md:text-6xl">
            From lab experiments to an AI that lives with you.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-relaxed">
            Freemy is pre-alpha and building in public. Each stage only starts
            when the previous one proves itself.
          </p>

          <ol className="mt-16 space-y-4">
            {roadmapStages.map((stage) => (
              <li
                key={stage.id}
                className="border-border bg-card-warm grid gap-6 rounded-xl border p-7 md:grid-cols-[200px_1fr] md:gap-10 md:p-10"
              >
                <div>
                  <p className="text-muted-foreground font-mono text-xs">
                    {stage.index}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    {stage.name}
                  </h2>
                  <span
                    className={`mt-3 inline-block rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.1em] ${statusStyles[stage.status]}`}
                  >
                    {stage.status}
                  </span>
                  {stage.goal ? (
                    <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                      {stage.goal}
                    </p>
                  ) : null}
                </div>
                <div>
                  <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                    {stage.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2.5 text-[15px]"
                      >
                        <span className="status-dot" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {stage.note ? (
                    <p className="border-border mt-6 border-t pt-4 text-sm font-medium">
                      {stage.note}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaSection
        title="Follow the build."
        body="Join the alpha list to follow each stage as it ships — and be first to try Freemy when it is ready."
      />
    </>
  );
}
