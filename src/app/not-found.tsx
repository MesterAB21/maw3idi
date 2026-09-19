export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-soft px-6 text-center">
      <p className="font-display text-6xl font-bold text-ink">404</p>
      <h1 className="font-display text-display-md font-bold text-ink">
        Page introuvable
      </h1>
      <p className="max-w-sm text-body-sm text-muted">
        La page que vous recherchez n’existe pas ou vous n’avez pas accès à
        cette section.
      </p>
      <a
        href="/login"
        className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-body-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Accéder à la page de connexion
      </a>
    </div>
  );
}