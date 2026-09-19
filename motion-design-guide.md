# Modern Website Motion Guide (Cuberto-style)
A reference doc you can paste into OpenCode so it knows exactly which animation patterns to build and how.

---

## Stack to use
Cuberto-style sites are built on this combo (industry standard for this look):

- **GSAP** + **ScrollTrigger** → all scroll-based animation, timelines, staggers
- **Lenis** (or Locomotive Scroll) → smooth/inertia scrolling, required for the "buttery" feel
- **SplitType** or **GSAP SplitText** → breaking text into chars/words/lines for reveal animations
- **Three.js** (optional) → 3D backgrounds, distortion, particles
- Plain **CSS transforms + clip-path** for lightweight reveals when GSAP is overkill

Install:
```bash
npm install gsap lenis split-type
```

Base setup (put this in your main JS entry):
```js
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

// smooth scroll, synced to GSAP ticker
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

---

## 1. Text reveal on scroll (line/word mask)
The classic "text slides up from behind a mask as you scroll into it."

```js
import SplitType from "split-type";

document.querySelectorAll("[data-reveal-text]").forEach((el) => {
  const split = new SplitType(el, { types: "lines" });
  split.lines.forEach((line) => {
    line.style.overflow = "hidden";
    const inner = document.createElement("div");
    inner.innerHTML = line.innerHTML;
    line.innerHTML = "";
    line.appendChild(inner);
  });

  gsap.from(split.lines.map((l) => l.firstChild), {
    yPercent: 110,
    duration: 1,
    stagger: 0.08,
    ease: "power4.out",
    scrollTrigger: { trigger: el, start: "top 85%" },
  });
});
```
HTML: `<h1 data-reveal-text>Your headline here</h1>`

## 2. Character-by-character fade/typewriter
```js
const split = new SplitType("[data-reveal-chars]", { types: "chars" });
gsap.from(split.chars, {
  opacity: 0,
  y: 20,
  stagger: 0.02,
  duration: 0.6,
  scrollTrigger: { trigger: "[data-reveal-chars]", start: "top 90%" },
});
```

## 3. Navbar behavior (hide on scroll down, show on scroll up + blur)
```js
let lastY = 0;
const nav = document.querySelector("nav");

lenis.on("scroll", ({ scroll }) => {
  nav.classList.toggle("nav--blurred", scroll > 40);
  if (scroll > lastY && scroll > 100) {
    nav.classList.add("nav--hidden");
  } else {
    nav.classList.remove("nav--hidden");
  }
  lastY = scroll;
});
```
```css
nav { transition: transform .4s ease, background .3s ease; }
.nav--hidden { transform: translateY(-100%); }
.nav--blurred { backdrop-filter: blur(10px); background: rgba(0,0,0,.4); }
```

## 4. Image reveal (clip-path wipe + scale-down)
The "image unveils itself" effect on scroll.
```js
gsap.from("[data-reveal-image] img", {
  scale: 1.3,
  clipPath: "inset(15% 15% 15% 15%)",
  duration: 1.4,
  ease: "power3.out",
  scrollTrigger: { trigger: "[data-reveal-image]", start: "top 80%" },
});
```

## 5. Parallax layers
```js
gsap.utils.toArray("[data-parallax]").forEach((el) => {
  const speed = el.dataset.parallax || 0.3;
  gsap.to(el, {
    yPercent: -100 * speed,
    ease: "none",
    scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
  });
});
```

## 6. Magnetic buttons (cursor attraction)
```js
document.querySelectorAll("[data-magnetic]").forEach((btn) => {
  btn.addEventListener("mousemove", (e) => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3 });
  });
  btn.addEventListener("mouseleave", () => {
    gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,0.3)" });
  });
});
```

## 7. Custom cursor (follower with blend mode)
```js
const cursor = document.querySelector(".cursor");
window.addEventListener("mousemove", (e) => {
  gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.15, ease: "power2.out" });
});
```
```css
.cursor {
  position: fixed; top: 0; left: 0; width: 20px; height: 20px;
  border-radius: 50%; background: white; mix-blend-mode: difference;
  pointer-events: none; z-index: 999; transform: translate(-50%, -50%);
}
```

## 8. Page transition overlay (route change wipe)
```js
function pageTransition(nextUrl) {
  const overlay = document.querySelector(".page-transition");
  gsap.to(overlay, {
    scaleY: 1, duration: 0.6, ease: "power4.inOut",
    transformOrigin: "bottom", onComplete: () => (window.location.href = nextUrl),
  });
}
```
```css
.page-transition {
  position: fixed; inset: 0; background: black; transform: scaleY(0);
  transform-origin: top; z-index: 9999;
}
```

## 9. Stagger grid reveal (cards)
```js
gsap.from("[data-grid] > *", {
  y: 60, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out",
  scrollTrigger: { trigger: "[data-grid]", start: "top 80%" },
});
```

## 10. Hover tilt / mouse-follow distortion on images
```js
el.addEventListener("mousemove", (e) => {
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  gsap.to(el.querySelector("img"), {
    rotateX: py * -10, rotateY: px * 10, duration: 0.4, transformPerspective: 500,
  });
});
```

## 11. Horizontal scroll section
```js
const track = document.querySelector("[data-horizontal-track]");
gsap.to(track, {
  x: () => -(track.scrollWidth - window.innerWidth),
  ease: "none",
  scrollTrigger: {
    trigger: track.parentElement,
    start: "top top", end: () => `+=${track.scrollWidth}`,
    scrub: true, pin: true,
  },
});
```

## 12. Number/stat counters
```js
gsap.utils.toArray("[data-counter]").forEach((el) => {
  const target = +el.dataset.counter;
  gsap.fromTo(el, { textContent: 0 }, {
    textContent: target, duration: 2, ease: "power1.out", snap: { textContent: 1 },
    scrollTrigger: { trigger: el, start: "top 90%" },
  });
});
```

## 13. SVG line-draw animation
```js
document.querySelectorAll("path[data-draw]").forEach((path) => {
  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  gsap.to(path, {
    strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut",
    scrollTrigger: { trigger: path, start: "top 85%" },
  });
});
```

## 14. Hero entrance sequence (on page load)
Combine several of the above into one timeline for the first screen:
```js
const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
tl.from(".hero-nav", { y: -40, opacity: 0, duration: 0.6 })
  .from("[data-reveal-text] .line-inner", { yPercent: 110, stagger: 0.08, duration: 1 }, "-=0.3")
  .from(".hero-cta", { y: 20, opacity: 0, duration: 0.6 }, "-=0.5")
  .from(".hero-image", { scale: 1.2, opacity: 0, duration: 1 }, "-=0.6");
```

---

## How to brief OpenCode
When prompting your coding agent, be explicit per-section, e.g.:

> "Add data-reveal-text to the H1 in the hero section and wire up the SplitType + GSAP line-mask reveal from motion-design-guide.md section 1. Add data-magnetic to the primary CTA button and apply section 6. Add the navbar hide/blur behavior from section 3."

This lets it apply patterns file-by-file instead of guessing at "make it look like Cuberto."

## Performance notes
- `will-change: transform` on animated elements, remove after animation ends
- Prefer `transform`/`opacity` only — avoid animating `top/left/width`
- Debounce ScrollTrigger.refresh() on resize
- Lazy-init Three.js/WebGL only after hero is in view if not immediately visible
