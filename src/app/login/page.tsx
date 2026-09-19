"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Eye, EyeOff, AlertCircle, Info } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { useApp } from "@/lib/app-context";
import { useToast } from "@/components/ui/toast";

const INPUT_CLASS =
  "w-full rounded-[10px] border-[0.8px] border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[13px] text-[#90A1B9] transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#005FB5]/40";

const PRIMARY_BUTTON_CLASS =
  "shadow-md rounded-[10px] bg-[#005FB5] py-3 h-[44px] text-white text-[14px] font-semibold hover:opacity-90 hover:cursor-pointer active:opacity-75 transition duration-200";

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginPageInner />
    </React.Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, checkAuth, t } = useApp();
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // OAuth / callback feedback (?error=… or ?google=1 when no account exists).
  const oauthError = searchParams.get("error");
  const googleNoAccount = searchParams.get("google") === "1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!email.trim() || !password) {
      setError("Adresse e-mail ou mot de passe invalide.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const isSuperAdmin = await login(email, password);
      toast("Connexion réussie", "success");
      router.push(isSuperAdmin ? "/app/superadmin" : "/app/dashboard");
      router.refresh();
    } catch {
      setError("Identifiants invalides. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "email") setEmail(e.target.value);
    else setPassword(e.target.value);
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/v1/auth/google";
  };

  return (
    <AuthShell>
      <div className="relative z-[35] flex max-h-full w-1/2 flex-col items-start justify-start gap-5 overflow-y-auto rounded-r-[2rem] bg-white py-12 pr-[53px] pl-[51px]">
        <div>
          <p className="text-[13px] font-medium text-[#005FB5]">MAW3IDI</p>
          <h2 className="text-2xl font-bold">Ravi de vous revoir</h2>
          <p className="mt-0.5 text-[14px] font-normal text-[#90A1B9]">
            Connectez-vous pour accéder au tableau de bord de votre cabinet.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
          {oauthError ? (
            <p className="flex items-center gap-1.5 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <AlertCircle className="size-4 shrink-0" />
              {oauthError}
            </p>
          ) : null}
          {googleNoAccount ? (
            <div className="flex flex-col gap-2 rounded-[10px] border border-[#005FB5]/20 bg-[#005FB5]/5 px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-[#005FB5]">
                <Info className="size-4 shrink-0" />
                {t("login.google.noAccount.title")}
              </p>
              <p className="text-[13px] text-[#314158]">
                {t("login.google.noAccount.body")}{" "}
                <Link href="/commencer" className="font-semibold text-[#005FB5] hover:opacity-80">
                  {t("login.google.noAccount.cta")}
                </Link>
              </p>
            </div>
          ) : null}
          <div className="flex flex-col">
            <label htmlFor="email" className="text-[13px] font-semibold">
              Adresse e-mail
            </label>
            <input
              id="email"
              name="email"
              placeholder="amine@cabinet-dr-amrani.dz"
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={handleChange}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="password" className="text-[13px] font-semibold">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={handleChange}
                className={INPUT_CLASS}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                }
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-[#90A1B9]" />
                ) : (
                  <Eye className="h-5 w-5 text-[#90A1B9]" />
                )}
              </button>
            </div>
            {(error || isLoading) && (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-red-700">
                <AlertCircle className="size-4" />
                {error || "Connexion en cours..."}
              </p>
            )}
          </div>
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-row items-center">
              <input
                type="checkbox"
                id="checkbox"
                name="checkbox"
                className="h-4 w-4 border-[0.8px] border-[#E2E8F0] accent-[#005FB5] hover:cursor-pointer"
              />
              <label
                htmlFor="checkbox"
                className="ml-2 text-center text-[13px] font-medium text-[#62748E] hover:cursor-pointer"
              >
                Se souvenir de moi
              </label>
            </div>
            <Link
              href="/forget-password"
              className="text-[13px] font-semibold leading-4 text-[#005FB5]"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`${PRIMARY_BUTTON_CLASS} ${
              isLoading ? "cursor-not-allowed bg-gray-500" : ""
            }`}
          >
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="flex w-full flex-col items-center gap-5">
          <div className="flex flex-row items-center gap-4 w-full">
            <div className="flex-1 border-[0.1px] border-[#90A1B9]/60" />
            <p className="text-[10px] font-medium text-[#90A1B9]">
              ou continuer avec
            </p>
            <div className="flex-1 border-[0.1px] border-[#90A1B9]/60" />
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="flex h-[37px] w-full flex-row items-center justify-center gap-1.5 rounded-xl border-[0.8px] border-[#E2E8F0] text-[13px] font-semibold text-[#314158] transition duration-200 hover:opacity-90 hover:cursor-pointer active:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            Continuer avec Google
          </button>
          <p className="text-center text-[11px] text-[#90A1B9]">
            Besoin d'aide ?{" "}
            <a
              href="mailto:support@maw3idi.dz"
              className="text-[#005FB5] hover:opacity-80"
            >
              support@maw3idi.dz
            </a>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}