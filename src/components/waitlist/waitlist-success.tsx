import { CheckIcon } from "lucide-react";

export function WaitlistSuccess({
  duplicate = false,
  dark = false,
}: {
  duplicate?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${
        dark ? "border-signal/30 bg-signal/5" : "border-ink/15 bg-card-warm"
      }`}
      role="status"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-full bg-signal text-ink"
          aria-hidden="true"
        >
          <CheckIcon className="size-5" strokeWidth={2.5} />
        </span>
        <p className="text-xl font-semibold tracking-tight">
          {duplicate ? "You're already on the list." : "You're early."}
        </p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        You&apos;re on the Freemy alpha list. We&apos;ll only email when there is
        something worth trying.
      </p>
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">Want to help shape Freemy?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground">
            I&apos;m a builder
          </span>
          <span className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground">
            I&apos;m a local AI user
          </span>
        </div>
      </div>
    </div>
  );
}
