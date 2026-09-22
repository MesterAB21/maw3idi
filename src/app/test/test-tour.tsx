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
const SETUP_STORAGE_KEY = "maw3idi:test:setup";
const TEAM_GUIDE_KEY = "maw3idi:test:guide:team";
const HISTORY_GUIDE_KEY = "maw3idi:test:guide:history";

type StepId =
  | "setup-availability"
  | "setup-informations"
  | "setup-google"
  | "welcome"
  | "calendar"
  | "appointments-table"
  | "appointments-cycle"
  | "patients"
  | "agent-channels"
  | "agent-discussion"
  | "agent-call";

type WidgetPos = "center" | "right" | "right-low" | "top-right" | "bottom-center";

interface PipeNodeDef {
  left: number;
  top: number;
  w: number;
  status: AppointmentStatus;
}

interface PipeEdgeDef {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  label: string;
  lx: number;
  lt: number;
  lw: number;
}

// Pipeline horizontal strictement de gauche à droite, entièrement visible
// (680px) sans scroll horizontal. « Confirmé » est dupliqué volontairement
// (haut = depuis Confirmation envoyée, bas = depuis Need Call) pour qu'aucune
// flèche ne reparte vers la gauche.
const PIPE_NODES: PipeNodeDef[] = [
  { left: 0, top: 234, w: 100, status: "reserve" },
  { left: 140, top: 234, w: 140, status: "confirmation_envoyee" },
  { left: 400, top: 78, w: 100, status: "confirme" },
  { left: 400, top: 312, w: 100, status: "need_call" },
  { left: 580, top: 0, w: 100, status: "termine" },
  { left: 580, top: 156, w: 100, status: "absent" },
  { left: 580, top: 390, w: 100, status: "confirme" },
  { left: 580, top: 468, w: 100, status: "annule" },
];

const PIPE_EDGES: PipeEdgeDef[] = [
  { fx: 100, fy: 251, tx: 140, ty: 251, label: "Rendez-vous réservé par l'agent", lx: 55, lt: 276, lw: 130 },
  { fx: 280, fy: 251, tx: 400, ty: 95, label: "Le patient confirme sa venue", lx: 280, lt: 181, lw: 120 },
  { fx: 280, fy: 251, tx: 400, ty: 329, label: "Pas de réponse — délai dépassé, l'agent doit appeler", lx: 265, lt: 298, lw: 130 },
  { fx: 500, fy: 95, tx: 580, ty: 17, label: "Le rendez-vous a eu lieu", lx: 545, lt: 64, lw: 130 },
  { fx: 500, fy: 95, tx: 580, ty: 173, label: "Le patient ne se présente pas", lx: 405, lt: 150, lw: 120 },
  { fx: 500, fy: 329, tx: 580, ty: 407, label: "Patient confirme pendant l'appel", lx: 380, lt: 376, lw: 130 },
  { fx: 500, fy: 329, tx: 580, ty: 485, label: "Patient injoignable ou décline", lx: 405, lt: 415, lw: 130 },
];

function AppointmentLifecycle() {
  return (
    <div>
      <div className="relative mx-auto" style={{ width: 680, height: 510 }}>
        <svg className="absolute inset-0" width={680} height={510} aria-hidden>
          <defs>
            <marker
              id="mwr-tour-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#3b82f6" />
            </marker>
          </defs>
          {PIPE_EDGES.map((e, i) => (
            <path
              key={i}
              d={`M ${e.fx},${e.fy} C ${e.fx + 45},${e.fy} ${e.tx - 45},${e.ty} ${e.tx - 2},${e.ty}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={1.5}
              markerEnd="url(#mwr-tour-arrow)"
            />
          ))}
        </svg>
        {PIPE_NODES.map((n, i) => (
          <div
            key={i}
            className="absolute flex h-[34px] items-center justify-center"
            style={{ left: n.left, top: n.top, width: n.w }}
          >
            <StatusBadge status={n.status} size="sm" />
          </div>
        ))}
        {PIPE_EDGES.map((e, i) => (
          <div
            key={i}
            className="absolute text-center text-[10px] leading-snug text-gray-500"
            style={{ left: e.lx, top: e.lt, width: e.lw }}
          >
            {e.label}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-400">
        « Confirmé » apparaît sur deux chemins : c&apos;est le même statut.
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
  size?: "sm" | "md" | "lg" | "xl";
  lift?: boolean;
  title: string;
  body: React.ReactNode;
  nextText?: string;
  nextRoute?: string;
  next?: () => void;
  callStep?: boolean;
}

// Premier passage : petit guide « setup » (3 étapes) qui présente le cabinet
// de démonstration AVANT le grand tour. Clés de stockage indépendantes.
const SETUP_STEPS: StepDef[] = [
  {
    id: "setup-availability",
    route: "/test/agent",
    position: "center",
    title: "Disponibilité",
    body: (
      <>
        Votre cabinet Brain Care est déjà paramétré : disponible du dimanche au
        jeudi, de 9h à 12h et de 13h à 17h, par créneaux de 30 minutes. C'est
        ce que vos patients voient pour réserver un rendez-vous.
      </>
    ),
    nextText: "Suivant",
  },
  {
    id: "setup-informations",
    route: "/test/agent",
    position: "center",
    title: "Informations",
    body: (
      <>
        Le cabinet de démonstration est prêt : <strong>Brain Care</strong> à
        Achour (Alger), avec votre secrétaire IA <strong>Walid</strong>. Nom,
        localisation et numéros de contact sont pré-remplis et modifiables dans
        Réglages.
      </>
    ),
    nextText: "Suivant",
  },
  {
    id: "setup-google",
    route: "/test/agent",
    position: "center",
    title: "Google agenda",
    body: (
      <>
        MAW3IDI est connecté à l&apos;agenda Google par défaut (
        <strong>mesterab20@gmail.com</strong>) : chaque rendez-vous réservé
        apparaît automatiquement dans votre calendrier.
      </>
    ),
    nextText: "Suivant",
  },
];

const TOUR_STEPS: StepDef[] = [
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
    lift: true,
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
    size: "xl",
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
    lift: true,
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
    position: "right-low",
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
    lift: true,
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
  const [flow, setFlow] = React.useState<"setup" | "tour">("tour");
  const [stepIndex, setStepIndex] = React.useState(0);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const [pageGuide, setPageGuide] = React.useState<"team" | "history" | null>(null);

  const flowSteps = flow === "setup" ? SETUP_STEPS : TOUR_STEPS;
  const step = flowSteps[stepIndex];

  const readKey = (key: string): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return "done";
    }
  };

  const writeKey = (key: string) => {
    try {
      window.localStorage.setItem(key, "done");
    } catch {
      // stockage indisponible → on ne relance simplement pas automatiquement
    }
  };

  const finish = React.useCallback(() => {
    writeKey(TOUR_STORAGE_KEY);
    setActive(false);
    setRect(null);
  }, []);

  const dismissPageGuide = () => {
    if (!pageGuide) return;
    writeKey(pageGuide === "team" ? TEAM_GUIDE_KEY : HISTORY_GUIDE_KEY);
    setPageGuide(null);
  };

  // Démarrage une seule fois : d'abord le guide « setup », ensuite le tour.
  React.useEffect(() => {
    const setupDone = readKey(SETUP_STORAGE_KEY) === "done";
    const tourDone = readKey(TOUR_STORAGE_KEY) === "done";
    if (setupDone && tourDone) return;
    setFlow(setupDone ? "tour" : "setup");
    setActive(true);
    setStepIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guides « équipe » / « historique » : une seule fois, au premier accès, et
  // jamais pendant que le tour (ou le setup) est à l'écran.
  React.useEffect(() => {
    if (active) {
      setPageGuide(null);
      return;
    }
    let guide: "team" | "history" | null = null;
    if (pathname.startsWith("/test/team")) {
      guide = "team";
    } else if (pathname.startsWith("/test/history")) {
      guide = "history";
    }
    if (!guide) {
      setPageGuide(null);
      return;
    }
    const key = guide === "team" ? TEAM_GUIDE_KEY : HISTORY_GUIDE_KEY;
    setPageGuide(readKey(key) === "done" ? null : guide);
  }, [pathname, active]);

  // Navigation automatique via les boutons « Suivant ».
  const goNext = () => {
    if (flow === "setup") {
      writeKey(SETUP_STORAGE_KEY);
      if (readKey(TOUR_STORAGE_KEY) !== "done") {
        setFlow("tour");
        setStepIndex(0);
      } else {
        setActive(false);
      }
      setRect(null);
      return;
    }
    const current = TOUR_STEPS[stepIndex];
    if (current.next) return current.next();
    const nextIndex = stepIndex + 1;
    if (current.nextRoute) {
      router.push(current.nextRoute);
    }
    setStepIndex(nextIndex < TOUR_STEPS.length ? nextIndex : stepIndex);
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

  if (!active) {
    return (
      <>
        {children}
        {pageGuide && (
          <>
            <div className="fixed inset-0 z-[99] bg-ink/55" aria-hidden />
            <div
              role="dialog"
              aria-label={pageGuide === "team" ? "Équipe" : "Historique"}
              className="fixed left-1/2 top-1/2 z-[110] w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(15,23,42,0.35)]"
            >
              <div className="border-b border-gray-100 px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                      <Bot className="h-5 w-5" />
                    </span>
                    <h2 className="text-base font-semibold text-gray-900">
                      {pageGuide === "team" ? "Équipe" : "Historique"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Fermer"
                    onClick={dismissPageGuide}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="text-sm leading-relaxed text-gray-600">
                  {pageGuide === "team"
                    ? "Invitez vos secrétaires : elles peuvent suivre les rendez-vous, confirmer, annuler et rappeler les patients. Dans la démo, une secrétaire est déjà incluse."
                    : "L'historique conserve tous les rendez-vous passés et permet de les filtrer par statut ou par période pour analyser votre activité."}
                </div>
                <button
                  type="button"
                  onClick={dismissPageGuide}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Compris
                </button>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // La carte ne s'affiche que sur la bonne route de l'étape courante (pause
  // tant que l'utilisateur navigue ailleurs ; reprise au retour).
  if (!pathname.startsWith(step.route)) return <>{children}</>;

  const widgetPosClass =
    step.position === "center"
      ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      : step.position === "top-right"
        ? "top-20 end-4"
        : step.position === "right-low"
          ? "end-4 top-[62%] -translate-y-1/2"
          : step.lift
            ? "end-4 top-[36%] -translate-y-1/2"
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
          from { opacity: 0; }
          to { opacity: 1; }
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
          step.size === "xl" && "max-h-[88vh] w-[min(94vw,760px)] overflow-y-auto",
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
            {flowSteps.map((s, i) => (
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