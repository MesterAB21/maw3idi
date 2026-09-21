"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  PhoneCall,
  X,
} from "lucide-react";

import { useApp } from "@/lib/app-context";
import { useAppRoot } from "@/lib/use-app-root";
import { api } from "@/lib/api";
import { formatApptTime } from "@/lib/appt-time";
import { useCabinetRealtime, useRealtimeEvent } from "@/lib/realtime";
import { avatarColor, initials } from "@/lib/utils";
import { StatCardList, StatCardVolume } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { Appointment, AppointmentStatus } from "@/lib/types";

const STATUS_COUNT_COLORS: Record<AppointmentStatus, string> = {
  reserve: "#D97706",
  confirmation_envoyee: "#2563EB",
  confirme: "#16A34A",
  need_call: "#EA580C",
  annule: "#DC2626",
  termine: "#475569",
  absent: "#6B7280",
};

function formatDateForDisplay(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function getTodayKey(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function DashboardPage() {
  const { appointments, openDrawer, t, loading: contextLoading, refreshDashboardStats, dashboardStats, fetchAppointments, confirmAppointment, cancelAppointment } = useApp();
  const root = useAppRoot();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  // Tous les rendez-vous « Need Call » du cabinet (pas seulement ceux d'aujourd'hui).
  const [needCallList, setNeedCallList] = React.useState<Appointment[]>([]);
  const [needCallLoading, setNeedCallLoading] = React.useState(true);
  const [confirmAction, setConfirmAction] = React.useState<
    { mode: "confirm" | "refuse"; appt: Appointment } | null
  >(null);
  const [busyAction, setBusyAction] = React.useState(false);

  const loadNeedCall = React.useCallback(async () => {
    setNeedCallLoading(true);
    try {
      const res = await api.listAppointments({
        statuses: "need_call",
        sort: "date_asc",
        page: 1,
        page_size: 100,
      });
      setNeedCallList(
        [...res.data].sort((a, b) =>
          `${a.date_rendez_vous}`.localeCompare(`${b.date_rendez_vous}`)
        )
      );
    } catch (err) {
      console.error("Failed to fetch need_call appointments:", err);
      setNeedCallList([]);
    } finally {
      setNeedCallLoading(false);
    }
  }, []);

  // Push temps réel (doc §2) : pas de polling, on se rafraîchit sur evento.
  useCabinetRealtime();
  useRealtimeEvent("appointments_changed", () => {
    void fetchAppointments();
    void refreshDashboardStats();
    void loadNeedCall();
  });
  useRealtimeEvent("appointment_updated", () => {
    void loadNeedCall();
  });

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    void loadNeedCall();
    return () => clearTimeout(timer);
  }, [loadNeedCall]);

  const todayKey = getTodayKey();
  const todayRdv = appointments.filter((a) => formatDateForDisplay(a.date_rendez_vous) === todayKey);
  const confirmedToday = todayRdv.filter((a) => a.status === "confirme");
  const todayConfRate = todayRdv.length
    ? Math.round((confirmedToday.length / todayRdv.length) * 100)
    : 0;

  const runAction = async (mode: "confirm" | "refuse", appt: Appointment) => {
    setBusyAction(true);
    try {
      if (mode === "confirm") {
        await confirmAppointment(appt.id);
        toast(t("toast.confirmed", { name: appt.patient?.patient_name ?? "Patient" }), "success");
      } else {
        await cancelAppointment(appt.id);
        toast(t("toast.cancelled", { name: appt.patient?.patient_name ?? "Patient" }), "danger");
      }
      const res = await api.listAppointments({
        statuses: "need_call",
        sort: "date_asc",
        page: 1,
        page_size: 100,
      });
      setNeedCallList(
        [...res.data].sort((a, b) =>
          `${a.date_rendez_vous}`.localeCompare(`${b.date_rendez_vous}`)
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setBusyAction(false);
      setConfirmAction(null);
    }
  };

  const statusRows = [
    {
      label: t("status.confirme"),
      value: appointments.filter((a) => a.status === "confirme").length,
      color: STATUS_COUNT_COLORS.confirme,
    },
    {
      label: t("filter.reserve"),
      value: appointments.filter((a) => a.status === "reserve" || a.status === "confirmation_envoyee").length,
      color: STATUS_COUNT_COLORS.reserve,
    },
    {
      label: t("status.need_call"),
      value: appointments.filter((a) => a.status === "need_call").length,
      color: STATUS_COUNT_COLORS.need_call,
    },
    {
      label: t("filter.annule"),
      value: appointments.filter((a) => a.status === "annule").length,
      color: STATUS_COUNT_COLORS.annule,
    },
  ];

  const agenda = [...confirmedToday, ...todayRdv.filter((a) => a.status === "confirmation_envoyee" || a.status === "reserve")].sort((a, b) => {
    const timeA = a.date_rendez_vous;
    const timeB = b.date_rendez_vous;
    return timeA.localeCompare(timeB);
  });

  if (loading || contextLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <StatCardList
          title={t("dashboard.statusBreakdown")}
          detailHref={`${root}/appointments`}
          rows={statusRows}
        />
        <StatCardVolume
          title={t("dashboard.today")}
          value={confirmedToday.length}
          unit={t("dashboard.confirmedOf", { n: todayRdv.length })}
          percent={todayConfRate}
          color="#16A34A"
          subtitle={t("dashboard.patientsAffected", {
            n: new Set(todayRdv.map((a) => a.patient?.patient_name ?? "")).size,
          })}
          detailHref={`${root}/calendar`}
        />
      </div>

      {/* Priority action list */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-title-md text-ink">
            <PhoneCall className="size-4 text-status-need-call" />
            {t("dashboard.priorityActions")}
          </h2>
          <Link
            href={`${root}/appointments?filter=NEED_CALL`}
            className="text-body-sm font-medium text-brand-primary hover:text-brand-primary-active"
          >
            {t("dashboard.viewAll")}
          </Link>
        </div>

        {needCallLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : needCallList.length === 0 ? (
          <div className="rounded-xl border border-hairline bg-canvas p-6 shadow-card">
            <p className="flex items-center gap-2 text-body-sm text-muted">
              <CheckCircle2 className="size-4 text-status-confirmed" />
              {t("dashboard.nothingToHandle")}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-hairline bg-canvas shadow-card">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-2.5">
              <p className="text-caption uppercase tracking-wide text-muted">
                {t("dashboard.needCallAll")} · {needCallList.length}
              </p>
            </div>
            <ul className="divide-y divide-hairline">
              {needCallList.map((a) => (
                <PriorityRow
                  key={a.id}
                  a={a}
                  onView={() => openDrawer(a.id)}
                  onConfirm={() => setConfirmAction({ mode: "confirm", appt: a })}
                  onRefuse={() => setConfirmAction({ mode: "refuse", appt: a })}
                />
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Today agenda */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-title-md text-ink">
            <CalendarDays className="size-4 text-brand-primary" />
            {t("dashboard.today")}
          </h2>
          <Link
            href={`${root}/calendar`}
            className="text-body-sm font-medium text-brand-primary hover:text-brand-primary-active"
          >
            {t("dashboard.fullCalendar")}
          </Link>
        </div>

        {agenda.length === 0 ? (
          <div className="rounded-xl border border-hairline bg-canvas p-6 shadow-card">
            <p className="text-body-sm text-muted">{t("dashboard.noneToday")}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-hairline bg-canvas shadow-card">
            <ol className="flex flex-col">
              {agenda.map((a, i) => (
                <li
                  key={a.id}
                  className="flex items-center gap-4 border-b border-hairline px-5 py-3.5 last:border-0"
                >
                  <span className="flex w-12 shrink-0 items-center gap-1 text-body-sm font-medium text-ink">
                    <Clock className="size-3.5 text-muted" />
                    {formatApptTime(a.date_rendez_vous)}
                  </span>
                  <span className="hidden h-9 w-px bg-hairline sm:block" />
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-title-sm font-semibold text-white"
                      style={{ backgroundColor: avatarColor(a.patient?.patient_name ?? a.patient_id) }}
                    >
                      {initials(a.patient?.patient_name ?? a.patient_id)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-title-sm text-ink">
                        {a.patient?.patient_name ?? "Patient"}
                      </p>
                      <p className="truncate text-body-sm text-muted">
                        {a.type ?? "—"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} size="sm" pulse={!!a.updatedAt} />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openDrawer(a.id)}
                    className="hidden sm:inline-flex"
                  >
                    {t("common.see")}
                  </Button>
                  <Button
                    variant="icon-outline"
                    onClick={() => openDrawer(a.id)}
                    className="sm:hidden"
                    aria-label={t("dashboard.viewAppointment")}
                  >
                    <Eye className="size-4" />
                  </Button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* Confirmation Confirmer / Refuser */}
      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.mode === "refuse"
                ? t("dashboard.refuseRdv")
                : t("dashboard.confirmRdv")}
            </DialogTitle>
            <DialogDescription>
              {confirmAction ? (
                confirmAction.mode === "refuse"
                  ? t("dashboard.cancelQuestion", {
                      date: formatDateForDisplay(confirmAction.appt.date_rendez_vous),
                      patient: confirmAction.appt.patient?.patient_name ?? "Patient",
                    })
                  : t("dashboard.confirmQuestion", {
                      date: formatDateForDisplay(confirmAction.appt.date_rendez_vous),
                      patient: confirmAction.appt.patient?.patient_name ?? "Patient",
                    })
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              disabled={busyAction}
              onClick={() => setConfirmAction(null)}
            >
              {t("common.no")}
            </Button>
            <Button
              variant={confirmAction?.mode === "refuse" ? "danger" : "success"}
              disabled={busyAction || !confirmAction}
              onClick={() => {
                if (confirmAction) void runAction(confirmAction.mode, confirmAction.appt);
              }}
            >
              {t("common.yes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PriorityRow({
  a,
  onView,
  onConfirm,
  onRefuse,
}: {
  a: Appointment;
  onView: () => void;
  onConfirm: () => void;
  onRefuse: () => void;
}) {
  const { t } = useApp();
  return (
    <li className="flex items-center gap-4 px-5 py-3 transition-colors duration-150 hover:bg-surface-soft">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-status-need-call-bg">
        <PhoneCall className="size-4 text-status-need-call" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-title-sm text-ink">{a.patient?.patient_name ?? "Patient"}</p>
        <p className="flex flex-wrap gap-x-3 text-body-sm text-muted">
          <span>{formatDateForDisplay(a.date_rendez_vous)} · {formatApptTime(a.date_rendez_vous)}</span>
          <span>{a.type ?? "—"}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="success"
          size="sm"
          className="px-2.5 text-[12px]"
          onClick={onConfirm}
          aria-label={t("dashboard.confirmRdv")}
        >
          <Check className="size-3.5" />
          {t("dashboard.confirmRdv")}
        </Button>
        <Button
          variant="danger"
          size="sm"
          className="px-2.5 text-[12px]"
          onClick={onRefuse}
          aria-label={t("dashboard.refuseRdv")}
        >
          <X className="size-3.5" />
          {t("dashboard.refuseRdv")}
        </Button>
        <Button variant="secondary" size="sm" onClick={onView}>
          {t("common.see")}
        </Button>
      </div>
    </li>
  );
}