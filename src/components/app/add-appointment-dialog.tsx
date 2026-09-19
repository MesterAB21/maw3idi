"use client";

import * as React from "react";
import { CalendarDays, Check, Phone, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarWidget } from "@/components/app/calendar-widget";

const TOMORROW = new Date();
TOMORROW.setDate(TOMORROW.getDate() + 1);

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function AddAppointmentDialog({
  open,
  onOpenChange,
  initialDate,
  initialTime,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date | null;
  initialTime?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {open ? (
          <AddAppointmentForm
            initialDate={initialDate}
            initialTime={initialTime}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AddAppointmentForm({
  initialDate,
  initialTime,
  onClose,
}: {
  initialDate?: Date | null;
  initialTime?: string | null;
  onClose: () => void;
}) {
  const { t, createAppointment, fetchAppointments, fetchAvailableSlots } = useApp();
  const { toast } = useToast();

  const [date, setDate] = React.useState<Date>(() => initialDate ?? TOMORROW);
  const [time, setTime] = React.useState<string>(() => initialTime ?? "");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [nameFocus, setNameFocus] = React.useState(false);
  const [phoneFocus, setPhoneFocus] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [slots, setSlots] = React.useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);

  // Real bookable times for the selected day (working hours − appointments −
  // Google busy, stepped by slot duration). Sent as YYYY-MM-DD.
  React.useEffect(() => {
    let cancelled = false;
    setSlotsLoading(true);
    fetchAvailableSlots(toISODate(date))
      .then((res) => {
        if (cancelled) return;
        setSlots(res.slots);
        // Drop a previously picked time that is no longer bookable.
        setTime((prev) => (prev && res.slots.includes(prev) ? prev : ""));
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setSlots([]);
          setTime("");
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, fetchAvailableSlots]);

  const valid = name.trim().length > 0 && phone.trim().length > 0 && time !== "";

  const handleCreate = async () => {
    if (!valid || isLoading) return;
    setIsLoading(true);
    try {
      await createAppointment({
        patientName: name,
        phone,
        type: t("appt.defaultType"),
        date: toKey(date),
        time,
        dateOfBirth: dob || undefined,
      });
      toast(t("appt.created", { name }), "success");
      await fetchAppointments();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("appt.dialogTitle")}</DialogTitle>
        <DialogDescription>{t("appt.dialogSubtitle")}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 md:grid-cols-[minmax(0,290px)_1fr]">
        <CalendarWidget
          compact
          interactive
          unavailableDates={new Set()}
          initialDate={date}
          selectedTime={time}
          onSelectDate={(d) => setDate(d)}
          onSelectTime={(s) => setTime(s)}
          timeSlots={slots}
          slotsLoading={slotsLoading}
          className="w-full"
        />

        <div className="flex min-w-0 flex-col gap-4">
          {/* Patient name */}
          <div className="relative">
            <label
              htmlFor="appt-name"
              className="mb-1.5 block text-caption uppercase text-muted"
            >
              {t("appt.patientName")}
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                id="appt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setNameFocus(true)}
                onBlur={() => setNameFocus(false)}
                placeholder={t("appt.namePlaceholder")}
                className="ps-9"
                autoComplete="off"
              />
            </div>
            {name.trim().length > 0 ? (
              <p className="mt-1 text-[12px] text-muted">{t("appt.newPatient")}</p>
            ) : null}
          </div>

          {/* Phone */}
          <div className="relative">
            <label
              htmlFor="appt-phone"
              className="mb-1.5 block text-caption uppercase text-muted"
            >
              {t("appt.phone")}
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                id="appt-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onFocus={() => setPhoneFocus(true)}
                onBlur={() => setPhoneFocus(false)}
                placeholder={t("appt.phonePlaceholder")}
                className="ps-9"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Date of birth */}
          <div>
            <label
              htmlFor="appt-dob"
              className="mb-1.5 block text-caption uppercase text-muted"
            >
              {t("appt.dob")}
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                id="appt-dob"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                placeholder={t("appt.dobPlaceholder")}
                className="ps-9"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Slot summary */}
          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-body-sm",
              time
                ? "border-hairline bg-surface-soft text-ink"
                : "border-dashed border-hairline text-muted"
            )}
          >
            {time
              ? t("appt.selectedSlot", { date: toKey(date), time })
              : t("appt.noSlot")}
          </div>

          <Button
            onClick={handleCreate}
            disabled={!valid || isLoading}
            className="mt-auto w-full"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {t("appt.creating")}
              </>
            ) : (
              <>
                <Check className="size-4" />
                {t("appt.create")}
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}