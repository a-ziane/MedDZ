import {
  Bell,
  CalendarClock,
  ClipboardList,
  Clock4,
  Home,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import type { NavItem } from "@/components/layout/dashboard-shell";
import type { TranslationKey } from "@/lib/i18n/translations";

export function buildPatientNav(text: (key: TranslationKey) => string): NavItem[] {
  return [
    { href: "/patient", label: text("home"), icon: Home },
    { href: "/patient/doctors", label: text("searchDoctors"), icon: Users },
    { href: "/patient/appointments", label: text("myAppointments"), icon: CalendarClock },
    { href: "/patient/queue", label: text("queue"), icon: Clock4 },
  ];
}

export function buildDoctorNav(text: (key: TranslationKey) => string): NavItem[] {
  return [
    { href: "/doctor", label: text("home"), icon: Home },
    { href: "/doctor/availability", label: text("availability"), icon: CalendarClock },
    { href: "/doctor/requests", label: text("requests"), icon: ClipboardList },
    { href: "/doctor/queue", label: text("queue"), icon: Clock4 },
    { href: "/doctor/profile", label: text("profileSettings"), icon: Settings },
  ];
}

export function buildAdminNav(text: (key: TranslationKey) => string): NavItem[] {
  return [
    { href: "/admin", label: text("metrics"), icon: Shield },
    { href: "/admin/doctors", label: text("manageDoctors"), icon: Users },
    { href: "/admin/users", label: text("manageUsers"), icon: Bell },
  ];
}

// Legacy exports kept for compatibility with existing pages.
export const patientNav: NavItem[] = [
  { href: "/patient", label: "Home", icon: Home },
  { href: "/patient/doctors", label: "Search Doctors", icon: Users },
  { href: "/patient/appointments", label: "My Appointments", icon: CalendarClock },
  { href: "/patient/queue", label: "Queue", icon: Clock4 },
];

export const doctorNav: NavItem[] = [
  { href: "/doctor", label: "Home", icon: Home },
  { href: "/doctor/availability", label: "Availability", icon: CalendarClock },
  { href: "/doctor/requests", label: "Requests", icon: ClipboardList },
  { href: "/doctor/queue", label: "Queue", icon: Clock4 },
  { href: "/doctor/profile", label: "Profile Settings", icon: Settings },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Metrics", icon: Shield },
  { href: "/admin/doctors", label: "Manage Doctors", icon: Users },
  { href: "/admin/users", label: "Manage Users", icon: Bell },
];
