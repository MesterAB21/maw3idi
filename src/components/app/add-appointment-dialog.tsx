"use client";

import * as React from "react";
import { CalendarDays, Check, Phone, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import { avatarColor, initials } from "@/lib/utils";
import type { Patient } from "@/lib/types";
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

/** 0781569010 → +213781569010. Accepts 0X.., +213X.. and 00213X... */
function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s.\-()]/g, "");
  let digits = cleaned;
  if (digits.startsWith("+")) {
    if (!/^\+213[567]\d{8}$/.test(digits)) return null;
    return digits;
  }
  if (digits.startsWith("00213")) digits = digits.slice(2);
  if (/^0[567]\d{8}$/.test(digits)) return `+213${digits.slice(1)}`;
  if (/^213[567]\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

/** Mask auto : les chiffres tapés se placent en JJ/MM/AAAA (sans taper "/"). */
function maskDob(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  return parts.join("/");
}

type DobError = "invalid" | "future" | null;

/** Valide JJ/MM/AAAA : date réelle et strictement passée. Retourne l'ISO ou l'erreur. */
function parseDob(value: string): { iso: string } | { error: Exclude<DobError, null> } {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return { error: "invalid" };
  const dd = parseInt(digits.slice(0, 2), 10);
  const mm = parseInt(digits.slice(2, 4), 10);
  const yyyy = parseInt(digits.slice(4, 8), 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900) return { error: "invalid" };
  const dt = new Date(yyyy, mm - 1, dd);
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) {
    return { error: "invalid" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dt.getTime() >= today.getTime()) return { error: "future" };
  return { iso: `${pad(yyyy)}-${pad(mm)}-${pad(dd)}` };
}

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
  const { t, createAppointment, fetchAppointments, fetchAvailableSlots, fetchCalendar } = useApp();
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
  const [fieldErrors, setFieldErrors] = React.useState<{ name?: string; phone?: string; dob?: string }>({});
  // Recherche d'un patient EXISTANT : suggestions pendant la saisie du nom.
  const [suggestions, setSuggestions] = React.useState<Patient[]>([]);
  const [suggestLoading, setSuggestLoading] = React.useState(false);
  const [showSuggest, setShowSuggest] = React.useState(false);
  const [suggestField, setSuggestField] = React.useState<"name" | "phone" | null>(null);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);

  // Filtre en direct : dès 2 lettres (nom) ou 3 chiffres (téléphone), on cherche
  // parmi les patients du cabinet (le backend matche nom OU numéro).
  React.useEffect(() => {
    const q = name.trim();
    const digits = phone.replace(/\D/g, "");
    const field: "name" | "phone" | null =
      q.length >= 2 ? "name" : digits.length >= 3 ? "phone" : null;
    setSuggestField(field);
    if (!field) {
      setSuggestLoading(false);
      setSuggestions([]);
      return;
    }
    const query = field === "phone" ? phone.replace(/[^\d+]/g, "") : q;
    const handle = window.setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await api.listPatients({ search: query, page_size: 5 });
        setSuggestions(res.data ?? []);
        setShowSuggest(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [name, phone, selectedPatient]);

  const toDobMask = (v: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
  };

  const pickPatient = (p: Patient) => {
    setSelectedPatient(p);
    setName(p.patient_name);
    setPhone(p.patient_phone ?? "");
    if (p.date_de_naissance) setDob(toDobMask(p.date_de_naissance));
    setSuggestions([]);
    setShowSuggest(false);
  };

  // Pré-chauffage du cache : au montage du form, on déclenche silencieusement
  // un fetchCalendar sur le mois courant. Cela remplit le cache Redis côté
  // backend (gcal:busy + slots par jour). Ainsi, le fetchAvailableSlots
  // ci-dessous arrive toujours sur un cache chaud.
  React.useEffect(() => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 2, 1);
    fetchCalendar(start.toISOString(), end.toISOString()).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Une seule fois à l'ouverture

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

  const canSubmit = time !== "" && !isLoading;

  const handleCreate = async () => {
    if (!canSubmit) return;
    const errors: { name?: string; phone?: string; dob?: string } = {};
    if (name.trim().length === 0) {
      errors.name = t("appt.nameRequired");
    }
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      errors.phone = t("appt.invalidPhone");
    }
    let dobIso: string | undefined;
    if (dob.trim().length > 0) {
      const parsed = parseDob(dob);
      if ("error" in parsed) {
        errors.dob = t(parsed.error === "future" ? "appt.dobFuture" : "appt.invalidDob");
      } else {
        dobIso = parsed.iso;
      }
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      // L'onglet reste ouvert : erreurs sous les champs + toast.
      toast(t("errors.createAppointment"), "danger");
      return;
    }
    setIsLoading(true);
    try {
      await createAppointment({
        patientName: name.trim(),
        phone: normalizedPhone as string,
        type: t("appt.defaultType"),
        date: toKey(date),
        time,
        dateOfBirth: dobIso,
        patientId: selectedPatient?.id,
      });
      toast(t("appt.created", { name: name.trim() }), "success");
      await fetchAppointments();
      onClose();
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : t("errors.createAppointment"), "danger");
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
                onChange={(e) => {
                  setName(e.target.value);
                  setSelectedPatient(null);
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
                }}
                onFocus={() => {
                  setNameFocus(true);
                  setSuggestField("name");
                  if (suggestions.length > 0 && !selectedPatient) setShowSuggest(true);
                }}
                onBlur={() => {
                  setNameFocus(false);
                  window.setTimeout(() => setShowSuggest(false), 150);
                }}
                placeholder={t("appt.namePlaceholder")}
                className="ps-9"
                autoComplete="off"
              />
              {showSuggest && suggestField === "name" && !selectedPatient && suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-hairline bg-surface-0 shadow-lg">
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickPatient(p);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-start hover:bg-surface-soft"
                    >
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: avatarColor(p.patient_name) }}
                      >
                        {initials(p.patient_name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {p.patient_name}
                        </span>
                        <span className="block truncate text-[12px] text-muted">
                          {p.patient_phone}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {fieldErrors.name ? (
              <p className="mt-1 text-[12px] font-medium text-danger">{fieldErrors.name}</p>
            ) : selectedPatient ? (
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="mt-1 block text-left text-[12px] font-medium text-primary hover:underline"
              >
                {t("appt.existingPatient")} : {selectedPatient.patient_name} ·{" "}
                {selectedPatient.patient_phone} — {t("appt.changePatient")}
              </button>
            ) : name.trim().length > 0 ? (
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
                onChange={(e) => {
                  setPhone(e.target.value);
                  setSelectedPatient(null);
                  if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
                }}
                onFocus={() => {
                  setPhoneFocus(true);
                  setSuggestField("phone");
                  if (suggestions.length > 0 && !selectedPatient) setShowSuggest(true);
                }}
                onBlur={() => {
                  setPhoneFocus(false);
                  window.setTimeout(() => setShowSuggest(false), 150);
                }}
                placeholder="0781569010"
                inputMode="tel"
                className="ps-9"
                autoComplete="off"
              />
              {showSuggest && suggestField === "phone" && !selectedPatient && suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-hairline bg-surface-0 shadow-lg">
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickPatient(p);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-start hover:bg-surface-soft"
                    >
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: avatarColor(p.patient_name) }}
                      >
                        {initials(p.patient_name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {p.patient_name}
                        </span>
                        <span className="block truncate text-[12px] text-muted">
                          {p.patient_phone}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {fieldErrors.phone ? (
              <p className="mt-1 text-[12px] font-medium text-danger">{fieldErrors.phone}</p>
            ) : null}
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
                onChange={(e) => {
                  setDob(maskDob(e.target.value));
                  if (fieldErrors.dob) setFieldErrors((p) => ({ ...p, dob: undefined }));
                }}
                placeholder={t("appt.dobPlaceholder")}
                inputMode="numeric"
                className="ps-9"
                autoComplete="off"
              />
            </div>
            {fieldErrors.dob ? (
              <p className="mt-1 text-[12px] font-medium text-danger">{fieldErrors.dob}</p>
            ) : null}
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
            disabled={!canSubmit}
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