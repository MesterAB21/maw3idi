"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { TKey } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { AvailabilitySlot } from "@/lib/types";
import { api } from "@/lib/api";

const DAY_ORDER = [
  { key: "monday", label: "day.monday" },
  { key: "tuesday", label: "day.tuesday" },
  { key: "wednesday", label: "day.wednesday" },
  { key: "thursday", label: "day.thursday" },
  { key: "friday", label: "day.friday" },
  { key: "saturday", label: "day.saturday" },
  { key: "sunday", label: "day.sunday" },
] as const;

type DayKey = (typeof DAY_ORDER)[number]["key"];

export interface AvailabilityFormHandle {
  /** Persists current slots via onSave. Resolves false when nothing to save. */
  save: () => Promise<boolean>;
}

const slotsEqual = (a: AvailabilitySlot[], b: AvailabilitySlot[]) =>
  JSON.stringify(a) === JSON.stringify(b);

export const AvailabilityForm = React.forwardRef<
  AvailabilityFormHandle,
  {
    onSave?: (availability: AvailabilitySlot[]) => Promise<void>;
    initialDuration?: number;
    cabinetId?: string;
    /** When true, no internal save button/toast: the parent saves via ref. */
    hideSaveButton?: boolean;
    /** Reports whether slots differ from the last loaded/saved snapshot. */
    onDirtyChange?: (dirty: boolean) => void;
  }
>(function AvailabilityForm(
  { onSave, initialDuration = 30, cabinetId, hideSaveButton = false, onDirtyChange },
  ref
) {
  const { t, availability, fetchAvailability } = useApp();
  const { toast } = useToast();
  const [slots, setSlots] = React.useState<AvailabilitySlot[]>([]);
  const [savedSnapshot, setSavedSnapshot] = React.useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const isStandalone = Boolean(cabinetId);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (isStandalone && cabinetId) {
        try {
          const data = await api.getAvailability(cabinetId);
          if (!cancelled) {
            setSlots(data);
            setSavedSnapshot(data);
          }
        } catch (err) {
          console.error("Failed to fetch availability:", err);
        }
      } else {
        await fetchAvailability();
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchAvailability, isStandalone, cabinetId]);

  React.useEffect(() => {
    if (!isStandalone && availability.length > 0) {
      setSlots(availability);
      setSavedSnapshot(availability);
    }
  }, [availability, isStandalone]);

  const dirty = React.useMemo(
    () => !slotsEqual(slots, savedSnapshot),
    [slots, savedSnapshot]
  );

  React.useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const updateSlot = (index: number, patch: Partial<AvailabilitySlot>) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  };

  const addSlot = (dayOfWeek: number) => {
    setSlots((prev) => [
      ...prev,
      { day_of_week: dayOfWeek, start_time: "09:00", end_time: "12:00", is_active: true },
    ]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const persist = async (showToast: boolean): Promise<boolean> => {
    if (!onSave || saving) return false;
    setSaving(true);
    try {
      await onSave(slots);
      setSavedSnapshot(slots);
      if (showToast) toast(t("avail.saved"), "success");
      return true;
    } catch (err) {
      console.error(err);
      if (showToast) toast(t("avail.saveError"), "danger");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  React.useImperativeHandle(ref, () => ({
    save: () => persist(false),
  }), [ref, persist]);

  const handleSave = async () => {
    try {
      await persist(true);
    } catch {
      /* toast already shown */
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-hairline bg-canvas p-6 shadow-card">
        <div className="flex flex-col gap-3">
          {DAY_ORDER.map((day) => (
            <div key={day.key} className="animate-pulse h-24 rounded-lg border border-hairline bg-surface-soft" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-hairline bg-canvas p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="mb-1 text-title-md text-ink">{t("avail.title")}</h3>
          <p className="text-body-sm text-muted">{t("avail.subtitle")}</p>
        </div>
        {!hideSaveButton ? (
          <Button variant="primary" onClick={handleSave} disabled={saving || !dirty}>
            {t("common.save")}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {DAY_ORDER.map(({ key, label }) => {
          const dayIndex = DAY_ORDER.findIndex((d) => d.key === key);
          const daySlots = slots.filter((s) => s.day_of_week === dayIndex);
          const dayEnabled = daySlots.length > 0 && daySlots.some((s) => s.is_active);
          const dayLabel = t(label as TKey);
          return (
            <div
              key={key}
              className={cn(
                "grid grid-cols-1 items-start gap-3 rounded-lg border border-hairline p-4 transition-colors duration-150 md:grid-cols-[1fr_auto]",
                !dayEnabled && "opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <Switch
                  checked={dayEnabled}
                  onCheckedChange={() => {
                    if (!dayEnabled) {
                      addSlot(dayIndex);
                    } else {
                      setSlots((prev) =>
                        prev.map((s) =>
                          s.day_of_week === dayIndex ? { ...s, is_active: false } : s
                        )
                      );
                    }
                  }}
                  aria-label={t("avail.enableDay", { day: dayLabel })}
                />
                <span className="text-title-sm text-ink">{dayLabel}</span>
              </div>

              <div className="flex flex-col gap-2 md:items-end">
                {daySlots.length === 0 ? (
                  <p className="text-body-sm text-muted">{t("avail.noSlot")}</p>
                ) : (
                  daySlots.map((slot, idx) => {
                    const globalIdx = slots.findIndex((s) => s === slot);
                    return (
                      <div key={globalIdx} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={slot.start_time.slice(0, 5)}
                          onChange={(e) => updateSlot(globalIdx, { start_time: e.target.value + ":00" })}
                          className="h-9 w-28"
                          aria-label={t("avail.slotStart", { n: idx + 1, day: dayLabel })}
                        />
                        <span className="text-muted">—</span>
                        <Input
                          type="time"
                          value={slot.end_time.slice(0, 5)}
                          onChange={(e) => updateSlot(globalIdx, { end_time: e.target.value + ":00" })}
                          className="h-9 w-28"
                          aria-label={t("avail.slotEnd", { n: idx + 1, day: dayLabel })}
                        />
                        <Button
                          variant="icon-ghost"
                          className="text-danger hover:bg-status-cancelled-bg"
                          onClick={() => removeSlot(globalIdx)}
                          disabled={daySlots.length <= 1}
                          aria-label={t("avail.removeSlot", { n: idx + 1, day: dayLabel })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start md:self-end"
                  onClick={() => addSlot(dayIndex)}
                >
                  <Plus className="size-4" />
                  {t("avail.addSlot")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
