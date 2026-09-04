import type { Metadata } from "next";
import { site } from "@/content/site";

export function createMetadata(overrides: {
  title?: string;
  description?: string;
  path?: string;
} = {}): Metadata {
  const title = overrides.title ?? `${site.name} — The AI You Own`;
  const description = overrides.description ?? site.description;
  const path = overrides.path ?? "/";

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: site.name,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
