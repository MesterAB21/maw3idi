"use client";

import * as React from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "danger" | "info" | "warning" | "brand";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

const VARIANT_META: Record<ToastVariant, { icon: LucideIcon; iconClass: string }> = {
  success: { icon: CheckCircle2, iconClass: "text-success" },
  danger: { icon: XCircle, iconClass: "text-danger" },
  info: { icon: Info, iconClass: "text-brand-primary" },
  warning: { icon: AlertTriangle, iconClass: "text-avatar-orange" },
  brand: { icon: CalendarCheck, iconClass: "text-brand-primary" },
};

interface ToastContextValue {
  /**
   * Toast en bas à droite. `variant` pilote la couleur + l'icône
   * (façon « notifications » : success/confirmé, danger/annulé,
   * warning/appel, brand/nouveau RDV ou confirmation manuelle).
   */
  toast: (title: string, variant?: ToastVariant, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback(
    (title: string, variant: ToastVariant = "success", description?: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, title, description, variant }]);
      window.setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 4000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-80 flex-col gap-2">
        {toasts.map((t) => {
          const meta = VARIANT_META[t.variant];
          const Icon = meta.icon;
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 rounded-lg border border-hairline bg-canvas px-4 py-3 shadow-modal animate-slide-up"
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", meta.iconClass)} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{t.title}</p>
                {t.description ? (
                  <p className="mt-0.5 text-[13px] leading-snug text-muted">
                    {t.description}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}