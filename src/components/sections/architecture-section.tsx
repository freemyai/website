import type { ReactNode } from "react";

function Node({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: "default" | "core" | "local" | "cloud";
  className?: string;
}) {
  const tones = {
    default: "border-border bg-background",
    core: "border-ink bg-ink text-bone",
    local: "border-signal bg-signal/15",
    cloud: "border-dashed border-muted-foreground/50 bg-background text-muted-foreground",
  } as const;
  return (
    <div
      className={`rounded-lg border px-4 py-2.5 text-center font-mono text-xs font-medium tracking-[0.08em] ${tones[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

function Line({ dashed = false }: { dashed?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`mx-auto h-6 w-px ${dashed ? "border-l border-dashed border-muted-foreground/50" : "bg-ink/40"}`}
    />
  );
}

/**
 * Local-first architecture, drawn with pure HTML/CSS.
 * Described as design intent ("being built around") — not shipped features.
 */
export function ArchitectureSection() {
  return (
    <section className="section-block border-t border-border">
      <div className="container-site container-content grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div className="self-center">
          <p className="eyebrow">LOCAL-FIRST ARCHITECTURE</p>
          <h2 className="headline mt-4 text-4xl md:text-5xl">
            Your AI should have a home.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Freemy&apos;s architecture is being built around a simple idea: your
            memory, rules and agent live with you — and models plug in
            underneath.
          </p>
          <p className="mt-4 text-lg font-medium leading-relaxed">
            Private data can stay local. Cloud intelligence can remain optional
            rather than mandatory.
          </p>
        </div>

        <div
          role="img"
          aria-label="Architecture diagram: you connect to Freemy Core, which connects to memory vault, agent tools and owner rules, then a model router that reaches local models on your hardware, with optional cloud as a dashed alternative."
          className="self-center"
        >
          <div className="flex flex-col">
            <Node className="self-center">YOU</Node>
            <Line />
            <Node tone="core" className="self-center">
              FREEMY CORE
            </Node>
            <Line />
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <Node>MEMORY VAULT</Node>
              <Node>AGENT TOOLS</Node>
              <Node>OWNER RULES</Node>
            </div>
            <Line />
            <Node className="self-center">MODEL ROUTER</Node>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <div className="flex flex-col">
                <Line />
                <Node tone="local">LOCAL MODEL</Node>
                <Line />
                <Node tone="local">YOUR HARDWARE</Node>
              </div>
              <div className="flex flex-col">
                <Line dashed />
                <Node tone="cloud">OPTIONAL CLOUD</Node>
                <div className="mx-auto h-6" aria-hidden="true" />
                <p className="text-center font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
                  NEVER REQUIRED
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
