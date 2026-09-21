"use client";

import * as React from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Eye,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { cn, avatarColor, initials } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { formatApptTime } from "@/lib/appt-time";
import { useCabinetRealtime, useRealtimeEvent } from "@/lib/realtime";
import type { TKey } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState } from "@/components/app/empty-state";
import { AddAppointmentDialog } from "@/components/app/add-appointment-dialog";
import type { Appointment, AppointmentStatus } from "@/lib/types";

export type Filter =
  | "ALL"
  | "TODAY"
  | "TOMORROW"
  | "YESTERDAY"
  | "NEED_CALL"
  | "CONFIRMED"
  | "PENDING"
  | "CANCELLED";

const CURRENT_FILTERS: { key: Filter; labelKey: TKey }[] = [
  { key: "ALL", labelKey: "filter.ALL" },
  { key: "TODAY", labelKey: "filter.TODAY" },
  { key: "TOMORROW", labelKey: "filter.TOMORROW" },
  { key: "NEED_CALL", labelKey: "filter.NEED_CALL" },
  { key: "CONFIRMED", labelKey: "filter.CONFIRMED" },
  { key: "PENDING", labelKey: "filter.PENDING" },
  { key: "CANCELLED", labelKey: "filter.CANCELLED" },
];

const HISTORY_FILTERS: { key: Filter; labelKey: TKey }[] = [
  { key: "ALL", labelKey: "filter.ALL" },
  { key: "YESTERDAY", labelKey: "filter.YESTERDAY" },
  { key: "NEED_CALL", labelKey: "filter.NEED_CALL" },
  { key: "CONFIRMED", labelKey: "filter.CONFIRMED" },
  { key: "PENDING", labelKey: "filter.PENDING" },
  { key: "CANCELLED", labelKey: "filter.CANCELLED" },
];

const PAGE_SIZE = 8;

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

function formatTimeForDisplay(dateStr: string): string {
  try {
    return formatApptTime(dateStr);
  } catch {
    return "";
  }
}

function getDayKey(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

function todayKeyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

type TimeWindow = { from?: string; to?: string };

/**
 * Fenêtre temporelle serveur reflétant le filtre actif. La convention
 * MAW3IDI stocke l'heure civile comme UTC : les bornes sont donc calculées
 * en UTC pour rester cohérentes avec date_rendez_vous.
 */
function buildTimeWindow(
  filter: Filter,
  dateValue: string,
  mode: "current" | "history"
): TimeWindow {
  const m = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const key = `${m[3]}-${m[2]}-${m[1]}`;
    return { from: `${key}T00:00:00Z`, to: `${addDaysISO(key, 1)}T00:00:00Z` };
  }
  if (filter === "TODAY") {
    const k = todayKeyISO();
    return { from: `${k}T00:00:00Z`, to: `${addDaysISO(k, 1)}T00:00:00Z` };
  }
  if (filter === "TOMORROW") {
    const k = addDaysISO(todayKeyISO(), 1);
    return { from: `${k}T00:00:00Z`, to: `${addDaysISO(k, 1)}T00:00:00Z` };
  }
  if (filter === "YESTERDAY") {
    const k = addDaysISO(todayKeyISO(), -1);
    return { from: `${k}T00:00:00Z`, to: `${addDaysISO(k, 1)}T00:00:00Z` };
  }
  const cutoff = new Date(Date.now() - 10 * 3600 * 1000).toISOString();
  return mode === "history" ? { to: cutoff } : { from: cutoff };
}

function mapFilterToBackendStatus(filter: Filter): string | null {
  switch (filter) {
    case "NEED_CALL": return "need_call";
    case "CONFIRMED": return "confirme";
    case "PENDING": return "reserve,confirmation_envoyee";
    case "CANCELLED": return "annule";
    case "TODAY": // handled separately
    case "TOMORROW":
    case "YESTERDAY": // handled separately
    default: return null;
  }
}

export function AppointmentsTable({
  initialLoading = false,
  compact = false,
  initialFilter = "ALL",
  mode = "current",
}: {
  initialLoading?: boolean;
  compact?: boolean;
  initialFilter?: Filter;
  mode?: "current" | "history";
}) {
  const { appointments, openDrawer, confirmAppointment, cancelAppointment, t, fetchAppointments, loading: contextLoading, syncAppointmentLocally } =
    useApp();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(initialLoading);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>(initialFilter);
  const [page, setPage] = React.useState(1);
  const [addOpen, setAddOpen] = React.useState(false);
  const [serverPage, setServerPage] = React.useState(1);
  const [serverPageCount, setServerPageCount] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  // Saisie sans "/" (les "/" s'insèrent automatiquement). Tant que la date
  // n'est pas complète (8 chiffres) on ne filtre pas ; dès la complétion, la
  // filtration se déclenche (dateFilter devient non vide).
  const [dateDraft, setDateDraft] = React.useState("");
  const dateFilter = /^\d{2}\/\d{2}\/\d{4}$/.test(dateDraft) ? dateDraft : "";

  const FILTERS = mode === "history" ? HISTORY_FILTERS : CURRENT_FILTERS;

  React.useEffect(() => {
    if (!initialLoading) return;
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, [initialLoading]);

  const loadServerList = React.useCallback(
    (statuses: string | null, window_?: TimeWindow) => {
      fetchAppointments({
        page: 1,
        statuses: statuses || undefined,
        date_from: window_?.from,
        date_to: window_?.to,
        sort: mode === "history" ? "date_desc" : "date_asc",
      }).then((res: any) => {
        if (res) {
          setServerPageCount(res.total ? Math.max(1, Math.ceil(res.total / PAGE_SIZE)) : 1);
          setTotalCount(res.total ?? 0);
        }
      });
    },
    [fetchAppointments, mode]
  );

  // Filtres : immédiat. Recherche texte : debounce 300ms (doc §9).
  React.useEffect(() => {
    setServerPage(1);
    loadServerList(mapFilterToBackendStatus(filter), buildTimeWindow(filter, dateFilter, mode));
  }, [filter, dateFilter, mode, loadServerList]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setServerPage(1);
      loadServerList(mapFilterToBackendStatus(filter), buildTimeWindow(filter, dateFilter, mode));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, filter, dateFilter, mode, loadServerList]);

  // Push temps réel (doc §2) : refetch sur événement, jamais de polling.
  // Push temps réel (doc §2) : update direct en state, pas de polling.
  useCabinetRealtime();
  const filterRef = React.useRef(filter);
  filterRef.current = filter;
  const dateFilterRef = React.useRef(dateFilter);
  dateFilterRef.current = dateFilter;
  const modeRef = React.useRef(mode);
  modeRef.current = mode;
  useRealtimeEvent("appointment_updated", (event: any) => {
    if (event.data) {
      syncAppointmentLocally(event.data);
    } else {
      loadServerList(
        mapFilterToBackendStatus(filterRef.current),
        buildTimeWindow(filterRef.current, dateFilterRef.current, modeRef.current)
      );
    }
  });

  // Legacy fallback if backend still sends appointments_changed
  useRealtimeEvent("appointments_changed", () => {
    loadServerList(
      mapFilterToBackendStatus(filterRef.current),
      buildTimeWindow(filterRef.current, dateFilterRef.current, modeRef.current)
    );
  });

  const isLoading = loading || contextLoading;

  const filtered = React.useMemo(() => {
    const cutoff = Date.now() - 10 * 3600 * 1000;
    let list = appointments.filter((a) => {
      const time = new Date(a.date_rendez_vous).getTime();
      if (dateFilter) {
        return formatDateForDisplay(a.date_rendez_vous) === dateFilter;
      }
      if (filter === "TODAY") return formatDateForDisplay(a.date_rendez_vous) === getDayKey(0);
      if (filter === "TOMORROW") return formatDateForDisplay(a.date_rendez_vous) === getDayKey(1);
      if (filter === "YESTERDAY") return formatDateForDisplay(a.date_rendez_vous) === getDayKey(-1);
      if (Number.isNaN(time)) return true;
      return mode === "current" ? time > cutoff : time < cutoff;
    });
    if (filter === "NEED_CALL") list = list.filter((a) => a.status === "need_call");
    if (filter === "CONFIRMED") list = list.filter((a) => a.status === "confirme");
    if (filter === "PENDING")
      list = list.filter(
        (a) => a.status === "reserve" || a.status === "confirmation_envoyee"
      );
    if (filter === "CANCELLED") list = list.filter((a) => a.status === "annule");
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.patient?.patient_name?.toLowerCase().includes(q) ||
          a.patient?.patient_phone?.includes(q) ||
          (a.canal ?? "").toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) =>
      mode === "history"
        ? `${b.date_rendez_vous}`.localeCompare(`${a.date_rendez_vous}`)
        : `${a.date_rendez_vous}`.localeCompare(`${b.date_rendez_vous}`)
    );
  }, [appointments, filter, query, dateFilter, mode]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [filter, query, dateFilter, mode]);

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    let value = digits;
    if (digits.length > 4) value = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setDateDraft(value);
  };

  const handleConfirm = async (e: React.MouseEvent, a: Appointment) => {
    e.stopPropagation();
    try {
      await confirmAppointment(a.id);
      toast(t("toast.confirmed", { name: a.patient?.patient_name ?? "Patient" }), "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (e: React.MouseEvent, a: Appointment) => {
    e.stopPropagation();
    try {
      await cancelAppointment(a.id);
      toast(t("toast.cancelled", { name: a.patient?.patient_name ?? "Patient" }), "danger");
    } catch (err) {
      console.error(err);
    }
  };

  const canAct = !compact && mode === "current";

  return (
    <div>
      {/* Add appointment */}
      {!compact && mode === "current" ? (
        <div className="mb-3 flex justify-end">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            {t("appt.addPatient")}
          </Button>
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm text-muted">
          {t("table.found", { n: totalCount > 0 ? totalCount : filtered.length })}
        </p>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("table.searchPatient")}
              className="h-10 rounded-full ps-9 pe-9"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute end-2.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-card"
                aria-label={t("table.clearSearch")}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          {/* Filtre par date : saisie libre des chiffres de gauche à droite,
              "/" insérés automatiquement, filtration dès 8 chiffres saisis. */}
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={dateDraft}
              onChange={handleDateInput}
              inputMode="numeric"
              maxLength={10}
              placeholder={t("table.filterByDate")}
              aria-label={t("table.filterByDate")}
              className="h-10 w-40 rounded-full ps-9 pe-9 text-center font-mono text-[13px]"
            />
            {dateDraft ? (
              <button
                type="button"
                onClick={() => setDateDraft("")}
                aria-label={t("table.clearDateFilter")}
                className="absolute end-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-card"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          <Button variant="secondary" size="icon" aria-label={t("table.advancedFilters")}>
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/15",
              filter === f.key
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-hairline bg-canvas text-body hover:border-brand-primary hover:text-brand-primary"
            )}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-canvas">
          <EmptyState />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="text-start">
              <thead>
                <tr className="border-b border-hairline">
                  <TableHeadTh>{t("table.patient")}</TableHeadTh>
                  <TableHeadTh>{t("table.appointmentTime")}</TableHeadTh>
                  <TableHeadTh>{t("table.channel")}</TableHeadTh>
                  <TableHeadTh>{t("table.status")}</TableHeadTh>
                  <TableHeadTh>{t("table.lastInteraction")}</TableHeadTh>
                  <TableHeadTh>{t("table.adminAction")}</TableHeadTh>
                  <TableHeadTh>
                    <span title={t("table.dob")}>{t("table.dob")}</span>
                  </TableHeadTh>
                  <TableHeadTh>{t("table.confirmationSentAt")}</TableHeadTh>
                  <TableHeadTh>{t("table.cancelledAt")}</TableHeadTh>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((a) => (
                  <tr
                    key={`${a.id}-${a.status}-${a.updatedAt ?? 0}`}
                    onClick={() => openDrawer(a.id)}
                    className={cn(
                      "cursor-pointer border-b border-hairline transition-colors duration-150 last:border-0 hover:bg-surface-soft",
                      a.updatedAt && "animate-flash-blue"
                    )}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                          style={{ backgroundColor: avatarColor(a.patient?.patient_name ?? a.patient_id) }}
                        >
                          {initials(a.patient?.patient_name ?? a.patient_id)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {a.patient?.patient_name ?? "Patient"}
                          </p>
                          <p className="flex items-center gap-1 text-[12px] text-muted">
                            <Phone className="size-3.5 shrink-0" />
                            <span className="truncate">{a.patient?.patient_phone ?? "—"}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {formatDateForDisplay(a.date_rendez_vous)}
                      </p>
                      <p className="truncate text-[13px] text-muted">
                        {formatTimeForDisplay(a.date_rendez_vous)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex max-w-full items-center rounded-full bg-surface-card px-2.5 py-1 text-[12px] font-medium text-body">
                        <span className="truncate">{a.canal ?? "—"}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={a.status} size="md" pulse={!!a.updatedAt} />
                    </td>
                    <td className="px-3 py-3">
                      <p className="truncate text-[13px] text-body">{a.lastInteractionLabel ?? "—"}</p>
                    </td>
                    <td className="px-3 py-3">
                      {canAct && a.status === "need_call" ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="success"
                            size="sm"
                            className="px-2 text-[12px]"
                            onClick={(e) => handleConfirm(e, a)}
                          >
                            <Check className="size-3.5" />
                            {t("table.confirm")}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="px-2 text-[12px]"
                            onClick={(e) => handleCancel(e, a)}
                          >
                            <X className="size-3.5" />
                            {t("table.cancel")}
                          </Button>
                        </div>
                      ) : a.status === "need_call" ? (
                        <span className="block truncate text-[13px] font-medium text-status-need-call">
                          {t("table.needCallAction")}
                        </span>
                      ) : (
                        <Dash />
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[13px] text-body">
                      {a.patient?.date_de_naissance ? formatDateForDisplay(a.patient.date_de_naissance) : <Dash />}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[13px] text-body">
                      {a.confirmation_sent_at ? formatDateForDisplay(a.confirmation_sent_at) : <Dash />}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[13px] text-body">
                      {a.cancelled_at ? formatDateForDisplay(a.cancelled_at) : <Dash />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="flex flex-col gap-3 p-3 md:hidden">
            {pageRows.map((a) => (
              <div
                key={`${a.id}-${a.status}-${a.updatedAt ?? 0}`}
                onClick={() => openDrawer(a.id)}
                className={cn(
                  "cursor-pointer rounded-lg border border-hairline p-4 transition-colors duration-150 hover:bg-surface-soft",
                  a.updatedAt && "animate-flash-blue"
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-full text-title-sm font-semibold text-white"
                      style={{ backgroundColor: avatarColor(a.patient?.patient_name ?? a.patient_id) }}
                    >
                      {initials(a.patient?.patient_name ?? a.patient_id)}
                    </span>
                    <div>
                      <p className="text-title-sm text-ink">{a.patient?.patient_name ?? "Patient"}</p>
                      <p className="text-body-sm text-muted">{a.type ?? "—"}</p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} size="sm" pulse={!!a.updatedAt} />
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    {formatDateForDisplay(a.date_rendez_vous)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {formatTimeForDisplay(a.date_rendez_vous)}
                  </span>
                </div>
                {canAct && a.status === "need_call" ? (
                  <div className="flex gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => handleConfirm(e, a)}
                    >
                      <Check className="size-3.5" />
                      {t("table.confirm")}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => handleCancel(e, a)}
                    >
                      <X className="size-3.5" />
                      {t("table.cancel")}
                    </Button>
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 text-body-sm text-muted">
                    <Eye className="size-3.5" />
                    {t("table.viewDetail")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="mt-5 flex items-center justify-between">
        <p className="hidden text-body-sm text-muted sm:block">
          {t("table.page", { n: safePage, total: pageCount })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="icon-outline"
            disabled={safePage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label={t("table.prevPage")}
          >
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </Button>
          <span className="min-w-8 text-center text-body-sm font-medium text-ink">
            {safePage}
          </span>
          <Button
            variant="icon-outline"
            disabled={safePage === pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            aria-label={t("table.nextPage")}
          >
            <ChevronRight className="size-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>

      <AddAppointmentDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function Dash() {
  return <span className="text-muted">—</span>;
}

function TableHeadTh({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-3 text-caption uppercase font-semibold text-muted",
        className
      )}
    >
      {children}
    </th>
  );
}