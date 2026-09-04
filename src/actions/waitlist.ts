"use server";

import { getDb, isDatabaseConfigured } from "@/lib/db";
import { waitlistSchema } from "@/schemas/waitlist";

export type WaitlistResult =
  | { status: "success" }
  | { status: "duplicate" }
  | { status: "invalid"; message: string }
  | { status: "unavailable" }
  | { status: "error" };

export async function joinWaitlist(input: unknown): Promise<WaitlistResult> {
  const parsed = waitlistSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "invalid",
      message:
        parsed.error.issues[0]?.message ?? "Please enter a valid email address.",
    };
  }

  const data = parsed.data;

  // Honeypot: pretend success so bots learn nothing.
  if (data.website) {
    return { status: "success" };
  }

  if (!isDatabaseConfigured()) {
    console.warn("DATABASE_URL is missing. Waitlist storage disabled.");
    return { status: "unavailable" };
  }

  const sql = getDb();
  if (!sql) {
    return { status: "unavailable" };
  }

  try {
    // Application-level duplicate check keeps behaviour explicit and
    // friendly: re-signing up is not an error.
    const existing = await sql`
      SELECT id FROM waitlist_signups WHERE LOWER(email) = ${data.email} LIMIT 1
    `;
    if (existing.length > 0) {
      return { status: "duplicate" };
    }

    await sql`
      INSERT INTO waitlist_signups
        (email, interest, utm_source, utm_medium, utm_campaign, utm_content)
      VALUES (
        ${data.email},
        ${data.interest},
        ${data.utm_source ?? null},
        ${data.utm_medium ?? null},
        ${data.utm_campaign ?? null},
        ${data.utm_content ?? null}
      )
    `;

    return { status: "success" };
  } catch (error) {
    // Race-safe: unique index on LOWER(email) may still trigger.
    if (error instanceof Error && error.message.includes("waitlist_signups_email_unique")) {
      return { status: "duplicate" };
    }
    console.error("Waitlist signup failed:", error);
    return { status: "error" };
  }
}
