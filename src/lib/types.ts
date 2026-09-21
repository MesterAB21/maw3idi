export type AppointmentStatus =
  | "reserve"
  | "confirmation_envoyee"
  | "confirme"
  | "need_call"
  | "annule"
  | "termine"
  | "absent";

export type ContactChannel = "whatsapp" | "instagram" | "phone" | "manual" | "whatsapp_test" | "instagram_test" | "call_test" | "appel";

export type UserRole = "admin" | "secretaire";

export type PlanType = "standard" | "pro";

export type AdminAction = "confirmer" | "annuler";

export type Role = "ADMIN" | "SECRETARY";

export type Lang = "fr" | "ar";

export interface CommunicationEvent {
  id: string;
  time: string;
  description: string;
  kind: "sent" | "received" | "system" | "call";
  content?: string;
  fromPatient?: boolean;
}

export interface Patient {
  id: string;
  cabinet_id: string;
  patient_name: string;
  patient_phone: string;
  date_de_naissance?: string;
  contact_channel: ContactChannel;
  contact_id: string;
  created_at: string;
}

export interface PatientSummary {
  name: string;
  phone: string;
  dateOfBirth?: string;
  appointmentCount: number;
  lastAppointment: string;
}

export interface Appointment {
  id: string;
  cabinet_id: string;
  patient_id: string;
  patient?: Patient;
  status: AppointmentStatus;
  date_rendez_vous: string;
  duration_minutes: number;
  canal: ContactChannel;
  admin_action?: AdminAction;
  needs_call_at?: string;
  confirmation_sent_at?: string;
  confirmation_reply_at?: string;
  cancelled_at?: string;
  created_at: string;
  status_updated_by?: string;
  calendar_event_id?: string;
  calendar_deleted_at?: string;
  admin_action_processed_at?: string;
  internal_notes?: string;
  events?: AppointmentEvent[];

  // Derived/computed properties for UI compatibility
  /** @deprecated Use date_rendez_vous - ISO date string */
  date?: string;
  /** @deprecated Use date_rendez_vous - ISO date string */
  time?: string;
  /** @deprecated Use patient?.patient_name */
  patientName?: string;
  /** @deprecated Use patient?.patient_phone */
  phone?: string;
  /** @deprecated Use internal_notes */
  notes?: string;
  /** @deprecated Use events */
  thread?: AppointmentEvent[];
  /** @deprecated Not in backend - computed from last event */
  lastInteractionLabel?: string;
  /** @deprecated Not in backend - computed */
  lastInteractionHoursAgo?: number;
  /** @deprecated Not in backend - computed */
  updatedAt?: number;
  /** @deprecated Not in backend - appointment type */
  type?: string;
  /** @deprecated Use canal or computed from patient contact_channel */
  channel?: string;
  /** @deprecated Not in backend - action required text */
  actionRequired?: string;
  /** @deprecated Not in backend */
  actionLabel?: string;
  /** @deprecated Not in backend - computed from date_rendez_vous */
  dateOfBirth?: string;
}

export interface AppointmentEvent {
  id: string;
  appointment_id: string;
  event_type: string;
  attempt_number?: number;
  patient_message_excerpt?: string;
  previous_status?: AppointmentStatus;
  new_status?: AppointmentStatus;
  triggered_by?: string;
  occurred_at: string;

  // Derived/computed properties for UI compatibility
  /** @deprecated Use occurred_at */
  time?: string;
  /** @deprecated Use event_type */
  kind?: "sent" | "received" | "system" | "call";
  /** @deprecated Use patient_message_excerpt or event_type */
  description?: string;
  /** @deprecated Use patient_message_excerpt */
  content?: string;
  /** @deprecated Not in backend */
  fromPatient?: boolean;
}

export interface TeamMember {
  id: string;
  cabinet_id: string;
  role: UserRole;
  email: string;
  username: string;
  phone?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;

  // Derived/computed properties for UI compatibility
  /** @deprecated Use username */
  name?: string;
  /** @deprecated Use created_at */
  addedDate?: string;
  /** @deprecated Use is_active */
  active?: boolean;
}

export interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface DaySlot {
  enabled: boolean;
  slots: { start: string; end: string }[];
}

export interface Availability {
  days: {
    monday: DaySlot;
    tuesday: DaySlot;
    wednesday: DaySlot;
    thursday: DaySlot;
    friday: DaySlot;
    saturday: DaySlot;
    sunday: DaySlot;
  };
  needCallDelay: number;
  needCallDelayUnit: "minutes" | "hours";
  channels: {
    whatsapp: boolean;
    instagram: boolean;
    call: boolean;
  };
}

export interface Cabinet {
  id: string;
  nom_cabinet: string;
  nom_agent: string;
  localisation: string;
  maps_link?: string;
  liee_avec_google: boolean;
  description?: string;
  slot_duration_minutes: number;
  need_call_threshold_minutes: number;
  plan: PlanType;
  is_active: boolean;
  created_at: string;
}

export interface CabinetConfig {
  name: string;
  address: string;
  city: string;
  phone: string;
  plan: "STANDARD" | "PRO";
}

export interface User {
  id: string;
  cabinet_id?: string;
  role: UserRole;
  email: string;
  username: string;
  phone?: string;
  is_active: boolean;
  is_super_admin?: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
}

export interface DashboardStats {
  by_status: Record<AppointmentStatus, number>;
  today: {
    confirmed: number;
    total: number;
  };
  confirmation_rate: number;
}

export interface CalendarEvent {
  source: "maw3idi" | "google";
  appointment_id?: string;
  title: string;
  start: string;
  end: string;
  status?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterResponse {
  id: string;
  cabinet_id: string;
  role: UserRole;
  email: string;
  username: string;
  phone?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface GoogleCalendarStatus {
  connected: boolean;
  google_account_email?: string;
  connected_at?: string;
}

export interface AvailableSlotsResponse {
  date: string;
  slots: string[];
}