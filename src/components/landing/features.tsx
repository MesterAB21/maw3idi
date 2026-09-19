import { MessageCircle, PhoneCall, BellRing } from "lucide-react";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "Réponses automatiques WhatsApp & Instagram",
    description:
      "Votre patient écrit en darija à 23h — MAW3IDI comprend, répond et propose un créneau libre, sans intervention humaine.",
    badge: null,
  },
  {
    icon: PhoneCall,
    title: "Appels téléphoniques automatisés",
    description:
      "Pour vos patients qui ne répondent pas aux messages, l'agent appelle, confirme la présence ou relance en voix naturelle.",
    badge: "Pro",
  },
  {
    icon: BellRing,
    title: "Confirmations & rappels intelligents",
    description:
      "Messages de confirmation, rappels à J-1, relance des absents et passage automatique en « Need Call » si pas de réponse.",
    badge: null,
  },
];

export function Features() {
  return (
    <section id="fonctionnalites" className="py-16">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-caption uppercase text-brand-primary">Fonctionnalités</p>
          <h2
            data-reveal-text
            className="mt-3 font-display text-display-md font-bold tracking-[-0.01em] text-ink"
          >
            Les tâches répétitives, prises en charge
          </h2>
          <p className="mt-4 text-body-md text-muted">
            MAW3IDI couvre tout le parcours patient, du premier message à la
            salle d'attente — votre équipe garde le contrôle de chaque décision.
          </p>
        </div>

        <div data-grid className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-transparent bg-surface-card p-8 transition-all duration-150 hover:border-brand-primary/30 hover:shadow-card"
            >
              <div className="mb-5 flex items-start justify-between">
                <span className="flex size-12 items-center justify-center rounded-full bg-brand-primary/10">
                  <f.icon className="size-5 text-brand-primary" />
                </span>
                {f.badge ? (
                  <span className="rounded-full bg-avatar-emerald px-2.5 py-1 text-xs font-semibold text-ink">
                    {f.badge}
                  </span>
                ) : null}
              </div>
              <h3 className="text-title-md text-ink">{f.title}</h3>
              <p className="mt-2 text-body-md text-muted">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}