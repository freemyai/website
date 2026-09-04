const pillars = [
  {
    title: "Memory that outlives the model.",
    body: "Your decisions, preferences, projects and learned workflows should survive model upgrades, app changes and hardware moves.",
    footer: "MODEL ≠ MEMORY",
  },
  {
    title: "An AI that can actually act.",
    body: "Read project files, write code, run tools and continue real work instead of stopping at another answer box.",
    footer: "CHAT → ACTION",
  },
  {
    title: "Use the models you choose.",
    body: "Local open models, specialized models and eventually optional cloud intelligence — without tying your AI identity to one provider.",
    footer: "BRING YOUR OWN MODEL",
  },
  {
    title: "You control the authority.",
    body: "Reading a folder, running a command and sending data outside your machine are different capabilities. Freemy is designed to make those boundaries explicit.",
    footer: "OWNER-CONTROLLED",
  },
];

export function PillarsSection() {
  return (
    <section className="section-block border-t border-border">
      <div className="container-site container-content">
        <p className="eyebrow">WHAT FREEMY IS BUILT AROUND</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="flex flex-col rounded-xl border border-border bg-card-warm p-7"
            >
              <h3 className="text-xl font-semibold tracking-tight text-balance">
                {pillar.title}
              </h3>
              <p className="mt-3 flex-1 leading-relaxed text-muted-foreground">
                {pillar.body}
              </p>
              <p className="mt-6 border-t border-border pt-4 font-mono text-xs font-medium tracking-[0.14em] text-muted-foreground">
                {pillar.footer}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
