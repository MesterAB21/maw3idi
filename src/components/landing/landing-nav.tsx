"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#comment-ca-marche", label: "Comment ça marche" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#contact", label: "Contact" },
];

export function LandingNav() {
  const [state, setState] = React.useState<"idle" | "blurred" | "hidden">("idle");
  const [open, setOpen] = React.useState(false);

  // §3 — hide on scroll down, show on scroll up + blur
  React.useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setState((prev) => {
        let next: "idle" | "blurred" | "hidden" = y > 40 ? "blurred" : "idle";
        if (y > lastY && y > 100) next = "hidden";
        lastY = y;
        return next;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-[118px] border-b landing-nav bg-canvas",
        state !== "idle"
          ? "nav--blurred border-hairline/60 bg-canvas/80 shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
          : "border-hairline",
        state === "hidden" && !open && "nav--hidden"
      )}
    >
      <div className="relative mx-auto flex h-[118px] max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo imageClassName="h-[110px]" />

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-body-sm font-medium text-body transition-colors duration-150 hover:text-brand-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login">
            <Button variant="ghost" size="md">
              Connexion
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full text-ink transition-colors duration-150 hover:bg-surface-card lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Ouvrir le menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-hairline bg-canvas px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-title-sm text-body hover:bg-surface-soft hover:text-ink"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-hairline pt-3">
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="secondary" className="w-full">
                  Connexion
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}