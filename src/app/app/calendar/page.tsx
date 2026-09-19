"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import { useCabinetRealtime, useRealtimeEvent } from "@/lib/realtime";
import type { TKey } from "@/lib/i18n";
import { weekdaysLong, weekdaysShort, weeksShortMondayFirst, monthsLong } from "@/lib/i18n";
import { CalendarWidget } from "@/components/app/calendar-widget";
import { AddAppointmentDialog } from "@/components/app/add-appointment-dialog";
import { StatusBadge } from "@/components/app/status-badge";
import { avatarColor, initials } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/lib/types";

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  reserve: "#D97706",
  confirmation_envoyee: "#2563EB",
  confirme: "#16A34A",
  need_call: "#EA580C",
  annule: "#DC2626",
  termine: "#475569",
  absent: "#6B7280",
};

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const weekDates = (d: Date) => {
  const monday = addDays(d, -((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};
const monthGrid = (d: Date) => {
  const first = monthStart(d);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < (first.getDay() + 6) % 7; i++) cells.push(null);
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= days; i++) cells.push(new Date(d.getFullYear(), d.getMonth(), i));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const sortByTime = (list: Appointment[]) =>
  [...list].sort((a, b) => a.date_rendez_vous.localeCompare(b.date_rendez_vous));

type ViewMode = "DAY" | "WEEK" | "MONTH";

const VIEW_OPTIONS: { value: ViewMode; labelKey: TKey }[] = [
  { value: "DAY", labelKey: "cal.day" },
  { value: "WEEK", labelKey: "cal.week" },
  { value: "MONTH", labelKey: "cal.month" },
];

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

function isToday(d: Date): boolean {
  const now = new Date();
  return toKey(d) === toKey(now);
}

export interface GoogleBlock {
  start: string;
  end: string;
  title: string;
}

export default function CalendarPage() {
  const { openDrawer, lang, t, fetchAvailableSlots, fetchCalendar } = useApp();

  const [view, setView] = React.useState<ViewMode>("WEEK");
  const [anchor, setAnchor] = React.useState(new Date());
  const [addOpen, setAddOpen] = React.useState(false);
  const [addDate, setAddDate] = React.useState<Date | null>(null);
  const [addTime, setAddTime] = React.useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = React.useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [rangeAppointments, setRangeAppointments] = React.useState<Appointment[]>([]);
  const [googleBlocks, setGoogleBlocks] = React.useState<GoogleBlock[]>([]);

  // Visible range for the current view (DB appointments + Google busy blocks).
  const visibleRange = React.useMemo(() => {
    if (view === "DAY") {
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
      return { start, end: addDays(start, 1) };
    }
    if (view === "WEEK") {
      const start = weekDates(anchor)[0];
      return { start, end: addDays(start, 7) };
    }
    const start = monthStart(anchor);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    return { start, end };
  }, [view, anchor]);

  const byKey = React.useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of rangeAppointments) {
      const key = formatDateForDisplay(a.date_rendez_vous);
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [rangeAppointments]);

  const googleByKey = React.useMemo(() => {
    const map = new Map<string, GoogleBlock[]>();
    for (const b of googleBlocks) {
      const key = formatDateForDisplay(b.start);
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    map.forEach((arr) => {
      arr.sort((x, y) => x.start.localeCompare(y.start));
    });
    return map;
  }, [googleBlocks]);

  const dayList = sortByTime(byKey.get(toKey(anchor)) ?? []);

  const rangeLabel =
    view === "DAY"
      ? `${cap(weekdaysLong[lang][anchor.getDay()])} ${anchor.getDate()} ${monthsLong[lang][anchor.getMonth()]}`
      : view === "WEEK"
        ? t("cal.weekOf", {
            d: weekDates(anchor)[0].getDate(),
            month: monthsLong[lang][weekDates(anchor)[0].getMonth()],
          })
        : `${cap(monthsLong[lang][anchor.getMonth()])} ${anchor.getFullYear()}`;

  const go = (dir: 1 | -1) => {
    const next = new Date(anchor);
    if (view === "WEEK") next.setDate(next.getDate() + dir * 7);
    else if (view === "MONTH") next.setMonth(next.getMonth() + dir);
    else next.setDate(next.getDate() + dir);
    setAnchor(next);
  };

  const selectDay = async (d: Date) => {
    setAnchor(d);
    setView("DAY");
    await loadSlots(d);
  };

  const loadSlots = async (d: Date) => {
    setSlotsLoading(true);
    try {
      // Backend expects YYYY-MM-DD (DD/MM/YYYY yields 422 and no slots).
      const res = await fetchAvailableSlots(toISODate(d));
      setAvailableSlots(res.slots);
    } catch (err) {
      console.error(err);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  // Appointments of the visible range (the shared list is paginated, so the
  // calendar fetches its own window) + merged Google busy blocks.
  const loadRange = React.useCallback(async (start: Date, end: Date) => {
    try {
      const [list, merged] = await Promise.all([
        api.listAppointments({
          date_from: start.toISOString(),
          date_to: end.toISOString(),
          sort: "date_asc",
          page: 1,
          page_size: 100,
        }),
        fetchCalendar(start.toISOString(), end.toISOString()),
      ]);
      setRangeAppointments(list.data);
      setGoogleBlocks(
        (merged.data ?? [])
          .filter((e) => e.source === "google")
          .map((e) => ({ start: e.start, end: e.end, title: e.title }))
      );
    } catch (err) {
      console.error(err);
      setRangeAppointments([]);
      setGoogleBlocks([]);
    }
  }, [fetchCalendar]);

  React.useEffect(() => {
    loadSlots(anchor);
  }, [anchor, view]);

  React.useEffect(() => {
    loadRange(visibleRange.start, visibleRange.end);
  }, [visibleRange, loadRange]);

  // Push temps réel (doc §2) : la plage et les créneaux se rafraîchissent
  // sur événement, jamais par polling.
  useCabinetRealtime();
  const rangeRef = React.useRef(visibleRange);
  rangeRef.current = visibleRange;
  const anchorRef = React.useRef(anchor);
  anchorRef.current = anchor;
  useRealtimeEvent("appointments_changed", () => {
    loadRange(rangeRef.current.start, rangeRef.current.end);
  });
  useRealtimeEvent("availability_changed", () => {
    loadSlots(anchorRef.current);
    loadRange(rangeRef.current.start, rangeRef.current.end);
  });

  const openAddAt = (slot: string) => {
    setAddDate(anchor);
    setAddTime(slot);
    setAddOpen(true);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex h-8 items-center overflow-hidden rounded-md border border-hairline bg-canvas">
          <NavButton label={t("cal.prevPeriod")} onClick={() => go(-1)}>
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </NavButton>
          <button
            type="button"
            onClick={() => {
              setAnchor(new Date());
              setView("DAY");
            }}
            className="h-full cursor-pointer border-x border-hairline px-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft"
          >
            {t("cal.today")}
          </button>
          <NavButton label={t("cal.nextPeriod")} onClick={() => go(1)}>
            <ChevronRight className="size-4 rtl:rotate-180" />
          </NavButton>
        </div>
        <p className="whitespace-nowrap text-[13px] font-semibold text-ink">
          {rangeLabel}
        </p>

        <div className="ms-auto inline-flex items-center rounded-md border border-hairline bg-canvas p-0.5">
          {VIEW_OPTIONS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setView(v.value)}
              className={cn(
                "h-7 cursor-pointer rounded px-2.5 text-[12px] font-medium transition-colors duration-150",
                view === v.value
                  ? "bg-surface-card text-ink shadow-sm ring-1 ring-hairline"
                  : "text-muted hover:text-ink"
              )}
            >
              {t(v.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Views */}
        <div>
          {view === "MONTH" ? (
            <MonthView anchor={anchor} byKey={byKey} googleByKey={googleByKey} onSelectDay={selectDay} />
          ) : view === "WEEK" ? (
            <WeekView byKey={byKey} googleByKey={googleByKey} onSelectDay={selectDay} />
          ) : (
            <DayView list={dayList} google={googleByKey.get(toKey(anchor)) ?? []} onOpen={openDrawer} />
          )}
        </div>

        {/* Sidebar: date & slot picker + legend */}
        <aside className="space-y-6">
          <CalendarWidget
            initialDate={anchor}
            interactive
            compact
            onSelectDate={selectDay}
            onSelectTime={openAddAt}
            timeSlots={availableSlots}
            slotsLoading={slotsLoading}
            className="w-full"
          />
          <div className="rounded-2xl border border-hairline bg-canvas p-5 shadow-card">
            <p className="mb-3 text-caption uppercase text-muted">{t("cal.legend")}</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {(Object.keys(STATUS_COLOR) as AppointmentStatus[]).map((s) => (
                <li key={s} className="flex items-center gap-2 text-[12px] text-body">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[s] }}
                  />
                  <StatusLabelShort status={s} />
                </li>
              ))}
              <li className="flex items-center gap-2 text-[12px] text-body">
                <span className="size-2 shrink-0 rounded-full bg-[#6B7280]" />
                {t("cal.googleBusy")}
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <AddAppointmentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        initialDate={addDate}
        initialTime={addTime}
      />
    </div>
  );
}

function NavButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-8 cursor-pointer items-center justify-center text-muted transition-colors hover:bg-surface-soft hover:text-ink"
    >
      {children}
    </button>
  );
}

function MonthView({
  anchor,
  byKey,
  googleByKey,
  onSelectDay,
}: {
  anchor: Date;
  byKey: Map<string, Appointment[]>;
  googleByKey: Map<string, GoogleBlock[]>;
  onSelectDay: (d: Date) => void;
}) {
  const cells = React.useMemo(() => monthGrid(anchor), [anchor]);
  const { lang, t } = useApp();
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
      <div className="grid grid-cols-7 border-b border-hairline bg-surface-soft/40">
        {weeksShortMondayFirst[lang].map((w, i) => (
          <div
            key={`${w}-${i}`}
            className={cn(
              "py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted",
              i < 6 && "border-e border-hairline"
            )}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) {
            return (
              <div
                key={`blank-${i}`}
                className={cn(
                  "min-h-[5rem] border-b border-e border-hairline bg-surface-soft/20",
                  i % 7 === 6 && "border-e-0"
                )}
              />
            );
          }
          const items = sortByTime(byKey.get(toKey(d)) ?? []);
          const busy = googleByKey.get(toKey(d)) ?? [];
          const today = isToday(d);
          return (
            <div
              key={toKey(d)}
              onClick={() => onSelectDay(d)}
              className={cn(
                "group min-h-[5rem] cursor-pointer border-b border-e border-hairline p-1 transition-colors hover:bg-surface-soft/40",
                i % 7 === 6 && "border-e-0",
                today && "bg-brand-primary/[0.04]"
              )}
            >
              <span
                className={cn(
                  "mb-1 flex size-5 items-center justify-center rounded-full text-[11px]",
                  today
                    ? "bg-brand-primary font-semibold text-white"
                    : "text-ink group-hover:bg-surface-soft"
                )}
              >
                {d.getDate()}
              </span>
              <div className="flex flex-col gap-0.5">
                {items.slice(0, 3).map((a) => (
                  <span
                    key={a.id}
                    className="flex items-center gap-1 overflow-hidden rounded bg-brand-primary/[0.06] px-1 py-[2px] text-[10px] leading-tight text-ink"
                  >
                    <span
                      className="size-1 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLOR[a.status] }}
                    />
                    <span className="truncate">{formatTimeForDisplay(a.date_rendez_vous)}</span>
                    <span className="ms-auto truncate text-[9px] text-muted">
                      {a.type ?? "—"}
                    </span>
                  </span>
                ))}
                {items.length > 3 ? (
                  <span className="px-1 text-[10px] text-muted">
                    {t("cal.more", { n: items.length - 3 })}
                  </span>
                ) : null}
                {busy.slice(0, 2).map((b, bi) => (
                  <span
                    key={`g${bi}`}
                    className="flex items-center gap-1 overflow-hidden rounded bg-surface-card px-1 py-[2px] text-[10px] leading-tight text-muted"
                  >
                    <span className="size-1 shrink-0 rounded-full bg-[#6B7280]" />
                    <span className="truncate">{formatTimeForDisplay(b.start)} · Google</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  byKey,
  googleByKey,
  onSelectDay,
}: {
  byKey: Map<string, Appointment[]>;
  googleByKey: Map<string, GoogleBlock[]>;
  onSelectDay: (d: Date) => void;
}) {
  const days = weekDates(new Date());
  const { lang } = useApp();
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const items = sortByTime(byKey.get(toKey(d)) ?? []);
          const busy = googleByKey.get(toKey(d)) ?? [];
          const today = isToday(d);
          return (
            <div
              key={toKey(d)}
              onClick={() => onSelectDay(d)}
              className={cn(
                "min-h-[30rem] cursor-pointer border-e border-b border-hairline p-2 transition-colors last:border-e-0 hover:bg-surface-soft/40",
                today && "bg-brand-primary/[0.04]"
              )}
            >
              <p className="mb-2 flex flex-col items-center gap-1 py-1.5">
                <span
                  className={cn(
                    "text-[11px] uppercase tracking-wide",
                    today ? "font-semibold text-brand-primary" : "text-muted"
                  )}
                >
                  {weekdaysShort[lang][d.getDay()]}
                </span>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center text-sm",
                    today
                      ? "rounded-full bg-brand-primary font-semibold text-white"
                      : "font-medium text-ink"
                  )}
                >
                  {d.getDate()}
                </span>
              </p>
              <div className="flex flex-col gap-1.5">
                {items.map((a) => (
                  <span
                    key={a.id}
                    className="flex items-center gap-1.5 overflow-hidden rounded bg-brand-primary/[0.06] px-2 py-1.5 text-[12px] leading-tight text-ink"
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLOR[a.status] }}
                    />
                    <span className="truncate">{formatTimeForDisplay(a.date_rendez_vous)}</span>
                    <span className="ms-auto truncate text-[11px] text-body">
                      {a.patient?.patient_name?.split(" ")[0] ?? "—"}
                    </span>
                  </span>
                ))}
                {busy.map((b, bi) => (
                  <span
                    key={`g${bi}`}
                    className="flex items-center gap-1.5 overflow-hidden rounded bg-surface-card px-2 py-1.5 text-[12px] leading-tight text-muted"
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-[#6B7280]" />
                    <span className="truncate">{formatTimeForDisplay(b.start)} · Google</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({
  list,
  google,
  onOpen,
}: {
  list: Appointment[];
  google: GoogleBlock[];
  onOpen: (id: string) => void;
}) {
  const { t } = useApp();
  if (list.length === 0 && google.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-hairline bg-canvas px-4 py-16 text-center">
        <Inbox className="size-6 text-muted" />
        <p className="text-[13px] font-medium text-ink">
          {t("cal.noAppointments")}
        </p>
        <p className="max-w-xs text-[12px] text-muted">
          {t("cal.chooseOther")}
        </p>
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-lg border border-hairline bg-canvas">
      {list.map((a, i) => (
        <li key={a.id}>
          <button
            type="button"
            onClick={() => onOpen(a.id)}
            className={cn(
              "flex w-full cursor-pointer items-center gap-4 border-b border-hairline px-4 py-3.5 text-start transition-colors last:border-b-0 hover:bg-surface-soft/50",
              i === 0 && google.length === 0 && "animate-slide-up"
            )}
          >
            <span className="min-w-[64px] font-mono text-[15px] font-semibold text-ink">
              {formatTimeForDisplay(a.date_rendez_vous)}
            </span>
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ backgroundColor: avatarColor(a.patient?.patient_name ?? a.patient_id) }}
            >
              {initials(a.patient?.patient_name ?? a.patient_id)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">
                {a.patient?.patient_name ?? "Patient"}
              </span>
              <span className="block truncate text-[12px] text-body">
                {a.type ?? "—"}
              </span>
            </span>
            <StatusBadge status={a.status} size="md" />
          </button>
        </li>
      ))}
      {google.map((b, i) => (
        <li key={`g${i}`}>
          <div className="flex w-full items-center gap-4 border-b border-hairline bg-surface-soft/40 px-4 py-3.5 last:border-b-0">
            <span className="min-w-[64px] font-mono text-[15px] font-semibold text-muted">
              {formatTimeForDisplay(b.start)}
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#6B7280] text-[11px] font-semibold text-white">
              G
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-muted">
                {t("cal.googleBusy")}
              </span>
              <span className="block truncate text-[12px] text-muted">
                {formatTimeForDisplay(b.start)} – {formatTimeForDisplay(b.end)}
              </span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatusLabelShort({ status }: { status: AppointmentStatus }) {
  const { t } = useApp();
  return <>{t(`status.${status}` as TKey)}</>;
}

function formatTimeForDisplay(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}