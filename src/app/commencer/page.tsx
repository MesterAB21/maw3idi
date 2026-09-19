"use client";

import Link from "next/link";
import * as React from "react";
import { Video, Clock, Globe, Plus, Trash2, Check, Loader2, ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarWidget } from "@/components/app/calendar-widget";
import { LogoMark } from "@/components/brand/logo";

// MAW3IDI team schedule (front-only): Sun–Thu, 30-min slots.
const TEAM_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30",
];
const WEEKEND = new Set([5, 6]); // Fri, Sat (getDay)

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

export default function CommencerPage() {
  const { t } = useApp();
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [date, setDate] = React.useState<Date>(today);
  const [time, setTime] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [guests, setGuests] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState("");
  const [booking, setBooking] = React.useState(false);

  const slots = WEEKEND.has(date.getDay()) ? [] : TEAM_SLOTS;
  const canNext = time !== "" && slots.includes(time);
  const canSubmit = name.trim() !== "" && email.trim() !== "" && canNext && !booking;

  const handleSelectDate = (d: Date) => {
    setDate(d);
    setTime("");
  };

  const handleBook = async () => {
    if (!canSubmit) return;
    setBooking(true);
    // Front-only: simulate the reservation, no backend yet.
    await new Promise((r) => setTimeout(r, 900));
    setBooking(false);
    setStep(3);
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-soft">
      <div className="flex justify-start px-6 pt-6">
        <Link href="/" aria-label="MAW3IDI">
          <LogoMark imageClassName="h-[56px]" />
        </Link>
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-16 pt-6">
        <p className="text-[13px] font-semibold text-[#005FB5]">{t("commencer.badge")}</p>
        <h1 className="mt-1 font-display text-display-md font-bold text-ink">
          {t("commencer.title")}
        </h1>
        <p className="mt-2 text-body-sm text-muted">{t("commencer.subtitle")}</p>

        {step === 1 && (
          <div className="mt-6 flex flex-col gap-4">
            <p className="text-title-sm text-ink">{t("commencer.pickDay")}</p>
            <CalendarWidget
              compact
              interactive
              unavailableDates={new Set()}
              minDate={today}
              initialDate={date}
              selectedTime={time}
              onSelectDate={handleSelectDate}
              onSelectTime={setTime}
              timeSlots={slots}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <p className="text-body-sm text-muted">{t("commencer.pickTime")}</p>
              <Button disabled={!canNext} onClick={() => setStep(2)}>
                {t("commencer.next")}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 flex flex-col gap-5">
            {/* Meeting summary */}
            <div className="rounded-xl border border-hairline bg-canvas p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-[#005FB5]/10">
                  <Video className="size-5 text-[#005FB5]" />
                </span>
                <div>
                  <p className="text-title-sm text-ink">{t("commencer.meeting.title")}</p>
                  <p className="text-body-sm text-muted">
                    {toKey(date)} · {time} – {addMinutes(time, 30)}
                  </p>
                </div>
              </div>
              <ul className="mt-4 flex flex-col gap-2 text-body-sm text-body">
                <li className="flex items-center gap-2">
                  <Clock className="size-4 text-muted" />
                  {t("commencer.meeting.duration")}
                </li>
                <li className="flex items-center gap-2">
                  <Video className="size-4 text-muted" />
                  {t("commencer.meeting.conference")}
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="size-4 text-muted" />
                  {t("commencer.meeting.timezone")}
                </li>
              </ul>
            </div>

            {/* Details form */}
            <div className="rounded-xl border border-hairline bg-canvas p-6 shadow-card">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="meet-name" className="mb-1.5 block text-body-sm font-medium text-ink">
                    {t("commencer.form.name")}
                  </label>
                  <Input
                    id="meet-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("commencer.form.namePlaceholder")}
                  />
                </div>
                <div>
                  <label htmlFor="meet-email" className="mb-1.5 block text-body-sm font-medium text-ink">
                    {t("commencer.form.email")}
                  </label>
                  <Input
                    id="meet-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("commencer.form.emailPlaceholder")}
                  />
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-1.5 text-body-sm font-medium text-ink">
                  {t("commencer.form.guests")}
                </p>
                <div className="flex flex-col gap-2">
                  {guests.map((g, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="email"
                        value={g}
                        onChange={(e) =>
                          setGuests((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                        }
                        placeholder={t("commencer.form.emailPlaceholder")}
                      />
                      <Button
                        variant="icon-ghost"
                        className="text-danger"
                        onClick={() => setGuests((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={t("commencer.form.removeGuest", { email: g || `#${i + 1}` })}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() => setGuests((prev) => [...prev, ""])}
                  >
                    <Plus className="size-4" />
                    {t("commencer.form.addGuest")}
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="meet-notes" className="mb-1.5 block text-body-sm font-medium text-ink">
                  {t("commencer.form.notes")}
                </label>
                <textarea
                  id="meet-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("commencer.form.notesPlaceholder")}
                  rows={3}
                  className="w-full rounded-[10px] border-[0.8px] border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[13px] text-ink transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#005FB5]/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4" />
                {t("commencer.back")}
              </Button>
              <Button disabled={!canSubmit} onClick={handleBook}>
                {booking ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {t("commencer.form.submit")}
              </Button>
            </div>
            {!canSubmit && (name.trim() !== "" || email.trim() !== "") ? (
              <p className={cn("text-[12px]", "text-muted")}>{t("commencer.form.required")}</p>
            ) : null}
          </div>
        )}

        {step === 3 && (
          <div className="mx-auto mt-6 flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-hairline bg-canvas px-6 py-12 text-center shadow-card">
            <span className="flex size-14 items-center justify-center rounded-full bg-status-confirmed-bg">
              <Check className="size-7 text-status-confirmed" />
            </span>
            <h2 className="font-display text-display-md font-bold text-ink">
              {t("commencer.success.title")}
            </h2>
            <p className="text-body-sm text-muted">
              {t("commencer.success.body")}
            </p>
            <p className="rounded-lg bg-surface-soft px-4 py-2 text-body-sm font-medium text-ink">
              {toKey(date)} · {time} – {addMinutes(time, 30)}
            </p>
            <Link
              href="/"
              className="mt-2 text-[13px] font-semibold text-[#005FB5] hover:opacity-80"
            >
              {t("commencer.success.backHome")}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
