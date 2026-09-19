"use client";

import { Cross, Phone } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";

export function EmptyState({
  title,
  className,
}: {
  title?: string;
  className?: string;
}) {
  const { t } = useApp();
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16",
        className
      )}
    >
      <SignatureIcon />
      <p className="text-body-sm text-muted">{title ?? t("table.empty")}</p>
    </div>
  );
}

/** Signature icon: telephone + medical cross (favicon, loader, empty states, bot avatar). */
export function SignatureIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-16 items-center justify-center rounded-full bg-surface-card",
        className
      )}
    >
      <Phone className="size-8 text-slate-300" strokeWidth={1.5} />
      <span className="absolute -bottom-1 -end-1 flex size-7 items-center justify-center rounded-full border-4 border-surface-soft bg-brand-primary">
        <Cross className="size-3 text-white" strokeWidth={2.5} />
      </span>
    </span>
  );
}