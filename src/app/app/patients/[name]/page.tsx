"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Phone } from "lucide-react";

import { cn, avatarColor, initials } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { derivePatients } from "@/lib/patients";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge } from "@/components/app/status-badge";

export default function PatientDetailPage() {
  const params = useParams<{ name: string }>();
  const { appointments, openDrawer, t } = useApp();

  const decoded = React.useMemo(() => {
    try {
      return decodeURIComponent(params.name ?? "");
    } catch {
      return params.name ?? "";
    }
  }, [params.name]);

  const patient = React.useMemo(
    () => derivePatients(appointments).find((p) => p.name === decoded) ?? null,
    [appointments, decoded]
  );

  const list = React.useMemo(
    () =>
      appointments
        .filter((a) => a.patientName === decoded)
        .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)),
    [appointments, decoded]
  );

  if (!patient) {
    return (
      <div className="rounded-xl border border-hairline bg-canvas">
        <EmptyState title={t("patients.notFound")} />
        <div className="pb-8 text-center">
          <Link
            href="/app/patients"
            className="text-body-sm font-medium text-brand-primary hover:text-brand-primary-active"
          >
            ← {t("patients.back")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/app/patients"
        className="mb-5 inline-flex items-center gap-1.5 text-body-sm font-medium text-muted transition-colors duration-150 hover:text-brand-primary"
      >
        <ArrowLeft className="size-3.5 rtl:rotate-180" />
        {t("patients.back")}
      </Link>

      {/* Patient card */}
      <div className="mb-6 rounded-xl border border-hairline bg-canvas px-6 py-5 shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-full text-title-md font-semibold text-white"
            style={{ backgroundColor: avatarColor(patient.name) }}
          >
            {initials(patient.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-title-lg text-ink">{patient.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted">
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5" />
                {patient.phone}
              </span>
              {patient.dateOfBirth ? (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {patient.dateOfBirth}
                </span>
              ) : null}
            </div>
          </div>
          <span className="rounded-full bg-surface-card px-3 py-1 text-body-sm font-medium text-body">
            {t("patients.appointmentCount", { n: patient.appointmentCount })}
          </span>
        </div>
      </div>

      {/* Appointments */}
      <h2 className="mb-3 text-caption uppercase text-muted">
        {t("patients.viewAppointments")}
      </h2>

      {list.length === 0 ? (
        <div className="rounded-xl border border-hairline bg-canvas">
          <EmptyState />
        </div>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-hairline bg-canvas shadow-card">
          {list.map((a, i) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => openDrawer(a.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-4 border-b border-hairline px-5 py-3.5 text-start transition-colors last:border-b-0 hover:bg-surface-soft",
                  i === 0 && "bg-surface-soft"
                )}
              >
                <span className="min-w-[64px] font-mono text-[15px] font-semibold text-ink">
                  {a.time}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">
                    {a.type}
                  </span>
                  <span className="flex items-center gap-1.5 text-[12px] text-muted">
                    <CalendarDays className="size-3.5" />
                    {a.date}
                    <Clock className="ms-1 size-3.5" />
                    {a.time}
                  </span>
                </span>
                <StatusBadge status={a.status} size="md" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
