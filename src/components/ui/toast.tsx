"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ToastItem {
  id: string;
  title: string;
  variant: "success" | "danger";
}

interface ToastContextValue {
  toast: (title: string, variant?: "success" | "danger") => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((title: string, variant: "success" | "danger" = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, title, variant }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-lg border border-hairline bg-canvas px-4 py-3 shadow-modal animate-slide-up"
          >
            {t.variant === "success" ? (
              <CheckCircle2 className="size-5 shrink-0 text-success" />
            ) : (
              <XCircle className="size-5 shrink-0 text-danger" />
            )}
            <p className={cn("text-sm font-medium text-ink")}>{t.title}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}