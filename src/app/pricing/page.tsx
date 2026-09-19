import { LandingNav } from "@/components/landing/landing-nav";
import { PricingSection } from "@/components/landing/pricing-section";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export const metadata = {
  title: "Tarifs",
  description:
    "Deux plans simples pour votre cabinet : Standard et Pro. Prix annuels uniquement.",
};

export default function PricingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <div className="mx-auto max-w-[1280px] px-4 pt-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-caption uppercase text-brand-primary">Tarifs</p>
            <h1 className="mt-3 font-display text-display-lg font-bold tracking-[-0.02em] text-ink">
              Un investissement qui se rembourse en un seul rendez-vous manqué
              en moins
            </h1>
            <p className="mt-4 text-body-md text-muted">
              Facturation annuelle. Passez du Standard au Pro quand vous le
              souhaitez — la différence se voit dès le premier appel.
            </p>
          </div>
        </div>
        <PricingSection />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}