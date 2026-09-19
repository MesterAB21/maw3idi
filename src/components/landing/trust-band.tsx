import { Stethoscope } from "lucide-react";

const CITIES = ["Alger", "Oran", "Constantine"];

export function TrustBand() {
  return (
    <section className="border-y border-brand-primary/10 bg-brand-primary/[0.05] py-6">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-4 lg:flex-row lg:gap-8">
          <span className="inline-flex items-center gap-2 text-caption uppercase text-muted">
            <Stethoscope className="size-4 text-brand-primary" />
            Utilisé par des cabinets médicaux à
          </span>
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {CITIES.map((c, i) => (
              <li key={c}>
                <span
                  className="text-title-sm font-semibold text-brand-primary"
                  style={{ opacity: 1 - i * 0.15 }}
                >
                  {c}
                </span>
                {i < CITIES.length - 1 ? (
                  <span className="ml-6 text-hairline" aria-hidden>
                    ·
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}