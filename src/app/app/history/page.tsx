"use client";

import * as React from "react";
import { CalendarDays, Clock } from "lucide-react";

import { useApp } from "@/lib/app-context";
import { avatarColor, initials } from "@/lib/utils";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState } from "@/components/app/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment, AppointmentStatus } from "@/lib/types";

const HISTORY_STATUSES: AppointmentStatus[] = ["termine", "annule", "absent"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPage() {
  const { appointments, t } = useApp();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const history = appointments
    .filter((a) => HISTORY_STATUSES.includes(a.status))
    .sort((a, b) => `${a.date_rendez_vous}`.localeCompare(`${b.date_rendez_vous}`));

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-body-sm text-muted">
        {t("history.count", { n: history.length })}
      </p>

      {history.length === 0 ? (
        <div className="rounded-xl border border-hairline bg-canvas">
          <EmptyState title={t("history.empty")} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-hairline bg-canvas shadow-card">
          <ul className="flex flex-col">
            {history.map((a, i) => {
              const patientName = a.patient?.patient_name ?? "Patient";
              return (
                <li
                  key={a.id}
                  className={`flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5 transition-colors duration-150 last:border-0 hover:bg-surface-soft ${
                    i === 0 ? "bg-surface-soft" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-title-sm font-semibold text-white"
                      style={{ backgroundColor: avatarColor(patientName) }}
                    >
                      {initials(patientName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-title-sm text-ink">{patientName}</p>
                      <p className="truncate text-body-sm text-muted">
                        {a.canal?.toUpperCase() ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="hidden items-center gap-1.5 text-body-sm text-muted sm:flex">
                      <CalendarDays className="size-3.5" />
                      {formatDate(a.date_rendez_vous)}
                      <Clock className="ms-1 size-3.5" />
                      {formatTime(a.date_rendez_vous)}
                    </span>
                    <StatusBadge status={a.status} size="sm" />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}