const STEPS = [
  {
    step: 1,
    title: "Demande",
    description: "Le patient écrit en darija sur WhatsApp ou Instagram : « نبي نحجز عند الطبيب ».",
    detail: "MAW3IDI comprend la demande intention.",
  },
  {
    step: 2,
    title: "Disponibilité",
    description: "L'agent consulte votre planning et propose les créneaux libres du cabinet.",
    detail: "Il respecte vos disponibilités configurées.",
  },
  {
    step: 3,
    title: "Réservation",
    description: "Le patient choisit un jour et une heure. Le rendez-vous est créé dans votre tableau.",
    detail: "Notification immédiate sur le dashboard.",
  },
  {
    step: 4,
    title: "Confirmation",
    description: "MAW3IDI envoie un message de confirmation, relance à J-1 et gère les absents.",
    detail: "Passage automatique en « Need Call » si besoin d'appeler.",
  },
];

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="bg-surface-soft py-16">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-caption uppercase text-brand-primary">Comment ça marche</p>
          <h2
            data-reveal-text
            className="mt-3 font-display text-display-md font-bold tracking-[-0.01em] text-ink"
          >
            De la demande à la confirmation, sans lever le petit doigt
          </h2>
        </div>

        <div data-grid className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.step} className="relative">
              {i < STEPS.length - 1 ? (
                <div
                  className="absolute left-[calc(50%+28px)] top-7 hidden h-px w-[calc(100%-56px)] bg-brand-primary/30 lg:block"
                  aria-hidden
                />
              ) : null}
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-primary font-display text-title-md font-bold text-white">
                {s.step}
              </div>
              <h3 className="text-title-md text-ink">{s.title}</h3>
              <p className="mt-2 text-body-sm text-body">{s.description}</p>
              <p className="mt-2 text-body-sm text-muted">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}