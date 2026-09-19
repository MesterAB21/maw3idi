import Link from "next/link";

import { LogoWhite } from "@/components/brand/logo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "/#fonctionnalites" },
      { label: "Comment ça marche", href: "/#comment-ca-marche" },
      { label: "Tarifs", href: "/pricing" },
      { label: "Connexion", href: "/login" },
    ],
  },
  {
    title: "Cabinet",
    links: [
      { label: "Dashboard", href: "/app/dashboard" },
      { label: "Rendez-vous", href: "/app/appointments" },
      { label: "Calendrier", href: "/app/calendar" },
      { label: "Équipe", href: "/app/team" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Centre d'aide", href: "#contact" },
      { label: "Nous contacter", href: "#contact" },
      { label: "Mentions légales", href: "#contact" },
      { label: "Confidentialité", href: "#contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer id="contact" className="bg-surface-dark text-on-dark">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <LogoWhite />
            <p className="mt-4 max-w-xs text-body-sm text-on-dark-muted">
              Réponses automatiques, appels et planification des rendez-vous,
              pris en charge 24/7 — pour que votre équipe garde le contrôle et
              l'esprit libre.
            </p>
            <p className="mt-6 font-mono text-code text-on-dark-muted">
              maw3idi.com/cabinet-dr-amrani
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-caption uppercase text-on-dark-muted">{col.title}</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-body-sm text-on-dark/80 transition-colors duration-150 hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-body-sm text-on-dark-muted">
            © 2026 MAW3IDI. Tous droits réservés.
          </p>
          <p className="text-body-sm text-on-dark-muted">
            Alger · Oran · Constantine
          </p>
        </div>
      </div>
    </footer>
  );
}