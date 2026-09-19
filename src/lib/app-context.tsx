"use client";

import * as React from "react";

import { dictionary, isLang, type TKey } from "@/lib/i18n";
import { api } from "@/lib/api";
import type {
  Appointment,
  Cabinet,
  Lang,
  Role,
  User,
  UserRole,
  PlanType,
  DashboardStats,
  AvailableSlotsResponse,
  PaginatedResponse,
  GoogleCalendarStatus,
  TeamMember,
  Patient,
} from "@/lib/types";

export interface NewAppointmentInput {
  patientName: string;
  phone: string;
  type: string;
  date: string;
  time: string;
  dateOfBirth?: string;
}

export interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface AppState {
  // Data
  appointments: Appointment[];
  cabinet: Cabinet | null;
  cabinetName: string;
  user: User | null;
  authUser: { id: string; name: string; email: string; role: Role; initials: string; isSuperAdmin: boolean } | null;
  role: Role;
  lang: Lang;
  dir: "ltr" | "rtl";
  calendarConnected: boolean;
  dashboardStats: DashboardStats | null;
  teamMembers: TeamMember[];
  availability: AvailabilitySlot[];
  loading: boolean;
  error: string | null;

  // Actions
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
  setRole: (r: Role) => void;
  switchRole: () => void;

  // Auth
  /** Resolves to `true` when the authenticated user is a super admin. */
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: {
    nom_cabinet: string;
    nom_agent: string;
    localisation: string;
    description?: string;
    maps_link?: string;
    plan: "standard" | "pro";
    username: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  checkAuth: () => Promise<void>;

  // Appointments
  fetchAppointments: (params?: { page?: number; statuses?: string; date_from?: string; date_to?: string; patient_search?: string; sort?: "date_asc" | "date_desc" }) => Promise<void>;
  createAppointment: (input: NewAppointmentInput) => Promise<Appointment>;
  confirmAppointment: (id: string) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  markCompleted: (id: string) => Promise<void>;
  markNoShow: (id: string) => Promise<void>;
  updateAppointment: (id: string, data: Partial<{ date_rendez_vous: string; duration_minutes: number; internal_notes?: string }>) => Promise<void>;
  refreshDashboardStats: () => Promise<void>;

  // Drawer
  selectedId: string | null;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;

  // Cabinet
  fetchCabinet: () => Promise<void>;
  updateCabinet: (data: Partial<{ nom_cabinet: string; nom_agent: string; localisation: string; maps_link?: string; description?: string; slot_duration_minutes?: number; need_call_threshold_minutes?: number; plan?: "standard" | "pro"; is_active?: boolean }>) => Promise<void>;
  fetchAvailability: () => Promise<void>;
  updateAvailability: (availability: AvailabilitySlot[]) => Promise<void>;
  fetchAvailableSlots: (dateISO: string) => Promise<AvailableSlotsResponse>;
  fetchCalendar: (start: string, end: string) => Promise<{ data: Array<{ source: string; appointment_id?: string; title: string; start: string; end: string; status?: string }> }>;

  // Google Calendar
  connectGoogleCalendar: () => Promise<string>;
  fetchGoogleCalendarStatus: () => Promise<GoogleCalendarStatus>;
  disconnectGoogleCalendar: () => Promise<void>;
  syncGoogleCalendar: () => Promise<void>;

  // Team
  fetchTeam: () => Promise<void>;
  createTeamMember: (data: { email: string; username: string; phone?: string; role: "admin" | "secretaire"; password?: string }) => Promise<TeamMember & { temporary_password?: string }>;
  updateTeamMember: (user_id: string, data: Partial<{ role: "admin" | "secretaire"; is_active: boolean }>) => Promise<void>;
  deleteTeamMember: (user_id: string) => Promise<void>;

  // Patients
  createPatient: (data: { patient_name: string; patient_phone: string; date_de_naissance?: string; contact_channel: "whatsapp" | "instagram" | "phone" | "manual"; contact_id: string }) => Promise<Patient>;
  findOrCreatePatient: (data: { cabinet_id: string; patient_name: string; patient_phone: string; date_de_naissance?: string; contact_channel: "whatsapp" | "instagram" | "phone" | "manual"; contact_id: string }) => Promise<Patient>;
}

const AppContext = React.createContext<AppState | null>(null);

function readStorageOr<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function mapBackendRoleToFrontend(role: UserRole): Role {
  return role === "admin" ? "ADMIN" : "SECRETARY";
}

function mapBackendPlanToFrontend(plan: PlanType): "STANDARD" | "PRO" {
  return plan === "pro" ? "PRO" : "STANDARD";
}

function mapBackendUserToFrontend(user: User) {
  return {
    id: user.id,
    name: user.username,
    email: user.email,
    role: mapBackendRoleToFrontend(user.role),
    initials: getInitials(user.username),
    isSuperAdmin: user.is_super_admin ?? false,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [cabinet, setCabinet] = React.useState<Cabinet | null>(null);
  const [cabinetName, setCabinetName] = React.useState("");
  const [user, setUser] = React.useState<User | null>(null);
  const [authUser, setAuthUser] = React.useState<{ id: string; name: string; email: string; role: Role; initials: string; isSuperAdmin: boolean } | null>(null);
  const [role, setRole] = React.useState<Role>(() =>
    readStorageOr<Role>("maw3idi.role", "ADMIN")
  );
  const [lang, setLang] = React.useState<Lang>(() => {
    const stored = readStorageOr<string>("maw3idi.lang", "fr");
    return isLang(stored) ? stored : "fr";
  });
  const [calendarConnected, setCalendarConnected] = React.useState(false);
  const [dashboardStats, setDashboardStats] = React.useState<DashboardStats | null>(null);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [availability, setAvailability] = React.useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const t = React.useCallback(
    (key: TKey, vars?: Record<string, string | number>) => {
      const dict = dictionary[lang] ?? dictionary.fr;
      let str: string = dict[key] ?? dictionary.fr[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return str;
    },
    [lang]
  );

  React.useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
    document.body.classList.toggle("font-arabic", lang === "ar");
  }, [lang]);

  const persist = (key: string, value: unknown) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  };

  const setRoleAndPersist = React.useCallback(
    (r: Role) => {
      setRole(r);
      persist("maw3idi.role", r);
    },
    []
  );

  const setLangAndPersist = React.useCallback(
    (l: Lang) => {
      setLang(l);
      persist("maw3idi.lang", l);
    },
    []
  );

  const switchRole = React.useCallback(() => {
    setRoleAndPersist(role === "ADMIN" ? "SECRETARY" : "ADMIN");
  }, [role, setRoleAndPersist]);

  const setAuth = (u: User | null) => {
    setUser(u);
    if (u) {
      setAuthUser(mapBackendUserToFrontend(u));
      setRole(mapBackendRoleToFrontend(u.role));
      setCabinetName(`Cabinet ${u.cabinet_id ? "..." : ""}`);
    } else {
      setAuthUser(null);
    }
  };

  const checkAuth = React.useCallback(async () => {
    try {
      setLoading(true);
      const me = await api.me();
      setAuth(me);
      if (me?.cabinet_id) {
        await Promise.all([
          fetchCabinetData(me.cabinet_id),
          fetchAppointmentsData(),
          fetchDashboardStatsData(me.cabinet_id),
          fetchTeamData(me.cabinet_id),
          fetchAvailabilityData(me.cabinet_id),
          fetchGoogleCalendarStatusData(me.cabinet_id),
        ]);
      }
    } catch {
      setAuth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCabinetData = React.useCallback(async (cabinetId?: string) => {
    if (!cabinetId && !cabinet?.id) return;
    try {
      const cab = await api.getCabinet(cabinetId || cabinet!.id);
      setCabinet(cab);
      setCabinetName(cab.nom_cabinet);
    } catch (err) {
      console.error("Failed to fetch cabinet:", err);
    }
  }, [cabinet?.id]);

  const fetchAppointmentsData = React.useCallback(async (params?: {
    page?: number;
    statuses?: string;
    date_from?: string;
    date_to?: string;
    patient_search?: string;
    sort?: "date_asc" | "date_desc";
  }) => {
    try {
      const res = await api.listAppointments(params);
      setAppointments(res.data);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
      setError(t("errors.fetchAppointments"));
    }
  }, [t]);

  const fetchDashboardStatsData = React.useCallback(async (cabinetId: string) => {
    try {
      const stats = await api.getDashboardStats(cabinetId);
      setDashboardStats(stats);
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
    }
  }, []);

  const fetchTeamData = React.useCallback(async (cabinetId: string) => {
    try {
      const members = await api.listTeamMembers(cabinetId);
      setTeamMembers(members);
    } catch (err) {
      console.error("Failed to fetch team:", err);
    }
  }, []);

  const fetchAvailabilityData = React.useCallback(async (cabinetId: string) => {
    try {
      const avail = await api.getAvailability(cabinetId);
      setAvailability(avail);
    } catch (err) {
      console.error("Failed to fetch availability:", err);
    }
  }, []);

  const fetchGoogleCalendarStatusData = React.useCallback(async (cabinetId: string) => {
    try {
      const status = await api.getGoogleCalendarStatus(cabinetId);
      setCalendarConnected(status.connected);
    } catch (err) {
      console.error("Failed to fetch Google Calendar status:", err);
    }
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.login({ email, password });
      const me = await api.me();
      setAuth(me);
      if (me?.cabinet_id) {
        await Promise.all([
          fetchCabinetData(me.cabinet_id),
          fetchAppointmentsData(),
          fetchDashboardStatsData(me.cabinet_id),
          fetchTeamData(me.cabinet_id),
          fetchAvailabilityData(me.cabinet_id),
          fetchGoogleCalendarStatusData(me.cabinet_id),
        ]);
      }
      return me?.is_super_admin ?? false;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.login"));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [
    fetchCabinetData,
    fetchAppointmentsData,
    fetchDashboardStatsData,
    fetchTeamData,
    fetchAvailabilityData,
    fetchGoogleCalendarStatusData,
    t,
  ]);

  const register = React.useCallback(async (data: {
    nom_cabinet: string;
    nom_agent: string;
    localisation: string;
    description?: string;
    maps_link?: string;
    plan: "standard" | "pro";
    username: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      await api.register(data);
      await checkAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.register"));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [checkAuth, t]);

  const logout = React.useCallback(async () => {
    setLoading(true);
    try {
      await api.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Always clear the local session, even if the API call failed, then
      // hard-navigate to / so the /app notFound guard can never trap the
      // user on a 404 of the current page.
      setAuth(null);
      setCabinet(null);
      setAppointments([]);
      setDashboardStats(null);
      setTeamMembers([]);
      setAvailability([]);
      setCalendarConnected(false);
      setLoading(false);
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  }, []);

  const forgotPassword = React.useCallback(async (email: string) => {
    setError(null);
    try {
      await api.forgotPassword(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.forgotPassword"));
      throw err;
    }
  }, [t]);

  const resetPassword = React.useCallback(async (token: string, newPassword: string) => {
    setError(null);
    try {
      await api.resetPassword(token, newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.resetPassword"));
      throw err;
    }
  }, [t]);

  const createAppointment = React.useCallback(async (input: NewAppointmentInput): Promise<Appointment> => {
    if (!cabinet) throw new Error("No cabinet");
    try {
      const [d, m, y] = input.date.split("/");
      const dateTime = `${y}-${m}-${d}T${input.time}:00`;
      const patient = await api.findOrCreatePatient({
        cabinet_id: cabinet.id,
        patient_name: input.patientName,
        patient_phone: input.phone,
        date_de_naissance: input.dateOfBirth || undefined,
        contact_channel: "phone",
        contact_id: input.phone,
      });
      const appt = await api.createAppointment({
        patient_id: patient.id,
        date_rendez_vous: dateTime,
        duration_minutes: cabinet.slot_duration_minutes,
        canal: "phone",
      });
      setAppointments((prev) => [appt, ...prev]);
      await fetchDashboardStatsData(cabinet.id);
      return appt;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.createAppointment"));
      throw err;
    }
  }, [cabinet, fetchDashboardStatsData, t]);

  const confirmAppointment = React.useCallback(async (id: string) => {
    // Mise à jour optimiste (§9) : l'UI réagit immédiatement, rollback si erreur.
    const prev = appointments;
    setAppointments((list) =>
      list.map((a) => (a.id === id ? { ...a, status: "confirme" as const } : a))
    );
    try {
      await api.confirmAppointment(id);
      if (cabinet) await fetchDashboardStatsData(cabinet.id);
    } catch (err) {
      setAppointments(prev);
      setError(err instanceof Error ? err.message : t("errors.confirm"));
      throw err;
    }
  }, [appointments, cabinet, fetchDashboardStatsData, t]);

  const cancelAppointment = React.useCallback(async (id: string) => {
    const prev = appointments;
    setAppointments((list) =>
      list.map((a) => (a.id === id ? { ...a, status: "annule" as const } : a))
    );
    try {
      await api.cancelAppointment(id);
      if (cabinet) await fetchDashboardStatsData(cabinet.id);
    } catch (err) {
      setAppointments(prev);
      setError(err instanceof Error ? err.message : t("errors.cancel"));
      throw err;
    }
  }, [appointments, cabinet, fetchDashboardStatsData, t]);

  const markCompleted = React.useCallback(async (id: string) => {
    const prev = appointments;
    setAppointments((list) =>
      list.map((a) => (a.id === id ? { ...a, status: "termine" as const } : a))
    );
    try {
      await api.markCompleted(id);
      if (cabinet) await fetchDashboardStatsData(cabinet.id);
    } catch (err) {
      setAppointments(prev);
      setError(err instanceof Error ? err.message : t("errors.markCompleted"));
      throw err;
    }
  }, [appointments, cabinet, fetchDashboardStatsData, t]);

  const markNoShow = React.useCallback(async (id: string) => {
    const prev = appointments;
    setAppointments((list) =>
      list.map((a) => (a.id === id ? { ...a, status: "absent" as const } : a))
    );
    try {
      await api.markNoShow(id);
      if (cabinet) await fetchDashboardStatsData(cabinet.id);
    } catch (err) {
      setAppointments(prev);
      setError(err instanceof Error ? err.message : t("errors.markNoShow"));
      throw err;
    }
  }, [appointments, cabinet, fetchDashboardStatsData, t]);

  const updateAppointment = React.useCallback(async (id: string, data: Partial<{ date_rendez_vous: string; duration_minutes: number; internal_notes?: string }>) => {
    try {
      const updated = await api.updateAppointment(id, data);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updated } : a))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.updateAppointment"));
      throw err;
    }
  }, [t]);

  const refreshDashboardStats = React.useCallback(async () => {
    if (cabinet) await fetchDashboardStatsData(cabinet.id);
  }, [cabinet, fetchDashboardStatsData]);

  const updateCabinet = React.useCallback(async (data: Partial<{ nom_cabinet: string; nom_agent: string; localisation: string; maps_link?: string; description?: string; slot_duration_minutes?: number; need_call_threshold_minutes?: number; plan?: "standard" | "pro"; is_active?: boolean }>) => {
    if (!cabinet) return;
    try {
      const updated = await api.updateCabinet(cabinet.id, data);
      setCabinet(updated);
      setCabinetName(updated.nom_cabinet);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.updateCabinet"));
      throw err;
    }
  }, [cabinet, t]);

  const fetchAvailability = React.useCallback(async () => {
    if (!cabinet) return;
    await fetchAvailabilityData(cabinet.id);
  }, [cabinet, fetchAvailabilityData]);

  const updateAvailability = React.useCallback(async (avail: AvailabilitySlot[]) => {
    if (!cabinet) return;
    try {
      await api.replaceAvailability(cabinet.id, avail);
      setAvailability(avail);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.updateAvailability"));
      throw err;
    }
  }, [cabinet, t]);

  const fetchAvailableSlots = React.useCallback(async (date: string) => {
    if (!cabinet) return { date, slots: [] };
    return api.checkAvailableSlots(undefined, date);
  }, [cabinet]);

  const fetchCalendar = React.useCallback(async (start: string, end: string) => {
    if (!cabinet) return { data: [] };
    return api.getCalendar(cabinet.id, start, end);
  }, [cabinet]);

  const connectGoogleCalendar = React.useCallback(async () => {
    if (!cabinet) throw new Error("No cabinet");
    const res = await api.connectGoogleCalendar();
    return res.url;
  }, [cabinet]);

  const fetchGoogleCalendarStatus = React.useCallback(async () => {
    if (!cabinet) return { connected: false };
    return api.getGoogleCalendarStatus();
  }, [cabinet]);

  const disconnectGoogleCalendar = React.useCallback(async () => {
    if (!cabinet) return;
    try {
      await api.disconnectGoogleCalendar();
      setCalendarConnected(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.disconnectCalendar"));
      throw err;
    }
  }, [cabinet, t]);

  const syncGoogleCalendar = React.useCallback(async () => {
    if (!cabinet) return;
    try {
      await api.syncGoogleCalendar();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.syncCalendar"));
      throw err;
    }
  }, [cabinet, t]);

  const fetchTeam = React.useCallback(async () => {
    if (!cabinet) return;
    await fetchTeamData(cabinet.id);
  }, [cabinet, fetchTeamData]);

  const createTeamMember = React.useCallback(async (data: { email: string; username: string; phone?: string; role: "admin" | "secretaire"; password?: string }) => {
    if (!cabinet) throw new Error("No cabinet");
    const member = await api.createTeamMember(cabinet.id, data);
    await fetchTeamData(cabinet.id);
    return member;
  }, [cabinet, fetchTeamData]);

  const updateTeamMember = React.useCallback(async (user_id: string, data: Partial<{ role: "admin" | "secretaire"; is_active: boolean }>) => {
    try {
      await api.updateTeamMember(user_id, data);
      if (cabinet) await fetchTeamData(cabinet.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.updateTeam"));
      throw err;
    }
  }, [cabinet, fetchTeamData, t]);

  const deleteTeamMember = React.useCallback(async (user_id: string) => {
    try {
      await api.deleteTeamMember(user_id);
      if (cabinet) await fetchTeamData(cabinet.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.deleteTeam"));
      throw err;
    }
  }, [cabinet, fetchTeamData, t]);

  const createPatient = React.useCallback(async (data: { patient_name: string; patient_phone: string; date_de_naissance?: string; contact_channel: "whatsapp" | "instagram" | "phone" | "manual"; contact_id: string }) => {
    return api.createPatient(data);
  }, []);

  const findOrCreatePatient = React.useCallback(async (data: { cabinet_id: string; patient_name: string; patient_phone: string; date_de_naissance?: string; contact_channel: "whatsapp" | "instagram" | "phone" | "manual"; contact_id: string }) => {
    return api.findOrCreatePatient(data);
  }, []);

  const openDrawer = React.useCallback((id: string) => setSelectedId(id), []);
  const closeDrawer = React.useCallback(() => setSelectedId(null), []);

  const fetchAppointments = React.useCallback(async (params?: { page?: number; statuses?: string; date_from?: string; date_to?: string; patient_search?: string; sort?: "date_asc" | "date_desc" }) => {
    await fetchAppointmentsData(params);
  }, [fetchAppointmentsData]);

  const fetchCabinet = React.useCallback(async () => {
    if (user?.cabinet_id) await fetchCabinetData(user.cabinet_id);
  }, [user?.cabinet_id, fetchCabinetData]);

  const value: AppState = {
    appointments,
    cabinet,
    cabinetName,
    user,
    authUser,
    role,
    lang,
    dir: lang === "ar" ? "rtl" : "ltr",
    calendarConnected,
    dashboardStats,
    teamMembers,
    availability,
    loading,
    error,
    t,
    setLang: setLangAndPersist,
    setRole: setRoleAndPersist,
    switchRole,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    checkAuth,
    fetchAppointments,
    createAppointment,
    confirmAppointment,
    cancelAppointment,
    markCompleted,
    markNoShow,
    updateAppointment,
    refreshDashboardStats,
    selectedId,
    openDrawer,
    closeDrawer,
    fetchCabinet,
    updateCabinet,
    fetchAvailability,
    updateAvailability,
    fetchAvailableSlots,
    fetchCalendar,
    connectGoogleCalendar,
    fetchGoogleCalendarStatus,
    disconnectGoogleCalendar,
    syncGoogleCalendar,
    fetchTeam,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    createPatient,
    findOrCreatePatient,
  };

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}