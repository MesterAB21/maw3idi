"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import SplitType from "split-type";

gsap.registerPlugin(ScrollTrigger);

export function LandingMotion({ children }: { children: React.ReactNode }) {
  const scopeRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let lenis: Lenis | null = null;
    const cleanups: (() => void)[] = [];

    // --- Lenis smooth scroll synced to GSAP ticker (guide: base setup) ---
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      cleanups.push(() => {
        gsap.ticker.lagSmoothing(1);
        gsap.ticker.remove(tick);
        lenis?.destroy();
        lenis = null;
      });
    }

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // §1 — line-mask text reveal on scroll (idempotent: never re-split)
        scope
          .querySelectorAll<HTMLElement>("[data-reveal-text]")
          .forEach((el) => {
            if (el.dataset.revealReady === "1") return;
            el.dataset.revealReady = "1";
            const split = new SplitType(el, { types: "lines" });
            split.lines?.forEach((line) => {
              line.style.overflow = "hidden";
              const inner = document.createElement("div");
              inner.innerHTML = line.innerHTML;
              line.innerHTML = "";
              line.appendChild(inner);
            });
            const inners = split.lines?.map((l) => l.firstChild as Element) ?? [];
            gsap.from(inners, {
              yPercent: 110,
              duration: 0.7,
              stagger: 0.06,
              ease: "power4.out",
              scrollTrigger: {
                trigger: el,
                start: "top 90%",
                once: true,
                toggleActions: "play none none none",
              },
            });
          });

        // §9 — staggered grid reveal (self-cleaning: always ends fully visible)
        scope.querySelectorAll<HTMLElement>("[data-grid]").forEach((grid) => {
          gsap.from(grid.children, {
            y: 40,
            opacity: 0,
            duration: 0.5,
            stagger: 0.08,
            ease: "power2.out",
            scrollTrigger: {
              trigger: grid,
              start: "top 90%",
              once: true,
              toggleActions: "play none none none",
            },
            onComplete: () => gsap.set(grid.children, { clearProps: "all" }),
          });
        });

        // §5 — parallax layers
        scope.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
          const speed = Number(el.dataset.parallax) || 0.3;
          gsap.to(el, {
            yPercent: -100 * speed,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        });

        // §6 — magnetic buttons (cursor attraction)
        scope.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((btn) => {
          const onMove = (e: MouseEvent) => {
            const r = btn.getBoundingClientRect();
            const x = e.clientX - r.left - r.width / 2;
            const y = e.clientY - r.top - r.height / 2;
            gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3 });
          };
          const onLeave = () =>
            gsap.to(btn, {
              x: 0,
              y: 0,
              duration: 0.5,
              ease: "elastic.out(1, 0.3)",
            });
          btn.addEventListener("mousemove", onMove);
          btn.addEventListener("mouseleave", onLeave);
          cleanups.push(() => {
            btn.removeEventListener("mousemove", onMove);
            btn.removeEventListener("mouseleave", onLeave);
            gsap.killTweensOf(btn);
          });
        });
      });
    }, scope);

    // Anchor links -> Lenis smooth scroll
    if (lenis) {
      const onClick = (e: MouseEvent) => {
        const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(
          'a[href^="#"]'
        );
        if (!anchor) return;
        const hash = anchor.getAttribute("href") ?? "";
        if (hash.length < 2) return;
        const target = scope.querySelector<HTMLElement>(hash);
        if (!target) return;
        e.preventDefault();
        lenis?.scrollTo(target, { offset: -128, duration: 1.2 });
      };
      scope.addEventListener("click", onClick);
      cleanups.push(() => scope.removeEventListener("click", onClick));
    }

    // Refresh trigger positions once everything settled (load, fonts, resize)
    const refresh = () => ScrollTrigger.refresh();
    const refreshWhenReady = () => {
      refresh();
      if (document.fonts?.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }
    };
    window.addEventListener("load", refreshWhenReady);
    let resizeT: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(refresh, 200);
    };
    window.addEventListener("resize", onResize);
    const t = window.setTimeout(refresh, 700);
    cleanups.push(() => {
      window.removeEventListener("load", refreshWhenReady);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeT);
      window.clearTimeout(t);
    });

    return () => {
      ctx.revert();
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return <div ref={scopeRef}>{children}</div>;
}