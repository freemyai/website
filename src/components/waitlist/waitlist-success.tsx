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
          className="bg-signal text-ink flex size-9 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <CheckIcon className="size-5" strokeWidth={2.5} />
        </span>
        <p className="text-xl font-semibold tracking-tight">
          {duplicate ? "You're already on the list." : "You're early."}
        </p>
      </div>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
        You&apos;re on the Freemy alpha list. We&apos;ll only email when there
        is something worth trying.
      </p>
      <div className="border-border mt-5 border-t pt-4">
        <p className="text-muted-foreground text-sm">
          Want to help shape Freemy?
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="border-border text-muted-foreground rounded-md border px-3 py-1.5 font-mono text-xs">
            I&apos;m a builder
          </span>
          <span className="border-border text-muted-foreground rounded-md border px-3 py-1.5 font-mono text-xs">
            I&apos;m a local AI user
          </span>
        </div>
      </div>
    </div>
  );
}
