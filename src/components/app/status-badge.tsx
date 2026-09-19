"use client";

import {
  CheckCheck,
  CheckCircle2,
  Clock,
  PhoneCall,
  Send,
  UserX,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { TKey } from "@/lib/i18n";
import type { AppointmentStatus } from "@/lib/types";

const STATUS_META: Record<
  AppointmentStatus,
  { color: string; bg: string; icon: LucideIcon }
> = {
  reserve: { color: "text-status-pending", bg: "bg-status-pending-bg", icon: Clock },
  confirmation_envoyee: {
    color: "text-status-confirmation-sent",
    bg: "bg-status-confirmation-sent-bg",
    icon: Send,
  },
  confirme: { color: "text-status-confirmed", bg: "bg-status-confirmed-bg", icon: CheckCircle2 },
  need_call: { color: "text-status-need-call", bg: "bg-status-need-call-bg", icon: PhoneCall },
  annule: { color: "text-status-cancelled", bg: "bg-status-cancelled-bg", icon: XCircle },
  termine: { color: "text-status-completed", bg: "bg-status-completed-bg", icon: CheckCheck },
  absent: { color: "text-status-no-show", bg: "bg-status-no-show-bg", icon: UserX },
};

export function StatusBadge({
  status,
  size = "md",
  pulse = false,
  className,
}: {
  status: AppointmentStatus;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const { t } = useApp();
  const label = t(`status.${status}` as TKey);
  return (
    <span
      title={label}
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        meta.bg,
        meta.color,
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "md" && "px-2.5 py-1 text-[12px] leading-[1.3]",
        size === "lg" && "px-4 py-1.5 text-[13px]",
        pulse && "animate-pulse-once",
        className
      )}
    >
      <span
        className={cn(
          "rounded-full",
          size === "sm" ? "size-1.5" : "size-2",
          "bg-current"
        )}
        aria-hidden
      />
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}