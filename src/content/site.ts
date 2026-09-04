export const site = {
  name: "Freemy AI",
  shortName: "Freemy",
  tagline: "The AI you own.",
  description:
    "Freemy is a local-first personal AI built around persistent memory, open model choice and owner-controlled agent permissions.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://freemy.ai",
  githubUrl:
    process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/freemyai",
  productStage: process.env.NEXT_PUBLIC_PRODUCT_STAGE ?? "prealpha",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
} as const;

export const stageBadge = "PRE-ALPHA · BUILDING IN PUBLIC";
