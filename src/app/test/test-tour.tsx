"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/app/status-badge";
import { LogoMark } from "@/components/brand/logo";
import type { AppointmentStatus } from "@/lib/types";

const TOUR_STORAGE_KEY = "maw3idi:test:tour";

type StepId =
  | "welcome"
  | "calendar"
  | "appointments-table"
  | "appointments-cycle"
  | "patients"
  | "agent-channels"
  | "agent-discussion"
  | "agent-call";

type WidgetPos = "center" | "right" | "top-right" | "bottom-center";

interface FlowRow {
  from?: AppointmentStatus;
  to: AppointmentStatus;
  reason: string;
}

const LIFECYCLE: FlowRow[] = [
  { from: "reserve", to: "confirmation_envoyee", reason: "Rendez-vous réservé par l'agent" },
  { from: "confirmation_envoyee", to: "confirme", reason: "Le patient confirme sa venue" },
  { from: "confirmation_envoyee", to: "need_call", reason: "Pas de réponse — délai dépassé, l'agent doit appeler" },
  { from: "need_call", to: "confirme", reason: "Le patient confirme pendant l'appel" },
  { from: "need_call", to: "annule", reason: "Patient injoignable ou décline" },
  { from: "confirme", to: "termine", reason: "Le rendez-vous a eu lieu" },
  { from: "confirme", to: "absent", reason: "Le patient ne se présente pas" },
];

function AppointmentLifecycle() {
  return (
    <div className="flex flex-col gap-3">
      {LIFECYCLE.map((row, i) => {
        return (
          <div key={i}>
            <div className="flex items-center gap-2">
              {row.from ? (
                <>
                  <StatusBadge status={row.from} size="md" />
                  <span className="text-blue-600" aria-hidden>
                    →
                  </span>
                </>
              ) : (
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  Note
                </span>
              )}
              <StatusBadge status={row.to} size="md" />
            </div>
            <p className="mt-1 flex items-center gap-1.5 ps-1 text-[11px] text-gray-500">
              <span className="inline-block h-px w-3 bg-gray-300" aria-hidden />
              {row.reason}
            </p>
          </div>
        );
      })}
      <p className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
        Un rendez-vous peut aussi être
        <StatusBadge status="annule" size="sm" />
        directement depuis En attente ou Confirmation envoyée si le patient ou le
        cabinet annule.
      </p>
    </div>
  );
}

interface StepDef {
  id: StepId;
  route: string;
  target?: string;
  unionTargets?: string[];
  position: WidgetPos;
  size?: "sm" | "md" | "lg";
  title: string;
  body: React.ReactNode;
  nextText?: string;
  nextRoute?: string;
  next?: () => void;
  callStep?: boolean;
}

const STEPS: StepDef[] = [
  {
    id: "welcome",
    route: "/test/agent",
    position: "center",
    title: "Bienvenue à MAW3IDI test",
    body: (
      <>
        Vous pouvez tester l'agent IA vocal qui répond aux appels, aux messages
        et planifie les rendez-vous pour vous.
      </>
    ),
    nextText: "Suivant",
    nextRoute: "/test/calendar",
  },
  {
    id: "calendar",
    route: "/test/calendar",
    target: "[data-tour='calendar-grid']",
    position: "right",
    title: "Calendrier",
    body: (
      <>
        Ici vous pouvez voir les rendez-vous réservés dans le calendrier, qui
        est le même que celui de votre agenda Google connecté.
      </>
    ),
    nextText: "Suivant",
    nextRoute: "/test/appointments",
  },
  {
    id: "appointments-table",
    route: "/test/appointments",
    target: "[data-tour='appointments-table']",
    position: "top-right",
    title: "Table des rendez-vous",
    body: (
      <>
        Ici vous pouvez voir tous les rendez-vous réservés, les filtrer et voir
        leur état d'avancement.
      </>
    ),
    nextText: "Suivant",
  },
  {
    id: "appointments-cycle",
    route: "/test/appointments",
    position: "center",
    size: "lg",
    title: "Cycle des rendez-vous",
    body: (
      <>
        <p className="text-sm text-gray-600">
          Chaque rendez-vous passe par ce cycle de vie — chaque flèche indique
          ce qui déclenche le passage à l'étape suivante.
        </p>
        <div className="mt-4">
          <AppointmentLifecycle />
        </div>
      </>
    ),
    nextText: "Suivant",
    nextRoute: "/test/patients",
  },
  {
    id: "patients",
    route: "/test/patients",
    target: "[data-tour='patients-table']",
    position: "top-right",
    title: "Patients",
    body: (
      <>
        Retrouvez ici tous vos patients et l'historique de leurs rendez-vous.
      </>
    ),
    nextText: "Suivant",
    nextRoute: "/test/agent",
  },
  {
    id: "agent-channels",
    route: "/test/agent",
    target: "[data-tour='agent-channels']",
    position: "right",
    title: "Les canaux de l'agent",
    body: (
      <>
        L'agent IA répond sur trois canaux : appels vocaux, WhatsApp et
        Instagram. Cliquez sur Suivant pour créer une discussion.
      </>
    ),
    nextText: "Suivant",
  },
  {
    id: "agent-discussion",
    route: "/test/agent",
    target: "[data-tour='discussion-picker']",
    unionTargets: ["[data-tour='discussion-picker']", "[data-tour='discussion-menu']"],
    position: "right",
    title: "Nouvelle discussion",
    body: (
      <>
        La barre de discussion est ouverte. Créez une nouvelle discussion : chez
        l'agent, ce numéro apparaîtra comme un patient inconnu.
      </>
    ),
    nextText: "Suivant",
  },
  {
    id: "agent-call",
    route: "/test/agent",
    target: "[data-tour='call-panel']",
    position: "right",
    title: "Faites votre premier appel",
    body: (
      <>
        Commencez votre premier appel pour réserver un rendez-vous. Appuyez sur
        le bouton bleu qui clignote : l'agent IA décroche et planifie avec vous.
      </>
    ),
    callStep: true,
  },
];

function unionRect(elements: Element[]): DOMRect {
  const rects = elements.map((el) => el.getBoundingClientRect());
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
    right,
    bottom,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function findTargets(step: StepDef): Element[] {
  const selectors = step.unionTargets ?? (step.target ? [step.target] : []);
  const elements: Element[] = [];
  for (const selector of selectors) {
    const els = document.querySelectorAll(selector);
    els.forEach((el) => {
      if (el.getBoundingClientRect().width > 0) elements.push(el);
    });
  }
  return elements;
}

export function TestTourGuide({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  const step = STEPS[stepIndex];

  const finish = React.useCallback(() => {
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, "done");
    } catch {
      // stockage indisponible → on ne relance simplement pas automatiquement
    }
    setActive(false);
    setRect(null);
  }, []);

  // Démarrage une seule fois (premier passage en mode test).
  React.useEffect(() => {
    let done: string | null = null;
    try {
      done = window.localStorage.getItem(TOUR_STORAGE_KEY);
    } catch {
      done = "done";
    }
    if (done === "done") return;
    setActive(true);
    setStepIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation automatique via les boutons « Suivant ».
  const goNext = () => {
    const current = STEPS[stepIndex];
    if (current.next) return current.next();
    const nextIndex = stepIndex + 1;
    if (current.nextRoute) {
      router.push(current.nextRoute);
    }
    setStepIndex(nextIndex < STEPS.length ? nextIndex : stepIndex);
    setRect(null);
  };

  // Résolution du rectangle « trou » une fois la bonne route chargée.
  React.useEffect(() => {
    if (!active) return;
    if (!pathname.startsWith(step.route)) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let tries = 0;
    const compute = () => {
      if (cancelled) return;
      const el = step.target ?? step.unionTargets?.[0];
      if (!el) {
        setRect(null);
        return;
      }
      const els = findTargets(step);
      if (els.length > 0) {
        const r = unionRect(els);
        if (els.length === 1) els[0].scrollIntoView({ block: "nearest", behavior: "smooth" });
        window.setTimeout(() => {
          if (cancelled) return;
          const finalEls = findTargets(step);
          if (finalEls.length > 0) setRect(unionRect(finalEls));
        }, 350);
        setRect(r);
        return;
      }
      tries += 1;
      if (tries < 40) {
        window.setTimeout(compute, 120);
      } else {
        setRect(null);
      }
    };
    compute();
    const onResize = () => {
      const els = findTargets(step);
      if (els.length > 0) setRect(unionRect(els));
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
    };
  }, [active, pathname, stepIndex, step]);

  // Étape « discussion » : ouvre la barre de discussion automatiquement.
  React.useEffect(() => {
    if (!active || !pathname.startsWith(step.route)) return;
    if (step.id !== "agent-discussion") return;
    const timer = window.setTimeout(() => {
      const picker = document.querySelector("[data-tour='discussion-picker']");
      const menu = document.querySelector("[data-tour='discussion-menu']");
      const trigger = picker?.querySelector("button");
      if (picker && trigger && !menu) {
        trigger.click();
        window.setTimeout(() => {
          const els = findTargets(step);
          if (els.length > 0) setRect(unionRect(els));
        }, 180);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [active, pathname, stepIndex, step]);

  // Étape « appel » : le bouton d'appel clignote ; un clic dessus termine le tour.
  React.useEffect(() => {
    if (!active || step.id !== "agent-call") return;
    const btn = document.querySelector<HTMLElement>("[data-tour='call-start']");
    btn?.classList.add("mwr-tour-pulse");
    const onClick = (e: Event) => {
      if ((e.target as Element).closest?.("[data-tour='call-start']")) {
        finish();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => {
      btn?.classList.remove("mwr-tour-pulse");
      document.removeEventListener("click", onClick, true);
    };
  }, [active, step, finish]);

  if (!active) return <>{children}</>;

  // La carte ne s'affiche que sur la bonne route de l'étape courante (pause
  // tant que l'utilisateur navigue ailleurs ; reprise au retour).
  if (!pathname.startsWith(step.route)) return <>{children}</>;

  const widgetPosClass =
    step.position === "center"
      ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      : step.position === "top-right"
        ? "top-20 end-4"
        : "end-4 top-1/2 -translate-y-1/2";

  return (
    <>
      {children}

      {/* Fond sombre pleine page (accueil / cycles) */}
      {!step.target && !step.unionTargets && (
        <div className="fixed inset-0 z-[99] bg-ink/55" aria-hidden />
      )}

      {/* « Trou » : dimm everything sauf la cible */}
      {rect && (
        <div
          className="pointer-events-none fixed z-[99] rounded-xl ring-2 ring-blue-500 transition-[left,top,width,height] duration-300"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(15,23,42,0.6)",
          }}
          aria-hidden
        />
      )}

      <style jsx global>{`
        @keyframes mwr-tour-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mwr-tour-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.7); }
          50% { box-shadow: 0 0 0 14px rgba(59,130,246,0); }
        }
        .mwr-tour-card { animation: mwr-tour-fade 240ms ease-out both; }
        .mwr-tour-pulse { animation: mwr-tour-pulse 1.3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .mwr-tour-card,
          .mwr-tour-pulse { animation: none !important; }
        }
      `}</style>

      {/* Carte explicative */}
      <div
        role="dialog"
        aria-label={step.title}
        className={cn(
          "mwr-tour-card fixed z-[110] w-[min(92vw,360px)] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(15,23,42,0.35)]",
          step.size === "lg" && "max-h-[86vh] w-[min(92vw,440px)] overflow-y-auto",
          widgetPosClass
        )}
      >
        <div className={cn("border-b border-gray-100 px-5 py-4", step.id === "welcome" && "text-center")}>
          <div className="flex items-start justify-between gap-2">
            <div className={cn("flex items-center gap-2.5", step.id === "welcome" && "flex-col")}>
              {step.id === "welcome" ? (
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                  <LogoMark imageClassName="h-8 w-auto" />
                </span>
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                  <Bot className="h-5 w-5" />
                </span>
              )}
              <h2 className="text-base font-semibold text-gray-900">{step.title}</h2>
            </div>
            {!step.callStep && (
              <button
                type="button"
                aria-label="Quitter la visite guidée"
                onClick={finish}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="text-sm leading-relaxed text-gray-600">{step.body}</div>

          {step.callStep ? (
            <div className="mt-4 rounded-xl bg-blue-50 p-3 text-center text-xs font-medium text-blue-700">
              Appuyez sur le bouton d'appel (il clignote) pour terminer la
              démonstration.
            </div>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              {step.nextText ?? "Suivant"}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {/* Points de progression */}
          <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === stepIndex ? "w-5 bg-blue-600" : "w-1.5 bg-gray-200"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}