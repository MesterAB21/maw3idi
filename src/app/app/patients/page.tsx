"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarDays, Search, X } from "lucide-react";

import { useApp } from "@/lib/app-context";
import { avatarColor, initials } from "@/lib/utils";
import { derivePatients } from "@/lib/patients";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";

export default function PatientsPage() {
  const { appointments, t } = useApp();
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const patients = React.useMemo(() => derivePatients(appointments), [appointments]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
    );
  }, [patients, query]);

  const open = (name: string) =>
    router.push(`/app/patients/${encodeURIComponent(name)}`);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm text-muted">{t("patients.count", { n: filtered.length })}</p>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("patients.search")}
            className="h-10 rounded-full ps-9 pe-9"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute end-2.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-card"
              aria-label={t("patients.clearSearch")}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-canvas">
          <EmptyState title={t("patients.empty")} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="text-start">
              <thead>
                <tr className="border-b border-hairline">
                  <Th>{t("patients.patient")}</Th>
                  <Th>{t("patients.phone")}</Th>
                  <Th>{t("patients.dob")}</Th>
                  <Th>{t("patients.appointments")}</Th>
                  <Th>{t("patients.lastVisit")}</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.name}
                    onClick={() => open(p.name)}
                    className="cursor-pointer border-b border-hairline transition-colors duration-150 last:border-0 hover:bg-surface-soft"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                          style={{ backgroundColor: avatarColor(p.name) }}
                        >
                          {initials(p.name)}
                        </span>
                        <span className="truncate text-sm font-semibold text-ink">
                          {p.name}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[13px] text-body">
                      {p.phone}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[13px] text-body">
                      {p.dateOfBirth ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center rounded-full bg-surface-card px-2.5 py-1 text-[12px] font-medium text-body">
                        {p.appointmentCount}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[13px] text-body">
                      {p.lastAppointment}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 p-3 md:hidden">
            {filtered.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => open(p.name)}
                className="cursor-pointer rounded-lg border border-hairline p-4 text-start transition-colors duration-150 hover:bg-surface-soft"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-title-sm font-semibold text-white"
                    style={{ backgroundColor: avatarColor(p.name) }}
                  >
                    {initials(p.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-title-sm text-ink">{p.name}</span>
                    <span className="block text-body-sm text-muted">{p.phone}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    {p.dateOfBirth ?? "—"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-3.5" />
                    {t("patients.appointmentCount", { n: p.appointmentCount })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-3 py-3 text-start text-caption font-semibold uppercase text-muted">
      {children}
    </th>
  );
}
