"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { GithubIcon } from "@/components/brand/github-icon";
import { MobileNav } from "@/components/layout/mobile-nav";
import { buttonVariants } from "@/components/ui/button";
import { mainNav } from "@/content/navigation";
import { site } from "@/content/site";
import { analyticsEvents, track } from "@/lib/analytics";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors duration-200 ${
        scrolled
          ? "border-b border-border bg-background/95"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="container-site flex h-16 items-center justify-between">
        <Link href="/" aria-label="Freemy AI home" className="rounded-sm">
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {mainNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href={site.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track(analyticsEvents.githubOpen, { location: "header" })}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            aria-label="Freemy AI on GitHub"
          >
            <GithubIcon data-icon="inline-start" />
            GitHub
          </a>
          <Link
            href="/#waitlist"
            onClick={() => track(analyticsEvents.headerJoinAlpha)}
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            Join Alpha
          </Link>
        </div>

        <MobileNav />
      </div>
    </header>
  );
}
