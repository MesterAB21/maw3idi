"use client";

import Link from "next/link";
import * as React from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { useApp } from "@/lib/app-context";
import { useToast } from "@/components/ui/toast";

const INPUT_CLASS =
  "w-full rounded-[10px] border-[0.8px] border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[13px] text-[#90A1B9] transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#005FB5]/40";

const PRIMARY_BUTTON_CLASS =
  "shadow-md rounded-[10px] bg-[#005FB5] py-3 h-[44px] text-white text-[14px] font-semibold hover:opacity-90 hover:cursor-pointer active:opacity-75 transition duration-200";

export default function ForgetPasswordPage() {
  const { forgotPassword } = useApp();
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!email.trim()) {
      setError("Veuillez saisir votre adresse e-mail.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await forgotPassword(email);
      toast("Si cet e-mail existe, un lien de réinitialisation a été envoyé.", "success");
      setSuccess(true);
    } catch {
      setError("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="flex w-1/2 flex-col items-center gap-5 rounded-r-[2rem] bg-white py-12 pr-[53px] pl-[51px]">
        <div className="flex w-full flex-col items-center gap-[38px]">
          <p className="text-[13px] font-medium text-[#005FB5]">MAW3IDI</p>
          <h2 className="text-2xl font-bold">Mot de passe oublié</h2>
          {!success && (
            <p className="mt-0.5 text-center text-[14px] font-normal text-[#90A1B9]">
              Saisissez votre adresse e-mail et nous vous enverrons un lien de
              réinitialisation.
            </p>
          )}
        </div>

        {success ? (
          <div className="flex w-full flex-col items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-[#314158]">
                Vérifiez votre boîte mail
              </p>
              <p className="mt-1 text-[13px] text-[#90A1B9]">
                Un e-mail avec le lien de réinitialisation a été envoyé à{" "}
                {email}.
              </p>
            </div>
            <Link
              href="/login"
              className={`${PRIMARY_BUTTON_CLASS} w-full text-center`}
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-10">
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
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
                disabled={isLoading}
              />
              {error && (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-red-700">
                  <AlertCircle className="size-4" />
                  {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={`${PRIMARY_BUTTON_CLASS} ${
                isLoading ? "cursor-not-allowed bg-gray-500" : ""
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Envoi...
                </>
              ) : (
                "Envoyer les instructions"
              )}
            </button>
          </form>
        )}

        {!success && (
          <Link
            href="/login"
            className="text-[13px] font-semibold leading-4 text-[#005FB5]"
          >
            Retour à la connexion
          </Link>
        )}
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
    </AuthShell>
  );
}