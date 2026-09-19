"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { weeksShortMondayFirst } from "@/lib/i18n";

const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:30",
  "11:00",
  "14:00",
  "14:30",
  "15:30",
  "16:30",
];

const UNAVAILABLE_DATES = new Set([5, 6, 12, 13, 19, 20, 26, 27]);

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first header (weeksShortMondayFirst): shift Sunday-first getDay().
  const offset = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function CalendarWidget({
  initialDate = new Date(2026, 8, 18),
  selectedTime = "10:30",
  onSelectDate,
  onSelectTime,
  interactive = true,
  compact = false,
  unavailableDates,
  className,
  timeSlots,
  slotsLoading = false,
  minDate,
}: {
  initialDate?: Date;
  selectedTime?: string;
  onSelectDate?: (d: Date) => void;
  onSelectTime?: (t: string) => void;
  interactive?: boolean;
  compact?: boolean;
  unavailableDates?: Set<number>;
  className?: string;
  /** Real bookable times for the selected day. When provided, replaces the
   *  static fallback list (landing hero keeps the static list). */
  timeSlots?: string[];
  slotsLoading?: boolean;
  /** Days strictly before this date (day granularity) are disabled. */
  minDate?: Date;
}) {
  const [viewDate, setViewDate] = React.useState(initialDate);
  const [selectedDate, setSelectedDate] = React.useState(initialDate);
  const { lang, t } = useApp();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const go = (delta: number) => setViewDate(new Date(year, month + delta, 1));

  const monthLabel = new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : "fr-FR", {
    month: "long",
    year: "numeric",
  }).format(viewDate);

  const changeDate = (day: number) => {
    if (!interactive) return;
    const d = new Date(year, month, day);
    setSelectedDate(d);
    onSelectDate?.(d);
  };

  return (
    <div
      className={cn(
        "grid gap-6 rounded-2xl border border-hairline bg-canvas p-5 shadow-card",
        compact ? "sm:grid-cols-1" : "sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-6",
        className
      )}
    >
      <div className="mx-auto w-full max-w-[300px]">
        <div className="mb-3 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => go(-1)}
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-muted transition-colors duration-150",
              interactive ? "hover:bg-surface-card hover:text-ink" : "cursor-default"
            )}
            aria-label={t("widget.prevMonth")}
          >
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </button>
          <span className="text-title-sm capitalize text-ink">{monthLabel}</span>
          <button
            type="button"
            onClick={() => go(1)}
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-muted transition-colors duration-150",
              interactive ? "hover:bg-surface-card hover:text-ink" : "cursor-default"
            )}
            aria-label={t("widget.nextMonth")}
          >
            <ChevronRight className="size-4 rtl:rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {weeksShortMondayFirst[lang].map((d, i) => (
            <span
              key={i}
              className="py-1 text-caption uppercase text-muted"
            >
              {d}
            </span>
          ))}
          {monthGrid(year, month).map((day, i) => {
            if (day === null) return <span key={`e${i}`} />;
            const cellDate = new Date(year, month, day);
            const beforeMin =
              minDate !== undefined &&
              new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate()).getTime() <
                new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
            const unavailable = beforeMin || (unavailableDates ?? UNAVAILABLE_DATES).has(day);
            const isSelected =
              selectedDate.getFullYear() === year &&
              selectedDate.getMonth() === month &&
              selectedDate.getDate() === day;
            return (
              <button
                key={`d${day}`}
                type="button"
                onClick={() => changeDate(day)}
                disabled={!interactive || unavailable}
                aria-label={`${day} ${monthLabel}`}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-full text-[13px] transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/15",
                  isSelected
                    ? "bg-brand-primary font-semibold text-white"
                    : unavailable
                      ? "cursor-default text-muted/70"
                      : "text-ink hover:bg-surface-card",
                  interactive && !unavailable && "cursor-pointer"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 px-1 text-caption uppercase text-muted">
          {t("widget.availableSlots")}
        </p>
        {timeSlots === undefined ? (
          <ul className="grid grid-cols-3 gap-2.5">
            {TIME_SLOTS.map((slot) => {
              const selected = slot === selectedTime;
              return (
                <li key={slot}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!interactive) return;
                      onSelectTime?.(slot);
                    }}
                    className={cn(
                      "inline-flex w-full items-center justify-center rounded-full border px-4 py-2.5 text-body-sm font-medium transition-all duration-150 focus-visible:ring-3 focus-visible:ring-ring/15",
                      selected
                        ? "border-brand-primary bg-brand-primary text-white"
                        : "border-hairline bg-canvas text-ink hover:border-brand-primary hover:text-brand-primary",
                      !interactive && "cursor-default"
                    )}
                  >
                    {slot}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : slotsLoading ? (
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-full bg-surface-soft" />
            ))}
          </div>
        ) : timeSlots.length === 0 ? (
          <p className="px-1 text-body-sm text-muted">{t("avail.noSlots")}</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2.5">
            {timeSlots.map((slot) => {
              const selected = slot === selectedTime;
              return (
                <li key={slot}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!interactive) return;
                      onSelectTime?.(slot);
                    }}
                    className={cn(
                      "inline-flex w-full items-center justify-center rounded-full border px-4 py-2.5 text-body-sm font-medium transition-all duration-150 focus-visible:ring-3 focus-visible:ring-ring/15",
                      selected
                        ? "border-brand-primary bg-brand-primary text-white"
                        : "border-hairline bg-canvas text-ink hover:border-brand-primary hover:text-brand-primary",
                      !interactive && "cursor-default"
                    )}
                  >
                    {slot}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}