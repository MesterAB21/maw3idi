"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
}

export function PricingCard({
  plan,
  onSelect,
}: {
  plan: Plan;
  onSelect?: (name: string) => void;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl p-8 shadow-card",
        plan.featured
          ? "border-2 border-brand-primary bg-canvas"
          : "border border-hairline bg-canvas"
      )}
    >
      {plan.featured ? (
        <span className="absolute -top-3 right-6 rounded-full bg-avatar-emerald px-3 py-1 text-xs font-semibold text-ink shadow-sm">
          Recommandé
        </span>
      ) : null}

      <h3 className="text-title-lg text-ink">{plan.name}</h3>
      <p className="mt-1 text-body-sm text-muted">{plan.description}</p>

      <div className="mt-6 flex items-baseline gap-2">
        <span className="font-display text-4xl font-bold tracking-tight text-ink">
          {plan.price}
        </span>
        <span className="text-body-sm text-muted">{plan.period}</span>
      </div>

      <ul className="mt-7 flex flex-1 flex-col gap-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-body-sm text-body">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-status-confirmed-bg">
              <Check className="size-3 text-status-confirmed" />
            </span>
            {f}
          </li>
        ))}
      </ul>

      <Button
        variant={plan.featured ? "primary" : "secondary"}
        size="lg"
        className="mt-8 w-full"
        onClick={() => onSelect?.(plan.name)}
      >
        {plan.cta}
      </Button>
    </div>
  );
}