"use client";

import * as React from "react";
import {
  CalendarDays,
  Check,
  Clock,
  Phone,
  PhoneCall,
  X,
} from "lucide-react";

import { cn, avatarColor, initials } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { TKey } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/app/status-badge";
import type { AppointmentEvent } from "@/lib/types";

const DOT_COLOR: Record<string, string> = {
  sent: "bg-brand-primary",
  received: "bg-status-confirmed",
  system: "bg-muted",
  call: "bg-status-need-call",
};

function eventDot(ev: AppointmentEvent): string {
  const t = ev.event_type.toLowerCase();
  if (t.includes("call")) return DOT_COLOR.call;
  if (t.includes("received") || t.includes("patient")) return DOT_COLOR.received;
  if (t.includes("sent")) return DOT_COLOR.sent;
  return DOT_COLOR.system;
}

function eventContent(ev: AppointmentEvent): string {
  return ev.patient_message_excerpt || ev.event_type.replace(/_/g, " ");
}

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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const hasArabic = (s: string) => /[\u0600-\u06FF]/.test(s);

export function AppointmentDrawer() {
  const {
    appointments,
    selectedId,
    closeDrawer,
    confirmAppointment,
    cancelAppointment,
    t,
  } = useApp();
  const { toast } = useToast();
  const [closing, setClosing] = React.useState(false);

  const appointment = appointments.find((a) => a.id === selectedId) ?? null;
  const open = !!appointment;

  React.useEffect(() => {
    if (!open) setClosing(false);
  }, [open]);

  if (!open) return null;

  const close = () => {
    setClosing(true);
    setTimeout(closeDrawer, 280);
  };

  const patientName = appointment.patient?.patient_name ?? "Patient";
  const patientPhone = appointment.patient?.patient_phone ?? "—";
  const events = appointment.events ?? [];

  const handleConfirm = () => {
    confirmAppointment(appointment.id);
    toast(t("toast.confirmed", { name: patientName }), "success");
  };

  const handleCancel = () => {
    cancelAppointment(appointment.id);
    toast(t("toast.cancelled", { name: patientName }), "danger");
  };

  const canAction = appointment.status === "need_call";

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={cn(
          "absolute inset-0 bg-ink/40 backdrop-blur-[2px]",
          closing ? "animate-out fade-out-0 duration-drawer" : "animate-overlay-in"
        )}
        onClick={close}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("drawer.aria", { id: appointment.id })}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-canvas shadow-modal sm:w-[480px] dark:bg-canvas",
          closing
            ? "animate-out slide-out-to-right-full duration-drawer ease-in"
            : "animate-slide-in-from-right-full duration-drawer ease-out"
        )}
      >
        {/* Header */}
        <div className="border-b border-hairline px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-title-lg text-ink">
                {t("drawer.title", { id: appointment.id })}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {formatDate(appointment.date_rendez_vous)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {formatTime(appointment.date_rendez_vous)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {patientPhone}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="flex size-9 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-surface-soft hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/15"
              aria-label={t("common.close")}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Patient + status summary */}
        <div className="border-b border-hairline px-6 py-5">
          <div className="mb-4 flex items-center gap-3">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-full text-title-md font-semibold text-white"
              style={{ backgroundColor: avatarColor(patientName) }}
            >
              {initials(patientName)}
            </span>
            <div>
              <p className="text-title-md text-ink">{patientName}</p>
              <p className="text-body-sm text-muted">{appointment.canal.toUpperCase()}</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg bg-surface-soft px-4 py-4">
            <StatusBadge status={appointment.status} size="lg" pulse={!!appointment.confirmation_sent_at} />
            <p className="text-center text-body-sm text-muted">
              {t(`statusExp.${appointment.status}` as TKey)}
            </p>
          </div>
        </div>

        {/* Communication timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <p className="mb-4 text-caption uppercase text-muted">{t("drawer.communication")}</p>
          <ol className="relative flex flex-col gap-5 border-s-2 border-surface-card ps-5">
            {events.map((ev) => (
              <li key={ev.id} className="relative">
                <span
                  className={cn(
                    "absolute -start-[26px] top-1 size-2.5 rounded-full ring-4 ring-canvas",
                    eventDot(ev)
                  )}
                  aria-hidden
                />
                <p className="text-body-sm text-muted">{formatDateTime(ev.occurred_at)}</p>
                <p className="text-body-md text-body">{eventContent(ev)}</p>
                {ev.patient_message_excerpt ? (
                  <div
                    className={cn(
                      "mt-2 w-fit max-w-[85%] rounded-lg rounded-ss-none bg-surface-card px-4 py-2.5 text-body-sm text-ink",
                      hasArabic(ev.patient_message_excerpt) && "font-arabic"
                    )}
                  >
                    {ev.patient_message_excerpt}
                  </div>
                ) : null}
              </li>
            ))}
            {events.length === 0 ? (
              <li className="text-body-sm text-muted">{t("appt.noCommunication")}</li>
            ) : null}
          </ol>

          {appointment.internal_notes ? (
            <div className="mt-6 rounded-lg border border-hairline bg-surface-soft px-4 py-3">
              <p className="text-caption uppercase text-muted">{t("drawer.internalNotes")}</p>
              <p className="mt-1 text-body-sm text-body">{appointment.internal_notes}</p>
            </div>
          ) : null}
        </div>

        {/* Fixed action footer for NEED_CALL + Admin */}
        {canAction ? (
          <div className="flex gap-3 border-t border-hairline bg-canvas px-6 py-4">
            <Button
              variant="success"
              size="lg"
              className="flex-1"
              onClick={handleConfirm}
            >
              <Check className="size-4" />
              {t("drawer.confirmAppointment")}
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={handleCancel}
            >
              <X className="size-4" />
              {t("drawer.cancelAppointment")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}