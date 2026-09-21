/**
 * MAW3IDI stores appointment civil time as UTC wall-clock: "2026-09-21T10:00:00Z"
 * means 10:00 for the cabinet, whatever the browser timezone. Availability slots
 * use the same civil strings, so every view must render `date_rendez_vous` with
 * its hour/minute as-is. A naive `new Date(iso).toLocaleTimeString()` would add
 * the browser's UTC offset (e.g. +1h in Algeria), shifting RDV vs their slots.
 */

export function formatApptTime(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

/** Civil date (DD/MM/YYYY) of the appointment, derived from the stored value. */
export function formatApptDate(iso: string): string {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return iso;
  }
}