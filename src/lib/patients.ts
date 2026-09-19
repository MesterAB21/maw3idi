import type { Appointment } from "./types";

export interface PatientSummary {
  name: string;
  phone: string;
  dateOfBirth?: string;
  appointmentCount: number;
  lastAppointment: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export function derivePatients(appointments: Appointment[]): PatientSummary[] {
  const map = new Map<string, PatientSummary>();
  for (const a of appointments) {
    const name = a.patient?.patient_name;
    const phone = a.patient?.patient_phone ?? "";
    if (!name && !phone) continue;
    const key = name || phone;
    const dateOfBirth = a.patient?.date_de_naissance;
    const date = a.date_rendez_vous;
    const existing = map.get(key);
    if (existing) {
      existing.appointmentCount += 1;
      if (date > existing.lastAppointment) existing.lastAppointment = formatDate(date);
      if (!existing.phone) existing.phone = phone;
      if (!existing.dateOfBirth) existing.dateOfBirth = dateOfBirth;
    } else {
      map.set(key, {
        name: name || phone,
        phone,
        dateOfBirth,
        appointmentCount: 1,
        lastAppointment: formatDate(date),
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}