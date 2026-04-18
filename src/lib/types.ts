export type Role = "patient" | "doctor" | "admin";
export type Locale = "en" | "fr" | "ar";

export type AppointmentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled_by_patient"
  | "cancelled_by_doctor"
  | "completed";

export type QueueStatus = "waiting" | "in_progress" | "done" | "skipped";

export interface AppUser {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  phone?: string | null;
  language: Locale;
}
