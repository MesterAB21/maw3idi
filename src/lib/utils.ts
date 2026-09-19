import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "#FB923C", // avatar-orange
  "#EC4899", // avatar-pink
  "#8B5CF6", // avatar-violet
  "#34D399", // avatar-emerald
  "#60A5FA", // avatar-blue
] as const;

/** Deterministic avatar color from a patient name (hash → one of the 5 pastel accents). */
export function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatPhone(phone: string) {
  return phone;
}

export function formatRelativeTime(hoursAgo: number) {
  if (hoursAgo < 1) {
    const mins = Math.round(hoursAgo * 60);
    return `Il y a ${mins}\u00a0min`;
  }
  if (hoursAgo < 24) return `Il y a ${Math.round(hoursAgo)}\u00a0h`;
  return `Il y a ${Math.round(hoursAgo / 24)}\u00a0j`;
}

export function formatDateFr(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateShort(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatDateLong(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}