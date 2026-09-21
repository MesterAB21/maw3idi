import type {
  Appointment,
  Cabinet,
  User,
  Patient,
  TeamMember,
  DashboardStats,
  AvailableSlotsResponse,
  GoogleCalendarStatus,
  LoginResponse,
  RegisterResponse,
  PaginatedResponse,
  AvailabilitySlot,
} from "@/lib/types";

const API_BASE = "/api/v1";

function buildHeaders(_includeAuth = true): HeadersInit {
  return {
    "Content-Type": "application/json",
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  async register(data: {
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
  }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: buildHeaders(false),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async login(data: { email: string; password: string }): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: buildHeaders(false),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async logout() {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async me(): Promise<User> {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async getWsToken(): Promise<{ token: string; ws_url: string }> {
    const res = await fetch(`${API_BASE}/realtime/ws-token`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async listNotifications(params?: { unread_only?: boolean; page?: number; page_size?: number }): Promise<{
    data: Array<{ id: string; type: string; title: string; body?: string; appointment_id?: string; is_read: boolean; created_at: string }>;
    total: number;
    unread: number;
    page: number;
    page_size: number;
  }> {
    const search = new URLSearchParams();
    if (params?.unread_only) search.set("unread_only", "true");
    if (params?.page) search.set("page", String(params.page));
    if (params?.page_size) search.set("page_size", String(params.page_size));
    const res = await fetch(`${API_BASE}/notifications?${search}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async markNotificationRead(id: string) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead(): Promise<{ marked: number }> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async updateMe(data: { username?: string; phone?: string }) {
    const res = await fetch(`${API_BASE}/users/me`, {
      method: "PATCH",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${API_BASE}/auth/forget-password`, {
      method: "POST",
      headers: buildHeaders(false),
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  async resetPassword(token: string, new_password: string) {
    const res = await fetch(`${API_BASE}/auth/reset-password/${token}`, {
      method: "POST",
      headers: buildHeaders(false),
      credentials: "include",
      body: JSON.stringify({ new_password }),
    });
    return handleResponse(res);
  },

  // Google OAuth URLs
  getGoogleAuthUrl() {
    return `${API_BASE}/auth/google`;
  },

  // Patients
  async listPatients(params?: { search?: string; page?: number; page_size?: number }): Promise<PaginatedResponse<Patient>> {
    const search = new URLSearchParams();
    if (params?.search) search.set("search", params.search);
    if (params?.page) search.set("page", String(params.page));
    if (params?.page_size) search.set("page_size", String(params.page_size));
    const res = await fetch(`${API_BASE}/patients?${search}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async getPatient(id: string): Promise<Patient> {
    const res = await fetch(`${API_BASE}/patients/${id}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async createPatient(data: {
    patient_name: string;
    patient_phone: string;
    date_de_naissance?: string;
    contact_channel: "whatsapp" | "instagram" | "phone" | "manual";
    contact_id: string;
  }): Promise<Patient> {
    const res = await fetch(`${API_BASE}/patients`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updatePatient(id: string, data: Partial<{ patient_name: string; patient_phone: string; date_de_naissance?: string }>): Promise<Patient> {
    const res = await fetch(`${API_BASE}/patients/${id}`, {
      method: "PATCH",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async findOrCreatePatient(data: {
    cabinet_id: string;
    patient_name: string;
    patient_phone: string;
    date_de_naissance?: string;
    contact_channel: "whatsapp" | "instagram" | "phone" | "manual";
    contact_id: string;
  }): Promise<Patient> {
    const res = await fetch(`${API_BASE}/patients/find-or-create`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async lookupPatient(cabinet_id: string, contact_id: string) {
    const res = await fetch(`${API_BASE}/patients/lookup?cabinet_id=${cabinet_id}&contact_id=${contact_id}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  // Appointments
  async listAppointments(params?: {
    statuses?: string;
    date_from?: string;
    date_to?: string;
    patient_search?: string;
    sort?: "date_asc" | "date_desc";
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Appointment>> {
    const search = new URLSearchParams();
    if (params?.statuses) search.set("statuses", params.statuses);
    if (params?.date_from) search.set("date_from", params.date_from);
    if (params?.date_to) search.set("date_to", params.date_to);
    if (params?.patient_search) search.set("patient_search", params.patient_search);
    if (params?.sort) search.set("sort", params.sort);
    if (params?.page) search.set("page", String(params.page));
    if (params?.page_size) search.set("page_size", String(params.page_size));
    const res = await fetch(`${API_BASE}/appointments?${search}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async getAppointment(id: string): Promise<Appointment> {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async createAppointment(data: {
    patient_id: string;
    date_rendez_vous: string;
    duration_minutes?: number;
    canal: "whatsapp" | "instagram" | "phone" | "manual";
  }): Promise<Appointment> {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateAppointment(id: string, data: Partial<{ date_rendez_vous: string; duration_minutes: number; internal_notes?: string }>): Promise<Appointment> {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: "PATCH",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async postAppointmentEvent(id: string, data: {
    event_type: string;
    attempt_number?: number;
    patient_message_excerpt?: string;
    new_status?: string;
  }): Promise<Appointment> {
    const res = await fetch(`${API_BASE}/appointments/${id}/events`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async confirmAppointment(id: string): Promise<Appointment> {
    const res = await fetch(`${API_BASE}/appointments/${id}/confirm`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async cancelAppointment(id: string): Promise<Appointment> {
    const res = await fetch(`${API_BASE}/appointments/${id}/cancel`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async markCompleted(id: string): Promise<Appointment> {
    const res = await fetch(`${API_BASE}/appointments/${id}/mark-completed`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async markNoShow(id: string): Promise<Appointment> {
    const res = await fetch(`${API_BASE}/appointments/${id}/mark-no-show`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  // Cabinets
  async getCabinet(id: string): Promise<Cabinet> {
    const res = await fetch(`${API_BASE}/cabinets/${id}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async updateCabinet(id: string, data: Partial<{
    nom_cabinet: string;
    nom_agent: string;
    localisation: string;
    maps_link?: string;
    description?: string;
    slot_duration_minutes?: number;
    need_call_threshold_minutes?: number;
    plan?: "standard" | "pro";
    is_active?: boolean;
  }>): Promise<Cabinet> {
    const res = await fetch(`${API_BASE}/cabinets/${id}`, {
      method: "PATCH",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getAvailability(cabinet_id: string): Promise<AvailabilitySlot[]> {
    const res = await fetch(`${API_BASE}/cabinets/${cabinet_id}/availability`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async replaceAvailability(cabinet_id: string, availability: AvailabilitySlot[]): Promise<AvailabilitySlot[]> {
    const res = await fetch(`${API_BASE}/cabinets/${cabinet_id}/availability`, {
      method: "PUT",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify({ availability }),
    });
    return handleResponse(res);
  },

  async getAvailableSlots(cabinet_id: string, date: string): Promise<AvailableSlotsResponse> {
    const res = await fetch(`${API_BASE}/cabinets/${cabinet_id}/available-slots?date=${date}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  /** Real bookable times for a day (working hours − appointments − Google busy).
   *  `date` must be YYYY-MM-DD. Dashboard users are scoped to their own
   *  cabinet; pass `cabinetId` explicitly for admin/agent cross-cabinet use. */
  async checkAvailableSlots(cabinetId: string | undefined, date: string): Promise<AvailableSlotsResponse> {
    const qs = cabinetId ? `?cabinet_id=${cabinetId}&date=${date}` : `?date=${date}`;
    const res = await fetch(`${API_BASE}/appointments/check-available-slots${qs}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async getDashboardStats(cabinet_id: string): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/cabinets/${cabinet_id}/dashboard-stats`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async getCalendar(cabinet_id: string, start: string, end: string): Promise<{ data: Array<{ source: string; appointment_id?: string; title: string; start: string; end: string; status?: string }> }> {
    const res = await fetch(`${API_BASE}/cabinets/${cabinet_id}/calendar?start=${start}&end=${end}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  // Integrations (Google Calendar)
  async connectGoogleCalendar(cabinetId?: string): Promise<{ url: string }> {
    const qs = cabinetId ? `?cabinet_id=${cabinetId}` : "";
    const res = await fetch(`${API_BASE}/integrations/google-calendar/connect${qs}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async getGoogleCalendarStatus(cabinetId?: string): Promise<GoogleCalendarStatus> {
    const qs = cabinetId ? `?cabinet_id=${cabinetId}` : "";
    const res = await fetch(`${API_BASE}/integrations/google-calendar/status${qs}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async disconnectGoogleCalendar(cabinetId?: string): Promise<void> {
    const qs = cabinetId ? `?cabinet_id=${cabinetId}` : "";
    const res = await fetch(`${API_BASE}/integrations/google-calendar${qs}`, {
      method: "DELETE",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async syncGoogleCalendar(cabinetId?: string): Promise<void> {
    const qs = cabinetId ? `?cabinet_id=${cabinetId}` : "";
    const res = await fetch(`${API_BASE}/integrations/sync${qs}`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  // Team
  async listTeamMembers(cabinet_id: string): Promise<TeamMember[]> {
    const res = await fetch(`${API_BASE}/cabinets/${cabinet_id}/users`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async createTeamMember(cabinet_id: string, data: {
    email: string;
    username: string;
    phone?: string;
    role: "admin" | "secretaire";
    password?: string;
  }): Promise<TeamMember & { temporary_password?: string }> {
    const res = await fetch(`${API_BASE}/cabinets/${cabinet_id}/users`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateTeamMember(user_id: string, data: Partial<{ role: "admin" | "secretaire"; is_active: boolean }>): Promise<TeamMember> {
    const res = await fetch(`${API_BASE}/users/${user_id}`, {
      method: "PATCH",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteTeamMember(user_id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/users/${user_id}`, {
      method: "DELETE",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  // Super Admin
  async superadminStats(): Promise<{
    total_cabinets: number;
    active_cabinets: number;
    total_users: number;
    active_users: number;
    super_admins: number;
  }> {
    const res = await fetch(`${API_BASE}/superadmin/stats`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async listSuperAdminCabinets(params?: {
    page?: number;
    page_size?: number;
    search?: string;
  }): Promise<PaginatedResponse<any>> {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.page_size) search.set("page_size", String(params.page_size));
    if (params?.search) search.set("search", params.search);
    const res = await fetch(`${API_BASE}/superadmin/cabinets?${search}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async createSuperAdminCabinet(data: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${API_BASE}/superadmin/cabinets`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateSuperAdminCabinet(id: string, data: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${API_BASE}/superadmin/cabinets/${id}`, {
      method: "PATCH",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteSuperAdminCabinet(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/superadmin/cabinets/${id}`, {
      method: "DELETE",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async listSuperAdminUsers(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    cabinet_id?: string;
  }): Promise<PaginatedResponse<any>> {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.page_size) search.set("page_size", String(params.page_size));
    if (params?.search) search.set("search", params.search);
    if (params?.cabinet_id) search.set("cabinet_id", params.cabinet_id);
    const res = await fetch(`${API_BASE}/superadmin/users?${search}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async createSuperAdminUser(data: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${API_BASE}/superadmin/users`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateSuperAdminUser(id: string, data: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${API_BASE}/superadmin/users/${id}`, {
      method: "PATCH",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteSuperAdminUser(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/superadmin/users/${id}`, {
      method: "DELETE",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  // Cabinet Channels
  async listSuperAdminCabinetChannels(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    cabinet_id?: string;
  }): Promise<PaginatedResponse<any>> {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.page_size) search.set("page_size", String(params.page_size));
    if (params?.search) search.set("search", params.search);
    if (params?.cabinet_id) search.set("cabinet_id", params.cabinet_id);
    const res = await fetch(`${API_BASE}/superadmin/cabinet-channels?${search}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async createSuperAdminCabinetChannel(data: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${API_BASE}/superadmin/cabinet-channels`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateSuperAdminCabinetChannel(id: string, data: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${API_BASE}/superadmin/cabinet-channels/${id}`, {
      method: "PATCH",
      headers: buildHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteSuperAdminCabinetChannel(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/superadmin/cabinet-channels/${id}`, {
      method: "DELETE",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  // Super admin dashboard + errors
  async getSuperAdminDashboardStats(cabinetId?: string): Promise<Record<string, number>> {
    const search = new URLSearchParams();
    if (cabinetId && cabinetId !== "all") search.set("cabinet_id", cabinetId);
    const res = await fetch(`${API_BASE}/superadmin/dashboard-stats?${search}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async listSuperAdminErrors(params?: {
    source?: string;
    proceeded?: boolean;
    cabinet_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<any>> {
    const search = new URLSearchParams();
    if (params?.source) search.set("source", params.source);
    if (params?.proceeded !== undefined) search.set("proceeded", String(params.proceeded));
    if (params?.cabinet_id) search.set("cabinet_id", params.cabinet_id);
    if (params?.page) search.set("page", String(params.page));
    if (params?.page_size) search.set("page_size", String(params.page_size));
    const res = await fetch(`${API_BASE}/superadmin/errors?${search}`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async proceedSuperAdminError(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/superadmin/errors/${id}/proceed`, {
      method: "PATCH",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  // Test mode (/test) — per-browser test cabinet
  async testStatus(): Promise<{
    initialized: boolean;
    cabinet_id?: string;
    cabinet_name?: string;
  }> {
    const res = await fetch(`${API_BASE}/test/status`, {
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },

  async testInit(restoreId?: string): Promise<{
    initialized: boolean;
    cabinet_id: string;
    cabinet_name: string;
    agent_name: string;
    channels: Array<{ channel_type: string; channel_identifier: string }>;
    patients: Array<{ contact_id: string; name: string; phone: string; channel: string }>;
    google_connected: boolean;
  }> {
    const query = restoreId ? `?restore=${encodeURIComponent(restoreId)}` : "";
    const res = await fetch(`${API_BASE}/test/init${query}`, {
      method: "POST",
      headers: buildHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },
};

export type { };