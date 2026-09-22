"use client";

import * as React from "react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface TestPatient {
  contact_id: string;
  name: string;
  phone: string;
  channel: string;
}

export interface TestSession {
  cabinetId: string;
  cabinetName: string;
  agentName: string;
  channels: Array<{ channel_type: string; channel_identifier: string }>;
  patients: TestPatient[];
  googleConnected: boolean;
}

const TestSessionContext = React.createContext<TestSession | null>(null);

export function useTestSession(): TestSession {
  const ctx = React.useContext(TestSessionContext);
  if (!ctx) throw new Error("useTestSession must be used inside <TestSessionGate>");
  return ctx;
}

type Phase = "checking" | "initializing" | "google" | "error" | "ready";

function CenteredCard({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="min-h-screen bg-surface-soft flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <span className="text-2xl">🧠</span>
          </div>
          <h2 className={cn("text-lg font-semibold text-gray-900")}>{label}</h2>
          <div className="mt-5 w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-7 w-7 animate-spin text-blue-600 mx-auto"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function TestSessionGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = React.useState<Phase>("checking");
  const [session, setSession] = React.useState<TestSession | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [cloning, setCloning] = React.useState(false);
  const [cloneError, setCloneError] = React.useState<string | null>(null);

  const finalize = React.useCallback(async (init: {
    initialized: boolean;
    cabinet_id: string;
    cabinet_name: string;
    agent_name: string;
    channels: Array<{ channel_type: string; channel_identifier: string }>;
    patients: TestPatient[];
    google_connected: boolean;
  }) => {
    // Backup du cabinet en localStorage : même si les cookies (marqueur) sont
    // perdus (PC éteint, nettoyage), le même navigateur retrouve son cabinet
    // via ?restore= au lieu d'en recréer un.
    try {
      window.localStorage.setItem("maw3idi:test:cabinet", init.cabinet_id);
    } catch {
      // localStorage indisponible → on survit sans restauration
    }
    setSession({
      cabinetId: init.cabinet_id,
      cabinetName: init.cabinet_name,
      agentName: init.agent_name ?? "Agent",
      channels: init.channels,
      patients: init.patients,
      googleConnected: init.google_connected,
    });
    setPhase(init.google_connected ? "ready" : "google");
  }, []);

  const runCheck = React.useCallback(async () => {
    setPhase("checking");
    setError(null);
    let restoreId: string | undefined;
    try {
      restoreId = window.localStorage.getItem("maw3idi:test:cabinet") ?? undefined;
    } catch {
      restoreId = undefined;
    }
    try {
      const status = await api.testStatus();
      if (status.initialized) {
        // Idempotent: reuses the marker cabinet, returns channels + google state.
        const init = await api.testInit(restoreId);
        await finalize(init);
        return;
      }
      setPhase("initializing");
      const init = await api.testInit(restoreId);
      await finalize(init);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setPhase("error");
    }
  }, [finalize]);

  React.useEffect(() => {
    runCheck();
  }, [runCheck]);

  if (phase === "ready" && session) {
    return (
      <TestSessionContext.Provider value={{ ...session }}>
        {children}
      </TestSessionContext.Provider>
    );
  }

  if (phase === "checking" || phase === "initializing") {
    return (
      <CenteredCard label={phase === "checking" ? "Vérification de la session test…" : "Initialisation du mode test…"}>
        <Spinner />
        <p className="mt-3 text-sm text-muted">
          {phase === "initializing"
            ? "Création de votre cabinet de démonstration…"
            : "Un instant…"}
        </p>
      </CenteredCard>
    );
  }

  if (phase === "error") {
    return (
      <CenteredCard label="Impossible d'initialiser le mode test">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={runCheck}
          className="mt-5 w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Réessayer
        </button>
      </CenteredCard>
    );
  }

  // phase === "google"
  const handleUseDefault = async () => {
    setCloning(true);
    setCloneError(null);
    try {
      const res = await api.testUseDefaultCalendar();
      if (!res.connected) {
        setCloneError(
          "Aucun calendrier existant trouvé. Configurez votre calendrier ci-dessous."
        );
        setCloning(false);
        return;
      }
      setSession((prev) =>
        prev ? { ...prev, googleConnected: true } : prev
      );
      setPhase("ready");
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : "Erreur inconnue");
      setCloning(false);
    }
  };

  const handleConnect = async () => {
    const { url } = await api.connectGoogleCalendar();
    window.location.href = url;
  };

  return (
    <CenteredCard label="Calendrier Google">
      <p className="text-sm text-muted">
        Utilisez un calendrier existant ou configurez votre calendrier.
      </p>
      <p className="mt-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
        Conseil : le choix recommandé est d'utiliser le compte calendrier par
        défaut (<strong>mesterab20@gmail.com</strong>), réutilisé pour tous vos
        tests sans autorisation Google supplémentaire.
      </p>
      {cloneError && <p className="mt-2 text-sm text-red-600">{cloneError}</p>}
      <button
        onClick={handleUseDefault}
        disabled={cloning}
        className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {cloning ? "Utilisation du calendrier par défaut…" : "Utiliser le calendrier par défaut (recommandé)"}
      </button>
      <button
        onClick={handleConnect}
        className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Configurer mon calendrier
      </button>
      <button
        onClick={() => setPhase("ready")}
        className="mt-2 w-full rounded-xl px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
      >
        Passer pour l'instant
      </button>
    </CenteredCard>
  );
}