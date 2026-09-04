"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { analyticsEvents, track, type AnalyticsEventName } from "@/lib/analytics";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  event: AnalyticsEventName;
  eventProps?: Record<string, string | number | boolean>;
};

/** Internal link that fires a registered analytics event on click. */
export function TrackedLink({ event, eventProps, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}

type TrackedAnchorProps = ComponentProps<"a"> & {
  event: AnalyticsEventName;
  eventProps?: Record<string, string | number | boolean>;
};

/** External link that fires a registered analytics event on click. */
export function TrackedAnchor({ event, eventProps, onClick, ...props }: TrackedAnchorProps) {
  return (
    <a
      {...props}
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}

export { analyticsEvents };
