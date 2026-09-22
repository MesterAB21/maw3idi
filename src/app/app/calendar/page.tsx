"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Inbox, MoreVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import { formatApptTime } from "@/lib/appt-time";
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

/** Mélange deux couleurs hex (a vers b, t ∈ [0,1]). */
function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Blocs pastel de la vue semaine : fond teinté (~12%) + texte saturé foncé
 * (contraste ≥ 4.5:1 sur le fond), + teinte de survol légèrement plus marquée.
 * Configuration unique, réutilisée par le rendu du bloc.
 */
const APPOINTMENT_BLOCK: Record<AppointmentStatus, { bg: string; text: string; hover: string }> = {
  confirme: {
    bg: "#E8F5EC",
    text: "#1B7F4B",
    hover: mixHex("#E8F5EC", "#1B7F4B", 0.18),
  },
  reserve: {
    bg: "#FDF0E3",
    text: "#B4610E",
    hover: mixHex("#FDF0E3", "#B4610E", 0.18),
  },
  annule: {
    bg: "#FDEBEC",
    text: "#C0302E",
    hover: mixHex("#FDEBEC", "#C0302E", 0.18),
  },
  termine: {
    bg: "#EDF0F5",
    text: "#5A6478",
    hover: mixHex("#EDF0F5", "#5A6478", 0.18),
  },
  confirmation_envoyee: {
    bg: "#E6F0FD",
    text: "#1F5FAE",
    hover: mixHex("#E6F0FD", "#1F5FAE", 0.18),
  },
  need_call: {
    bg: "#FDEDE0",
    text: "#C2410C",
    hover: mixHex("#FDEDE0", "#C2410C", 0.18),
  },
  absent: {
    bg: "#F0F2F6",
    text: "#52525B",
    hover: mixHex("#F0F2F6", "#52525B", 0.18),
  },
};

/** Teinte des blocs Google (idem couleur de la légende « Occupé (Google) »). */
const GOOGLE_BLOCK = {
  bg: "#F0F2F6",
  text: "#52525B",
  hover: mixHex("#F0F2F6", "#52525B", 0.18),
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

function isPastDay(d: Date): boolean {
  const today = new Date();
  return toKey(d) < toKey(today);
}

/** End time (ISO civil wall-clock) derived from start + duration_minutes. */
function appointmentEnd(a: Appointment): string {
  const d = new Date(a.date_rendez_vous);
  if (isNaN(d.getTime())) return "";
  const minutes = Number(a.duration_minutes) || 0;
  return new Date(d.getTime() + minutes * 60000).toISOString();
}

/** Horaire civil au format bloc « 09h00 » (depuis le "HH:MM" de formatApptTime). */
function blockTime(iso: string): string {
  return formatTimeForDisplay(iso).replace(":", "h");
}

/** 0 = matin, 1 = après-midi, 2 = soir (store UTC civil hours). */
function periodIndex(iso: string): 0 | 1 | 2 {
  const d = new Date(iso);
  const h = isNaN(d.getTime()) ? 0 : d.getUTCHours();
  if (h < 12) return 0;
  if (h < 17) return 1;
  return 2;
}

const PERIOD_LABEL: TKey[] = ["cal.morning", "cal.afternoon", "cal.evening"];

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
  const [rangeLoading, setRangeLoading] = React.useState(true);

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
    setRangeLoading(true);
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
    } finally {
      setRangeLoading(false);
    }
  }, [fetchCalendar]);

  React.useEffect(() => {
    if (view === "DAY") {
      loadSlots(anchor);
    }
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
  const viewRef = React.useRef(view);
  viewRef.current = view;
  useRealtimeEvent("appointments_changed", () => {
    loadRange(rangeRef.current.start, rangeRef.current.end);
  });
  useRealtimeEvent("availability_changed", () => {
    if (viewRef.current === "DAY") {
      loadSlots(anchorRef.current);
    }
    loadRange(rangeRef.current.start, rangeRef.current.end);
  });

  const openAddFor = (d: Date, time: string | null = null) => {
    setAddDate(d);
    setAddTime(time);
    setAddOpen(true);
  };

  const openAddAt = (slot: string) => {
    openAddFor(anchor, slot);
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
        <div data-tour="calendar-grid">
          {view === "MONTH" ? (
            <MonthView anchor={anchor} byKey={byKey} googleByKey={googleByKey} onSelectDay={selectDay} />
          ) : view === "WEEK" ? (
            <WeekView
              anchor={anchor}
              byKey={byKey}
              googleByKey={googleByKey}
              onSelectDay={selectDay}
              onOpen={openDrawer}
              onAddDate={openAddFor}
              loading={rangeLoading}
            />
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
                    <span className="truncate">
                      {formatTimeForDisplay(b.start)} · {b.title || t("cal.googleBusy")}
                    </span>
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

function AppointmentCard({
  appointment: a,
  onOpen,
  onReschedule,
  onCancel,
}: {
  appointment: Appointment;
  onOpen: (id: string) => void;
  onReschedule: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const { t } = useApp();
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = () => setMenuOpen(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  const tone = APPOINTMENT_BLOCK[a.status];
  const color = tone.text;
  const name = a.patient?.patient_name ?? "Patient";
  const cancelled = a.status === "annule";
  const statusLabel = t(`status.${a.status}` as TKey);
  const motif = a.type || t("cal.consultation");
  const endIso = appointmentEnd(a);
  const timeLine = endIso ? `${blockTime(a.date_rendez_vous)} – ${blockTime(endIso)}` : blockTime(a.date_rendez_vous);

  return (
    <div
      role="button"
      tabIndex={0}
      title={motif}
      aria-label={t("cal.cardAria", { time: timeLine, name, status: statusLabel })}
      onClick={() => onOpen(a.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(a.id);
        }
      }}
      style={{
        backgroundColor: tone.bg,
        color,
        ["--hover" as string]: tone.hover,
        ["--tone" as string]: color,
      }}
      className={cn(
        "group/card relative cursor-pointer rounded-md px-2.5 py-2 text-start",
        "transition-[transform,background-color] duration-150 ease-out",
        "hover:-translate-y-px hover:[background-color:var(--hover)]",
        "focus-visible:ring-2 focus-visible:ring-[color:var(--tone)] focus-visible:ring-offset-2",
        "motion-reduce:transform-none motion-reduce:transition-none",
        cancelled && "opacity-60"
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        {/* Titre — nom du patient (2 lignes max) */}
        <span
          className={cn(
            "line-clamp-2 break-words text-[13px] font-semibold leading-[1.25]",
            cancelled && "line-through"
          )}
        >
          {name}
        </span>
        {/* Horaire — même teinte à 75% */}
        <span
          className="whitespace-nowrap text-[12px] font-medium leading-tight opacity-75"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {timeLine}
        </span>
      </div>

      {/* Menu contextuel discret (« … ») */}
      <button
        type="button"
        aria-label={t("cal.cardMenu")}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((o) => !o);
        }}
        className={cn(
          "absolute end-1.5 top-1.5 z-10 flex size-5 cursor-pointer items-center justify-center rounded",
          "opacity-0 focus-visible:opacity-100 group-hover/card:opacity-70 focus-visible:ring-2 focus-visible:ring-brand-primary/30",
          menuOpen && "opacity-100"
        )}
      >
        <MoreVertical className="size-3.5" aria-hidden />
      </button>

      {menuOpen ? (
        <div
          role="menu"
          aria-label={t("cal.cardMenu")}
          className="absolute end-1.5 top-8 z-50 w-40 overflow-hidden rounded-lg border border-hairline bg-canvas py-1 shadow-card"
        >
          <MenuAction
            onClick={() => {
              setMenuOpen(false);
              onOpen(a.id);
            }}
          >
            {t("cal.cardViewDetails")}
          </MenuAction>
          <MenuAction
            onClick={() => {
              setMenuOpen(false);
              onReschedule(a.id);
            }}
          >
            {t("cal.cardReschedule")}
          </MenuAction>
          <MenuAction
            danger
            disabled={cancelled}
            onClick={() => {
              setMenuOpen(false);
              onCancel(a.id);
            }}
          >
            {t("cal.cardCancel")}
          </MenuAction>
        </div>
      ) : null}
    </div>
  );
}

function GoogleCard({ block }: { block: GoogleBlock }) {
  const { t } = useApp();
  const color = GOOGLE_BLOCK.text;
  const title = block.title || t("cal.googleBusy");
  const timeLine = `${blockTime(block.start)} – ${blockTime(block.end)}`;

  return (
    <div
      role="presentation"
      style={{
        backgroundColor: GOOGLE_BLOCK.bg,
        color,
        ["--hover" as string]: GOOGLE_BLOCK.hover,
        ["--tone" as string]: color,
      }}
      className={cn(
        "group/card relative rounded-md px-2.5 py-2 text-start",
        "transition-[transform,background-color] duration-150 ease-out",
        "motion-reduce:transform-none motion-reduce:transition-none"
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        {/* Titre — nom de l'événement Google (fallback « Occupé (Google) ») */}
        <span className="line-clamp-2 break-words text-[13px] font-semibold leading-[1.25]">
          {title}
        </span>
        {/* Horaire — début et fin */}
        <span
          className="whitespace-nowrap text-[12px] font-medium leading-tight opacity-75"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {timeLine}
        </span>
      </div>
    </div>
  );
}

function MenuAction({
  children,
  onClick,
  danger = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "block w-full cursor-pointer px-3 py-1.5 text-start text-[12.5px] transition-colors duration-150",
        danger ? "text-danger hover:bg-status-cancelled-bg" : "text-body hover:bg-surface-soft",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
      )}
    >
      {children}
    </button>
  );
}

function DayHeaderCell({
  d,
  today,
  past,
  count,
  bordered = true,
  onSelect,
}: {
  d: Date;
  today: boolean;
  past: boolean;
  count: number;
  bordered?: boolean;
  onSelect?: (d: Date) => void;
}) {
  const { lang, t } = useApp();
  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={onSelect ? weekdaysShort[lang][d.getDay()] : undefined}
      onClick={onSelect ? () => onSelect(d) : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(d);
              }
            }
          : undefined
      }
      className={cn(
        "flex flex-col items-center gap-0.5 px-1 py-2.5",
        bordered && "border-e border-[#F0F2F6] last:border-e-0",
        past && "opacity-60",
        onSelect && "cursor-pointer"
      )}
    >
      <span
        className={cn("text-[11px] font-semibold uppercase", today ? "text-brand-primary" : "text-muted")}
        style={{ letterSpacing: "0.08em" }}
      >
        {weekdaysShort[lang][d.getDay()]}
      </span>
      <span
        className={cn(
          "flex size-8 items-center justify-center text-[18px] font-semibold leading-none",
          today ? "rounded-full bg-brand-primary text-white" : "text-ink"
        )}
      >
        {d.getDate()}
      </span>
      {count > 0 ? (
        <p className="text-[10px] font-medium text-muted">{t("cal.rdvCount", { n: count })}</p>
      ) : null}
    </div>
  );
}

function DayColumnBody({
  d,
  items,
  busy,
  loading,
  onOpen,
  onReschedule,
  onCancel,
  onAddDate,
}: {
  d: Date;
  items: Appointment[];
  busy: GoogleBlock[];
  loading: boolean;
  onOpen: (id: string) => void;
  onReschedule: (id: string) => void;
  onCancel: (id: string) => void;
  onAddDate: (d: Date) => void;
}) {
  const { t } = useApp();

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-[10px] bg-surface-soft" />
        ))}
      </div>
    );
  }

  if (items.length === 0 && busy.length === 0) {
    return (
      <div className="m-auto flex w-full flex-col items-center gap-2 px-2 py-8 text-center">
        <CalendarDays className="size-5 text-[#E2E8F0]" aria-hidden />
        <p className="text-[11px] text-[#C0C6D0]">{t("cal.noAppointmentsDay")}</p>
        <button
          type="button"
          onClick={() => onAddDate(d)}
          className={cn(
            "mt-1 w-full cursor-pointer rounded-md border border-dashed border-hairline px-3 py-2 text-[11px] font-medium text-muted",
            "transition-colors duration-150 hover:border-brand-primary hover:text-brand-primary",
            "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
            "[@media(hover:none)]:opacity-100"
          )}
        >
          {t("cal.add")}
        </button>
      </div>
    );
  }

  const groups = (["0", "1", "2"] as const)
    .map((p) => {
      const period = Number(p) as 0 | 1 | 2;
      const list: {
        kind: "appt" | "google";
        appt?: Appointment;
        block?: GoogleBlock;
        start: string;
      }[] = [
        ...items.map((a) => ({ kind: "appt" as const, appt: a, start: a.date_rendez_vous })),
        ...busy.map((b) => ({ kind: "google" as const, block: b, start: b.start })),
      ]
        .filter((e) => periodIndex(e.start) === period)
        .sort((x, y) => x.start.localeCompare(y.start));
      return { p: period, list };
    })
    .filter((g) => g.list.length > 0);

  return (
    <div className="flex flex-col">
      {groups.map((g, gi) => (
        <div key={g.p} className={cn("flex flex-col gap-1", gi > 0 && "mt-3.5")}>
          <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.08em] text-[#B4BAC6]">
            {t(PERIOD_LABEL[g.p])}
            <span className="h-px flex-1 bg-[#F0F2F6]" aria-hidden />
          </p>
          {g.list.map((e) =>
            e.kind === "google" && e.block ? (
              <GoogleCard key={`g-${e.start}`} block={e.block} />
            ) : e.appt ? (
              <AppointmentCard
                key={e.appt.id}
                appointment={e.appt}
                onOpen={onOpen}
                onReschedule={onReschedule}
                onCancel={onCancel}
              />
            ) : null
          )}
        </div>
      ))}
    </div>
  );
}

function WeekView({
  anchor,
  byKey,
  googleByKey,
  onSelectDay,
  onOpen,
  onAddDate,
  loading,
}: {
  anchor: Date;
  byKey: Map<string, Appointment[]>;
  googleByKey: Map<string, GoogleBlock[]>;
  onSelectDay: (d: Date) => void;
  onOpen: (id: string) => void;
  onAddDate: (d: Date, time?: string | null) => void;
  loading: boolean;
}) {
  const { lang, cancelAppointment } = useApp();
  const days = React.useMemo(() => weekDates(anchor), [anchor]);
  const [mobileDay, setMobileDay] = React.useState(0);

  React.useEffect(() => {
    setMobileDay(0);
  }, [anchor]);

  const reschedule = (id: string) => {
    let appt: Appointment | undefined;
    for (const day of days) {
      appt = byKey.get(toKey(day))?.find((x) => x.id === id);
      if (appt) break;
    }
    if (!appt) return;
    onAddDate(new Date(appt.date_rendez_vous), formatTimeForDisplay(appt.date_rendez_vous));
  };

  const columnCommon = {
    onOpen,
    onReschedule: reschedule,
    onCancel: cancelAppointment,
    onAddDate: (d: Date) => onAddDate(d, null),
  };

  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
      {/* Mobile (< 768px) : jour unique + sélecteur horizontal scrollable */}
      <div className="md:hidden">
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto border-b border-[#F0F2F6] px-2 py-2">
          {days.map((d, i) => {
            const active = i === mobileDay;
            const today = isToday(d);
            const count = byKey.get(toKey(d))?.length ?? 0;
            return (
              <button
                key={toKey(d)}
                type="button"
                onClick={() => setMobileDay(i)}
                aria-pressed={active}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium",
                  "transition-colors duration-150",
                  active
                    ? "border-brand-primary bg-brand-primary text-white"
                    : "border-hairline bg-canvas text-body hover:border-brand-primary hover:text-brand-primary",
                  isPastDay(d) && !active && "opacity-60"
                )}
              >
                <span className="whitespace-nowrap">
                  {weekdaysShort[lang][d.getDay()]} {d.getDate()}
                </span>
                {count > 0 ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-semibold",
                      active ? "bg-white/25 text-white" : "bg-surface-soft text-muted"
                    )}
                  >
                    {count}
                  </span>
                ) : null}
                {today ? <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
        <div className="px-2 py-3">
          {(() => {
            const d = days[mobileDay];
            return (
              <div className="group rounded-xl border border-[#F0F2F6] bg-canvas p-2">
                <DayHeaderCell
                  d={d}
                  today={isToday(d)}
                  past={isPastDay(d)}
                  count={loading ? 0 : (byKey.get(toKey(d))?.length ?? 0)}
                  onSelect={onSelectDay}
                  bordered={false}
                />
                <DayColumnBody
                  d={d}
                  items={sortByTime(byKey.get(toKey(d)) ?? [])}
                  busy={googleByKey.get(toKey(d)) ?? []}
                  loading={loading}
                  {...columnCommon}
                />
              </div>
            );
          })()}
        </div>
      </div>

      {/* Desktop (≥ 768px) : grille 7 colonnes, zone scrollable unique */}
      <div className="hidden md:block">
        <div className="hide-scrollbar max-h-[32rem] overflow-y-auto">
          <div className="sticky top-0 z-20 grid grid-cols-7 border-b border-[#F0F2F6] bg-canvas/95 backdrop-blur-sm">
            {days.map((d) => (
              <DayHeaderCell
                key={toKey(d)}
                d={d}
                today={isToday(d)}
                past={isPastDay(d)}
                count={loading ? 0 : (byKey.get(toKey(d))?.length ?? 0)}
                onSelect={onSelectDay}
              />
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => (
              <div
                key={toKey(d)}
                className={cn(
                  "group relative min-h-[13rem] border-e border-[#F0F2F6] p-2 last:border-e-0",
                  isToday(d) && "bg-[#F5F8FF]"
                )}
              >
                <DayColumnBody
                  d={d}
                  items={sortByTime(byKey.get(toKey(d)) ?? [])}
                  busy={googleByKey.get(toKey(d)) ?? []}
                  loading={loading}
                  {...columnCommon}
                />
              </div>
            ))}
          </div>
        </div>
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
              {formatTimeForDisplay(b.start)} – {formatTimeForDisplay(b.end)}
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#6B7280] text-[11px] font-semibold text-white">
              G
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-muted">
                {b.title || t("cal.googleBusy")}
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
    return formatApptTime(dateStr);
  } catch {
    return "";
  }
}