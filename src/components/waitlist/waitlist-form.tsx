"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { joinWaitlist, type WaitlistResult } from "@/actions/waitlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyticsEvents, track } from "@/lib/analytics";
import { WaitlistSuccess } from "./waitlist-success";

type WaitlistFormProps = {
  interest?: "alpha" | "developer";
  dark?: boolean;
};

export function WaitlistForm({ interest = "alpha", dark = false }: WaitlistFormProps) {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<WaitlistResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (result?.status === "success" || result?.status === "duplicate") {
    return <WaitlistSuccess duplicate={result.status === "duplicate"} dark={dark} />;
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    track(
      interest === "developer"
        ? analyticsEvents.developerInterest
        : analyticsEvents.waitlistSubmit,
    );

    startTransition(async () => {
      const res = await joinWaitlist({
        email: formData.get("email"),
        interest,
        website: formData.get("website"),
        utm_source: searchParams.get("utm_source") ?? undefined,
        utm_medium: searchParams.get("utm_medium") ?? undefined,
        utm_campaign: searchParams.get("utm_campaign") ?? undefined,
        utm_content: searchParams.get("utm_content") ?? undefined,
      });
      setResult(res);
      if (res.status === "success" || res.status === "duplicate") {
        track(analyticsEvents.waitlistSuccess);
      }
    });
  }

  const inputId = dark ? "waitlist-email-dark" : "waitlist-email";

  return (
    <form onSubmit={onSubmit} className="w-full" noValidate={false}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor={inputId} className="sr-only">
            Email address
          </label>
          <Input
            id={inputId}
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            aria-invalid={result?.status === "invalid" || undefined}
            aria-describedby={result ? `${inputId}-status` : undefined}
            className="h-12 rounded-lg px-4 text-base"
          />
        </div>
        {/* Honeypot: hidden from humans, tempting for bots */}
        <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
          <label htmlFor={`${inputId}-website`}>Website</label>
          <input
            id={`${inputId}-website`}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="h-12 rounded-lg bg-signal px-6 text-base font-semibold text-ink hover:bg-signal-bright"
        >
          {pending ? "Joining…" : "Join the Alpha"}
        </Button>
      </div>

      <div id={`${inputId}-status`} aria-live="polite" className="mt-3 min-h-5 text-sm">
        {result?.status === "invalid" && (
          <p className={dark ? "text-signal-bright" : "text-destructive"} role="alert">
            {result.message}
          </p>
        )}
        {result?.status === "unavailable" && (
          <p className={dark ? "text-signal-bright" : "text-destructive"} role="alert">
            Alpha signup is temporarily unavailable.
          </p>
        )}
        {result?.status === "error" && (
          <p className={dark ? "text-signal-bright" : "text-destructive"} role="alert">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </form>
  );
}
