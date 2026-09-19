"use client";

import * as React from "react";
import Link from "next/link";
import { Play, Users } from "lucide-react";
import gsap from "gsap";
import SplitType from "split-type";

import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";
import { CalendarWidget } from "@/components/app/calendar-widget";

export function Hero() {
  const sectionRef = React.useRef<HTMLElement>(null);

  // §14 — hero entrance sequence (on page load). Resilient: content always
  // ends fully visible (clearProps on complete + safety timeout), so
  // back/forward navigation can never leave the hero stuck at opacity 0.
  React.useEffect(() => {
    const scope = sectionRef.current;
    if (!scope) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets =
      "[data-hero-logo], [data-hero-caption], [data-hero-sub], [data-hero-badge], [data-hero-cta], [data-hero-note], [data-hero-widget]";
    const forceVisible = () => {
      gsap.set(scope.querySelectorAll(targets), { clearProps: "all" });
      const title = scope.querySelector("[data-hero-title]");
      if (title) gsap.set(title, { clearProps: "all" });
    };
    const safety = window.setTimeout(forceVisible, 4000);

    let tl: gsap.core.Timeline | null = null;
    const ctx = gsap.context(() => {
      try {
        const titleEl = scope.querySelector<HTMLElement>("[data-hero-title]");
        let lines: Element[] = [];
        if (titleEl) {
          if (!titleEl.querySelector(":scope div[data-split-line]")) {
            const split = new SplitType(titleEl, { types: "lines" });
            split.lines?.forEach((line) => {
              line.style.overflow = "hidden";
              const inner = document.createElement("div");
              inner.setAttribute("data-split-line", "1");
              inner.innerHTML = line.innerHTML;
              line.innerHTML = "";
              line.appendChild(inner);
            });
          }
          lines =
            Array.from(
              titleEl.querySelectorAll(":scope div[data-split-line]")
            ).filter(Boolean) ?? [];
          // Fallback: if line-splitting produced nothing, animate the title as-is.
          if (lines.length === 0) lines = [titleEl];
        }

        tl = gsap.timeline({
          defaults: { ease: "power4.out" },
          onComplete: forceVisible,
        });
        tl.from("[data-hero-logo]", { y: -24, opacity: 0, duration: 0.7 })
          .from("[data-hero-caption]", { y: 14, opacity: 0, duration: 0.5 }, "-=0.35")
          .from(lines, { yPercent: 110, stagger: 0.08, duration: 1 }, "-=0.3")
          .from("[data-hero-sub]", { y: 20, opacity: 0, duration: 0.6 }, "-=0.5")
          .from("[data-hero-badge]", { y: 16, opacity: 0, duration: 0.5 }, "-=0.45")
          .from(
            "[data-hero-cta]",
            { y: 20, opacity: 0, stagger: 0.08, duration: 0.6 },
            "-=0.5"
          )
          .from("[data-hero-note]", { opacity: 0, duration: 0.5 }, "-=0.35")
          .from(
            "[data-hero-widget]",
            { scale: 1.12, opacity: 0, duration: 1 },
            "-=0.8"
          );
      } catch {
        forceVisible();
      }
    }, scope);

    return () => {
      window.clearTimeout(safety);
      tl?.kill();
      ctx.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-brand-hero">
      {/* Animated light orbs drifting over the blue background */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-48 -top-56 size-[640px] rounded-full bg-brand-sky/15 blur-3xl animate-float-1"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-10 size-[600px] rounded-full bg-brand-primary-active/30 blur-3xl animate-float-2"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-56 left-1/3 size-[520px] rounded-full bg-brand-sky/10 blur-3xl animate-float-3"
      />
      {/* Soft top glow + grain overlay for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/10 to-transparent"
      />

      <div className="relative mx-auto grid max-w-[1280px] items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          {/* Identity banner — big logo, gently floating */}
          <div data-hero-logo className="flex flex-col items-start gap-4">
            <div className="animate-float-slow drop-shadow-xl">
              <LogoMark imageClassName="h-28 lg:h-32" />
            </div>
            <p data-hero-caption className="text-caption uppercase text-on-dark/80">
              L'assistant qui gère vos rendez-vous
            </p>
          </div>

          <h1
            data-hero-title
            className="mt-9 font-display text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-white sm:mt-10 sm:text-5xl lg:text-display-xl"
          >
            Chaque rendez-vous pris.
            <br />
            <span className="text-brand-sky">Chaque appel géré.</span>
          </h1>

          <p data-hero-sub className="mt-6 max-w-lg text-body-md text-white/75">
            MAW3IDI répond aux patients, confirme et planifie les rendez-vous
            24/7 — en français et en darija. Votre secrétaire garde la main sur
            tout ce qui compte.
          </p>

          <p
            data-hero-badge
            className="mt-5 inline-flex max-w-lg items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-body-sm text-white backdrop-blur-md"
          >
            <Users className="size-4 text-brand-sky" />
            Un assistant pour votre équipe, pas un remplacement
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/commencer">
              <Button
                data-hero-cta
                data-magnetic
                variant="secondary"
                size="lg"
                className="w-full border-transparent bg-white text-brand-deep hover:bg-blue-50 sm:w-auto"
              >
                Ajouter votre cabinet
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                data-hero-cta
                data-magnetic
                variant="secondary"
                size="lg"
                className="w-full border-white/25 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
              >
                <Play className="size-4" />
                Essai gratuit
              </Button>
            </Link>
          </div>

          <p data-hero-note className="mt-7 text-caption uppercase text-on-dark/70">
            Sans carte bancaire · Installation en 5 minutes · Cabinets à Alger,
            Oran et Constantine
          </p>
        </div>

        {/* Illustrated mock widget (non-interactive) — classic rounded booking card */}
        <div
          data-hero-widget
          className="relative mx-auto w-full max-w-[560px]"
        >
          <div className="animate-float-slow">
            <div
              aria-hidden
              className="absolute -inset-3 -z-10 rounded-[28px] bg-white/10 blur-2xl"
            />
            <div className="rotate-1 rounded-3xl shadow-modal transition-transform duration-300 hover:rotate-0">
              <div className="rounded-t-3xl bg-brand-gradient px-6 py-5">
                <p className="text-body-sm font-semibold text-white">
                  Comment un patient réserve
                </p>
              </div>
              <CalendarWidget
                interactive={false}
                compact
                className="rounded-t-none rounded-b-3xl border-t-0"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}