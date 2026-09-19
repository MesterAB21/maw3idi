"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/app-context";
import { useToast } from "@/components/ui/toast";

const PLANS = [
  { id: "standard", name: "Standard", price: "150 000 DA / an" },
  { id: "pro", name: "Pro", price: "250 000 DA / an", featured: true },
];

export default function SignupPage() {
  const { register } = useApp();
  const { toast } = useToast();
  const [plan, setPlan] = React.useState("pro");
  const [email, setEmail] = React.useState("");
  const [cabinetName, setCabinetName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [localisation, setLocalisation] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!cabinetName.trim() || !email.trim() || !username.trim() || !password) {
      setError("Tous les champs obligatoires doivent être remplis.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await register({
        nom_cabinet: cabinetName.trim(),
        nom_agent: username.trim(),
        localisation: localisation.trim() || "Non renseigné",
        plan: plan as "standard" | "pro",
        username: username.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });
      toast("Inscription réussie ! Bienvenue sur MAW3IDI.", "success");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-soft">
        <div className="flex justify-start px-6 pt-6">
          <Logo />
        </div>
        <main className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="w-full max-w-md rounded-2xl border border-hairline bg-canvas p-8 shadow-card">
            <div className="py-6 text-center">
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-status-confirmed-bg">
                <Check className="size-7 text-status-confirmed" />
              </span>
              <h1 className="font-display text-display-md font-bold text-ink">
                Votre cabinet est créé !
              </h1>
              <p className="mt-3 text-body-sm text-muted">
                Vous êtes maintenant connecté. Redirection vers le tableau de
                bord...
              </p>
            </div>
          </div>
        </main>
        <div className="flex justify-center pb-8">
          <p className="text-body-sm text-muted">
            <Link
              href="/app/dashboard"
              className="font-medium text-brand-primary hover:text-brand-primary-active"
            >
              Accéder au tableau de bord
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-soft">
      <div className="flex justify-start px-6 pt-6">
        <Logo />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-2xl border border-hairline bg-canvas p-8 shadow-card">
          <h1 className="font-display text-display-md font-bold text-ink">
            Essai gratuit 30 jours
          </h1>
          <p className="mt-2 text-body-sm text-muted">
            Sans carte bancaire. Activation immédiate après inscription.
          </p>

          <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="cabinet"
                className="mb-1.5 block text-body-sm font-medium text-ink"
              >
                Nom du cabinet
              </label>
              <Input
                id="cabinet"
                value={cabinetName}
                onChange={(e) => setCabinetName(e.target.value)}
                placeholder="Cabinet Dr. Amrani"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-body-sm font-medium text-ink"
              >
                Votre nom (administrateur)
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Dr. Amrani"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-body-sm font-medium text-ink"
              >
                Adresse e-mail professionnelle
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@cabinet.dz"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-body-sm font-medium text-ink"
              >
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-body-sm font-medium text-ink"
              >
                Téléphone (optionnel)
              </label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+213 5XX XX XX XX"
                disabled={isLoading}
              />
            </div>
            <div>
              <label
                htmlFor="localisation"
                className="mb-1.5 block text-body-sm font-medium text-ink"
              >
                Localisation (optionnel)
              </label>
              <Input
                id="localisation"
                value={localisation}
                onChange={(e) => setLocalisation(e.target.value)}
                placeholder="Alger Centre, 12 rue Didouche Mourad"
                disabled={isLoading}
              />
            </div>

            <fieldset>
              <legend className="mb-2 block text-body-sm font-medium text-ink">
                Plan
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    aria-pressed={plan === p.id}
                    disabled={isLoading}
                    className={`cursor-pointer rounded-xl border-2 p-4 text-left transition-all duration-150 focus-visible:ring-3 focus-visible:ring-ring/15 ${
                      plan === p.id
                        ? "border-brand-primary bg-brand-primary/5"
                        : "border-hairline bg-canvas hover:border-brand-primary/40"
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-title-sm text-ink">{p.name}</span>
                      {p.featured ? (
                        <span className="rounded-full bg-avatar-emerald px-2 py-0.5 text-[10px] font-semibold text-ink">
                          Recommandé
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-body-sm text-muted">
                      {p.price}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {error && (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Création en cours...
                </>
              ) : (
                "Créer mon essai gratuit"
              )}
            </Button>
            <p className="text-center text-body-sm text-muted">
              En continuant, vous acceptez nos{" "}
              <a href="#" className="text-brand-primary hover:text-brand-primary-active">
                conditions d'utilisation
              </a>
              .
            </p>
          </form>
        </div>
      </main>

      <div className="flex justify-center pb-8">
        <p className="text-body-sm text-muted">
          Déjà inscrit ?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-primary hover:text-brand-primary-active"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}