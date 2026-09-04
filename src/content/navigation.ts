export type NavItem = {
  label: string;
  href: string;
  external?: boolean;
};

export const mainNav: NavItem[] = [
  { label: "Product", href: "/#product" },
  { label: "Principles", href: "/#principles" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Developers", href: "/developers" },
];

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Product",
    items: [
      { label: "Principles", href: "/#principles" },
      { label: "Roadmap", href: "/roadmap" },
      { label: "Developers", href: "/developers" },
    ],
  },
  {
    title: "Build",
    items: [{ label: "GitHub", href: "https://github.com/freemyai", external: true }],
  },
  {
    title: "Legal",
    items: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];
