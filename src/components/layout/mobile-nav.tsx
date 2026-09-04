"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { mainNav } from "@/content/navigation";
import { site } from "@/content/site";
import { analyticsEvents, track } from "@/lib/analytics";
import { GithubIcon, MenuIcon } from "lucide-react";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" />}
        aria-label="Open menu"
      >
        <MenuIcon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs" aria-label="Menu">
        <DialogTitle className="sr-only">Menu</DialogTitle>
        <nav aria-label="Mobile" className="flex flex-col gap-1 pt-4">
          {mainNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-base font-medium hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={site.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              track(analyticsEvents.githubOpen, { location: "mobile_nav" });
              setOpen(false);
            }}
            className="flex items-center gap-2 rounded-md px-3 py-3 text-base font-medium hover:bg-muted"
          >
            <GithubIcon className="size-4" />
            GitHub
          </a>
          <Link
            href="/#waitlist"
            onClick={() => {
              track(analyticsEvents.headerJoinAlpha, { location: "mobile_nav" });
              setOpen(false);
            }}
            className={`${buttonVariants({ variant: "default" })} mt-2 h-11`}
          >
            Join Alpha
          </Link>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
