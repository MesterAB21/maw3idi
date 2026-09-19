import { avatarColor, initials } from "@/lib/utils";

const testimonials = [
  {
    name: "Dr. Mohamed Amrani",
    role: "Médecin généraliste",
    cabinet: "Cabinet Amrani — Alger",
    quote:
      "MAW3IDI m'a fait économiser des heures chaque semaine. Mes patients reçoivent un message en darija, ils confirment, et plus personne ne s'égare dans la salle d'attente.",
    color: "avatar-blue",
  },
  {
    name: "Dr. Samira Bensalem",
    role: "Gynécologue",
    cabinet: "Clinique El Karma — Oran",
    quote:
      "La relance automatique par appel a divisé par deux mes rendez-vous manqués. Le passage en « Need Call » est d'une justesse déconcertante.",
    color: "avatar-pink",
  },
  {
    name: "Dr. Younes Traki",
    role: "Chirurgien-dentiste",
    cabinet: "Cabinet Traki — Constantine",
    quote:
      "Le tableau de bord est limpide : je vois en un coup d'œil qui confirmer, qui appeler, qui rappeler. Et l'agent répond en darija, pour que notre équipe se concentre sur les patients.",
    color: "avatar-violet",
  },
];

export function Testimonials() {
  return (
    <section id="temoignages" className="py-16">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-caption uppercase text-brand-primary">Témoignages</p>
          <h2
            data-reveal-text
            className="mt-3 font-display text-display-md font-bold tracking-[-0.01em] text-ink"
          >
            Ils ne reprendront jamais un cahier de rendez-vous
          </h2>
        </div>

        <div data-grid className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl border border-transparent bg-surface-card p-8 transition-all duration-150 hover:border-brand-primary/30 hover:shadow-card"
            >
              <div className="mb-5 text-brand-primary" aria-hidden>
                {"“".repeat(1)}
              </div>
              <blockquote className="flex-1 text-body-md text-body">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span
                  className="flex size-11 items-center justify-center rounded-full text-title-sm font-semibold text-white"
                  style={{ backgroundColor: avatarColor(t.name) }}
                >
                  {initials(t.name)}
                </span>
                <div>
                  <p className="text-title-sm text-ink">{t.name}</p>
                  <p className="text-body-sm text-muted">
                    {t.role} · {t.cabinet}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}