"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Phone,
  X,
} from "lucide-react";

import { cn, avatarColor, initials } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { TKey } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState } from "@/components/app/empty-state";
import type { Appointment, AppointmentEvent } from "@/lib/types";

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
  return (
    ev.patient_message_excerpt ||
    ev.event_type.replace(/_/g, " ")
  );
}

const hasArabic = (s: string) => /[\u0600-\u06FF]/.test(s);

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

function lastInteractionHoursAgo(appt: Appointment): number | null {
  const evs = appt.events ?? [];
  if (evs.length === 0) return null;
  const last = new Date(evs[evs.length - 1].occurred_at).getTime();
  if (isNaN(last)) return null;
  return (Date.now() - last) / 3600000;
}

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const { appointments, confirmAppointment, cancelAppointment, t } = useApp();
  const { toast } = useToast();

  const appointment = appointments.find((a) => a.id === params.id) ?? null;

  if (!appointment) {
    return (
      <div className="rounded-xl border border-hairline bg-canvas">
        <EmptyState title={t("detail.notFound", { id: params.id ?? "" })} />
        <div className="pb-8 text-center">
          <Link
            href="/app/appointments"
            className="text-body-sm font-medium text-brand-primary hover:text-brand-primary-active"
          >
            ← {t("detail.backToList")}
          </Link>
        </div>
      </div>
    );
  }

  const patientName = appointment.patient?.patient_name ?? "Patient";
  const patientPhone = appointment.patient?.patient_phone ?? "—";
  const canAction = appointment.status === "need_call";
  const events = appointment.events ?? [];
  const hoursAgo = lastInteractionHoursAgo(appointment);

  const handleConfirm = () => {
    confirmAppointment(appointment.id);
    toast(t("toast.confirmed", { name: patientName }), "success");
  };
  const handleCancel = () => {
    cancelAppointment(appointment.id);
    toast(t("toast.cancelled", { name: patientName }), "danger");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/app/appointments"
        className="mb-5 inline-flex items-center gap-1.5 text-body-sm font-medium text-muted transition-colors duration-150 hover:text-brand-primary"
      >
        <ArrowLeft className="size-3.5 rtl:rotate-180" />
        {t("detail.backToList")}
      </Link>

      <div className="rounded-xl border border-hairline bg-canvas shadow-card">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline px-6 py-5">
          <div>
            <h1 className="text-title-lg text-ink">
              {t("drawer.title", { id: appointment.id })}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted">
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
          <StatusBadge status={appointment.status} size="md" pulse={!!appointment.confirmation_sent_at} />
        </div>

        {/* Patient */}
        <div className="flex items-center gap-4 border-b border-hairline px-6 py-5">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-full text-title-md font-semibold text-white"
            style={{ backgroundColor: avatarColor(patientName) }}
          >
            {initials(patientName)}
          </span>
          <div>
            <p className="text-title-md text-ink">{patientName}</p>
            <p className="text-body-sm text-muted">
              {appointment.canal.toUpperCase()}
              {hoursAgo !== null ? ` · ${t("appt.lastInteractionAt", { ago: relative(hoursAgo, t) })}` : ""}
            </p>
          </div>
        </div>

        {/* Status explanation */}
        <div className="border-b border-hairline bg-surface-soft px-6 py-4">
          <p className="text-body-sm text-muted">
            {t(`statusExp.${appointment.status}` as TKey)}
          </p>
        </div>

        {/* Timeline */}
        <div className="px-6 py-6">
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

        {/* Actions */}
        {canAction ? (
          <div className="flex flex-col gap-3 border-t border-hairline px-6 py-4 sm:flex-row">
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

function relative(
  hoursAgo: number,
  t: (key: TKey, vars?: Record<string, string | number>) => string
) {
  if (hoursAgo < 1)
    return t("time.minAgoLower", { n: Math.max(1, Math.round(hoursAgo * 60)) });
  if (hoursAgo < 24) return t("time.hoursAgoLower", { n: Math.round(hoursAgo) });
  return t("time.daysAgoLower", { n: Math.round(hoursAgo / 24) });
}