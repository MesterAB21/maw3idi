import Link from "next/link";

import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="bg-brand-deep py-20">
      <div className="mx-auto max-w-[1280px] px-4 text-center sm:px-6 lg:px-8">
<h2 className="mx-auto max-w-2xl font-display text-display-lg font-bold tracking-[-0.02em] text-on-dark">
            Reprenez vos soirées. L'assistant gère le reste.
          </h2>
        <p className="mx-auto mt-4 max-w-xl text-body-md text-on-dark-muted">
          Rejoignez les cabinets qui ne manquent plus un rendez-vous. Essai gratuit
          de 30 jours, sans engagement.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/commencer">
            <Button
              size="lg"
              className="w-full border border-white/20 bg-canvas text-brand-deep hover:bg-surface-soft sm:w-auto"
            >
              Ajouter votre cabinet
            </Button>
          </Link>
          <Link href="/pricing">
            <Button
              size="lg"
              variant="ghost"
              className="w-full text-on-dark hover:bg-white/10 sm:w-auto"
            >
              Voir les tarifs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}