/**
 * Freemy Control Surface — an original concept preview of the product
 * direction, rendered entirely in HTML/CSS. Not a product screenshot.
 */
export function ProductPreview() {
  return (
    <section id="product" className="container-site scroll-mt-24 pb-8 md:pb-12">
      <div className="relative mx-auto max-w-4xl">
        <p className="absolute -top-3 right-4 z-10 rounded-sm bg-background px-2 font-mono text-[10px] font-medium tracking-[0.2em] text-muted-foreground">
          CONCEPT PREVIEW
        </p>

        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_24px_80px_-32px_rgb(17_17_15/0.25)]">
          {/* Window chrome */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="font-mono text-xs font-semibold tracking-[0.18em]">
              FREEMY
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-[0.14em] text-muted-foreground">
              <span className="status-dot status-pulse" aria-hidden="true" />
              LOCAL
            </span>
          </div>

          <div className="grid sm:grid-cols-[160px_1fr]">
            {/* Sidebar */}
            <nav
              aria-label="Concept preview navigation"
              className="hidden border-r border-border bg-card-warm/60 p-3 sm:block"
            >
              {["Memory", "Projects", "Rules", "Activity"].map((item) => (
                <span
                  key={item}
                  className={`block rounded-md px-3 py-2 text-[13px] ${
                    item === "Memory"
                      ? "bg-signal/25 font-medium text-ink"
                      : "text-muted-foreground"
                  }`}
                >
                  {item}
                </span>
              ))}
            </nav>

            {/* Conversation */}
            <div className="space-y-5 p-5 md:p-6">
              <div>
                <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground">
                  YOU
                </p>
                <p className="mt-1.5 text-[15px] leading-relaxed">
                  Where did we leave off?
                </p>
              </div>

              <div>
                <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground">
                  FREEMY
                </p>
                <div className="mt-1.5 space-y-2 text-[15px] leading-relaxed">
                  <p>
                    Yesterday we decided to keep the first release software-only.
                  </p>
                  <p className="text-muted-foreground">
                    Reason: validate Memory × Agency × Ownership before building
                    hardware.
                  </p>
                  <p className="typing-caret">Continue?</p>
                </div>
                <div className="mt-4">
                  <span className="inline-flex items-center rounded-lg bg-ink px-4 py-2 text-sm font-medium text-bone">
                    Continue project
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="status-dot" aria-hidden="true" />
              No data left this machine
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              MODEL&nbsp;&nbsp;Qwen 27B · Local
            </span>
          </div>
        </div>

        {/* Floating permission card */}
        <div className="animate-rise-late relative mx-auto -mt-6 w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-background p-4 shadow-[0_16px_48px_-16px_rgb(17_17_15/0.3)] sm:absolute sm:-right-6 sm:top-40 sm:mt-0 sm:w-72">
          <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground">
            ACTION REQUEST
          </p>
          <p className="mt-2.5 text-sm">
            Write:{" "}
            <code className="rounded bg-card-warm px-1.5 py-0.5 font-mono text-xs">
              ~/FreedomAI/next_steps.md
            </code>
          </p>
          <div className="mt-3.5 flex flex-col gap-1.5">
            <span className="rounded-md bg-ink px-3 py-1.5 text-center text-xs font-medium text-bone">
              Allow once
            </span>
            <span className="rounded-md border border-border px-3 py-1.5 text-center text-xs font-medium">
              Always for this project
            </span>
            <span className="rounded-md border border-border px-3 py-1.5 text-center text-xs text-muted-foreground">
              Deny
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
