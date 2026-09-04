const modelFreedoms = [
  "Discuss",
  "Reason",
  "Write",
  "Research",
  "Create",
  "Choose system behavior",
];

const actionPermissions: { action: string; state: string; tone: "allow" | "ask" | "deny" }[] = [
  { action: "Read files", state: "✓ project", tone: "allow" },
  { action: "Write files", state: "✓ project", tone: "allow" },
  { action: "Run shell", state: "Ask", tone: "ask" },
  { action: "Send data", state: "Ask", tone: "ask" },
  { action: "Delete files", state: "Ask", tone: "ask" },
  { action: "Credentials", state: "Deny", tone: "deny" },
];

const toneClasses = {
  allow: "bg-signal/25 text-ink",
  ask: "bg-card-warm text-muted-foreground",
  deny: "bg-ink text-bone",
} as const;

export function OwnerControlSection() {
  return (
    <section className="section-block border-t border-border">
      <div className="container-site container-content">
        <h2 className="headline max-w-3xl text-4xl md:text-5xl">
          Freedom is ownership, not chaos.
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          A capable AI should be able to discuss broadly. A capable agent should
          still need the authority you give it.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card-warm p-7">
            <p className="eyebrow">MODEL</p>
            <ul className="mt-5 space-y-2.5">
              {modelFreedoms.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[15px]">
                  <span className="status-dot" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-border pt-4 font-mono text-xs tracking-[0.12em] text-muted-foreground">
              OWNER-SELECTED MODEL
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card-warm p-7">
            <p className="eyebrow">ACTIONS</p>
            <ul className="mt-5 space-y-2.5">
              {actionPermissions.map((item) => (
                <li
                  key={item.action}
                  className="flex items-center justify-between gap-3 text-[15px]"
                >
                  <span>{item.action}</span>
                  <span
                    className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium ${toneClasses[item.tone]}`}
                  >
                    {item.state}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-border pt-4 font-mono text-xs tracking-[0.12em] text-muted-foreground">
              OWNER PERMISSION LAYER
            </p>
          </div>
        </div>

        <p className="mt-10 max-w-2xl text-lg font-medium leading-relaxed">
          Freemy separates model behavior from machine permissions.
        </p>
      </div>
    </section>
  );
}
