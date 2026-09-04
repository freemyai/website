import type { Metadata } from "next";
import { CtaSection } from "@/components/sections/cta-section";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Developers",
  description:
    "Freemy's developer interfaces are planned around three layers: model inference, portable memory and owner-controlled agents.",
  path: "/developers",
});

const interfaces = [
  {
    name: "Model Interface",
    status: "RESEARCH",
    items: [
      "OpenAI-compatible",
      "Bring local or hosted models",
      "Owner-selected behavior",
    ],
  },
  {
    name: "Memory Interface",
    status: "LAB",
    items: ["retain", "recall", "update", "forget", "reflect"],
  },
  {
    name: "Agent Interface",
    status: "PLANNED",
    items: ["actions", "permissions", "projects", "audit"],
  },
];

export default function DevelopersPage() {
  return (
    <>
      <section className="section-block">
        <div className="container-site container-content">
          <p className="eyebrow">DEVELOPERS</p>
          <h1 className="headline mt-4 max-w-3xl text-4xl md:text-6xl">
            Build with an AI the user can own.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-relaxed">
            Freemy&apos;s first priority is the personal AI product.
          </p>
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg leading-relaxed">
            Developer interfaces are planned around three layers: model
            inference, portable memory and owner-controlled agents.
          </p>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {interfaces.map((layer) => (
              <article
                key={layer.name}
                className="border-border bg-card-warm flex flex-col rounded-xl border p-7"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {layer.name}
                  </h2>
                  <span className="bg-background text-muted-foreground rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.1em]">
                    {layer.status}
                  </span>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {layer.items.map((item) => (
                    <li
                      key={item}
                      className="text-muted-foreground font-mono text-sm"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaSection
        title="Interested in the developer beta?"
        body="Join the alpha list and tell us what you would build with a personal AI the user actually owns."
        interest="developer"
      />
    </>
  );
}
