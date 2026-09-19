"use client";

import { PricingCard, type Plan } from "@/components/app/pricing-card";

const PLANS: Plan[] = [
  {
    name: "Standard",
    price: "150 000",
    period: "DA / an",
    description: "L'essentiel pour un cabinet qui veut gagner des heures.",
    features: [
      "Agent de messagerie 24/7",
      "Planification & gestion des rendez-vous",
      "Messages de confirmation automatiques",
      "Tableau de bord & historique",
    ],
    cta: "Choisir Standard",
    featured: false,
  },
  {
    name: "Pro",
    price: "250 000",
    period: "DA / an",
    description: "Tout le Standard, plus un vrai agent d'appel téléphonique.",
    features: [
      "Tout le plan Standard",
      "Agent d'appel téléphonique 24/7",
      "Relances vocales automatiques",
      "Connecteur Google Calendar",
    ],
    cta: "Choisir Pro",
    featured: true,
  },
];

export function PricingSection() {
  return (
    <section id="tarifs" className="bg-surface-soft py-16">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-caption uppercase text-brand-primary">Tarifs</p>
          <h2
            data-reveal-text
            className="mt-3 font-display text-display-md font-bold tracking-[-0.01em] text-ink"
          >
            Un tarif simple, annuel, pensé pour les cabinets
          </h2>
          <p className="mt-4 text-body-md text-muted">
            Sans frais cachés. Basculer de Standard à Pro à tout moment.
          </p>
        </div>

        {/* Facturation annuelle uniquement */}
        <div className="mb-10 flex items-center justify-center">
          <div className="inline-flex items-center rounded-full border border-hairline bg-canvas p-1 shadow-sm">
            <span className="rounded-full bg-brand-primary px-4 py-1.5 text-[13px] font-semibold text-white">
              Annuel
            </span>
            <span className="cursor-not-allowed px-4 py-1.5 text-[13px] font-medium text-muted/60 line-through decoration-muted/40">
              Mensuel
            </span>
          </div>
        </div>

        <div data-grid className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}