import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { footerNav } from "@/content/navigation";
import { site } from "@/content/site";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="container-site py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-4 text-sm text-muted-foreground">{site.tagline}</p>
            {site.contactEmail ? (
              <p className="mt-3 text-sm">
                <a
                  href={`mailto:${site.contactEmail}`}
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {site.contactEmail}
                </a>
              </p>
            ) : null}
          </div>

          {footerNav.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="eyebrow">{group.title}</p>
              <ul className="mt-4 space-y-2.5">
                {group.items.map((item) => (
                  <li key={item.label}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Freemy AI</p>
          <p className="inline-flex items-center gap-2">
            <span className="status-dot" aria-hidden="true" />
            Built in public.
          </p>
        </div>
      </div>
    </footer>
  );
}
