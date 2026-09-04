type ContinuityBlock = {
  label: string;
  lines: string[];
  mono?: boolean;
  unchanged?: boolean;
  action?: string;
};

const days: { day: string; blocks: ContinuityBlock[] }[] = [
  {
    day: "Day 1",
    blocks: [
      {
        label: "YOU",
        lines: ["Private project files must stay local."],
      },
      {
        label: "FREEMY MEMORY",
        lines: ["Rule saved", "Scope: Freedom AI", "Privacy: Local only"],
        mono: true,
      },
    ],
  },
  {
    day: "Day 12",
    blocks: [
      {
        label: "YOU",
        lines: ["Use the strongest model to summarize private-notes.md."],
      },
      {
        label: "FREEMY",
        lines: [
          "That conflicts with your project rule: private files must stay local.",
          "I can use the local model instead.",
        ],
        action: "Use local model",
      },
    ],
  },
  {
    day: "Day 30",
    blocks: [
      { label: "MODEL", lines: ["Qwen → newer model"] },
      { label: "MEMORY", lines: ["Unchanged"], unchanged: true },
      { label: "PROJECT", lines: ["Unchanged"], unchanged: true },
      { label: "OWNER RULES", lines: ["Unchanged"], unchanged: true },
    ],
  },
];

export function ContinuitySection() {
  return (
    <section className="theme-dark section-block">
      <div className="container-site container-content">
        <p className="eyebrow">CONTINUITY</p>
        <h2 className="headline mt-4 text-4xl md:text-5xl">
          Close the model.
          <br />
          Keep the relationship.
        </h2>
        <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
          Models will come and go. Your AI memory shouldn&apos;t.
        </p>

        <ol className="mt-14 grid gap-4 lg:grid-cols-3">
          {days.map((entry) => (
            <li
              key={entry.day}
              className="border-border bg-card rounded-xl border p-6"
            >
              <p className="text-signal-bright font-mono text-xs font-medium tracking-[0.16em]">
                {entry.day.toUpperCase()}
              </p>
              <div className="mt-5 space-y-5">
                {entry.blocks.map((block) => (
                  <div key={block.label}>
                    <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.18em]">
                      {block.label}
                    </p>
                    <div className="mt-1.5 space-y-1">
                      {block.lines.map((line) => (
                        <p
                          key={line}
                          className={
                            block.mono
                              ? "text-muted-foreground font-mono text-xs leading-relaxed"
                              : block.unchanged
                                ? "text-signal-bright text-sm"
                                : "text-sm leading-relaxed"
                          }
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                    {block.action ? (
                      <p className="mt-3">
                        <span className="bg-signal text-ink inline-flex rounded-md px-3 py-1.5 text-xs font-semibold">
                          {block.action}
                        </span>
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <p className="headline mt-16 max-w-2xl text-2xl md:text-3xl">
          Models are temporary.{" "}
          <span className="text-signal-bright">
            Your AI memory should be yours for life.
          </span>
        </p>
      </div>
    </section>
  );
}
