const shifts = [
  ["Provider owns account", "Owner owns identity"],
  ["Provider owns history", "Owner owns memory"],
  ["Provider chooses models", "Owner chooses models"],
  ["App grants permissions", "Owner defines permissions"],
];

export function ProblemSection() {
  return (
    <section className="section-block">
      <div className="container-site container-content grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="eyebrow">THE PROBLEM</p>
          <h2 className="headline mt-4 text-4xl md:text-5xl">
            Your AI shouldn&apos;t start over every day.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Today, your conversations live inside providers, your context
            disappears between tools, your model can change underneath you, and
            your agent permissions are scattered across apps.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Freemy starts from a different assumption:
          </p>
          <p className="mt-4 text-lg font-medium leading-relaxed">
            The relationship between you and your AI should belong to you.
          </p>
        </div>

        <div className="self-center rounded-xl border border-border bg-card-warm p-6 md:p-8">
          <ul className="space-y-5">
            {shifts.map(([from, to]) => (
              <li key={from} className="grid gap-1 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3">
                <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                  {from}
                </span>
                <span aria-hidden="true" className="hidden font-mono text-xs text-muted-foreground sm:block">
                  →
                </span>
                <span className="text-sm font-medium">
                  <span className="mr-2 inline-block size-1.5 rounded-[2px] bg-signal align-middle" aria-hidden="true" />
                  {to}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
