import { LandingNav } from "@/components/landing/landing-nav";
import { LandingMotion } from "@/components/landing/landing-motion";
import { Hero } from "@/components/landing/hero";
import { TrustBand } from "@/components/landing/trust-band";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { DashboardMockup } from "@/components/landing/dashboard-mockup";
import { Testimonials } from "@/components/landing/testimonials";
import { PricingSection } from "@/components/landing/pricing-section";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <LandingMotion>
      <LandingNav />
      <main>
        <Hero />
        <TrustBand />
        <Features />
        <HowItWorks />

        {/* Voir → Comprendre → Agir */}
        <section id="voir-comprendre-agir" className="py-16">
          <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8">
            <div>
              <p className="text-caption uppercase text-brand-primary">Voir → Comprendre → Agir</p>
              <h2
                data-reveal-text
                className="mt-3 font-display text-display-md font-bold tracking-[-0.01em] text-ink"
              >
                Un tableau de bord pensé pour l'action
              </h2>
              <p className="mt-4 text-body-md text-muted">
                En un coup d'œil : qui a confirmé, qui attend, qui faut-il appeler.
                Pas de colonnes inutiles, pas de clics perdus — un seul mouvement
                vers le patient.
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {[
                  "Priorités « Need Call » remontées en haut du dashboard",
                  "Badges de statut impossibles à rater",
                  "Confirmer ou annuler en un clic, directement dans la table",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-body-sm text-body">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-primary" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <DashboardMockup />
          </div>
        </section>

        <Testimonials />
        <PricingSection />
        <FinalCta />
      </main>
      <Footer />
    </LandingMotion>
  );
}