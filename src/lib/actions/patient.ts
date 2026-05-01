"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createNotification } from "@/lib/actions/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bookingSchema = z.object({
  doctor_id: z.string().uuid(),
  appointment_date: z.string(),
  appointment_time: z.string(),
  message_optional: z.string().max(400).optional(),
});

export type BookingActionState = {
  ok: boolean;
  error?: string;
  appointment?: {
    id: string;
    doctor_id: string;
    appointment_date: string;
    appointment_time: string;
    message_optional: string;
    status: "pending";
  };
  submittedAt?: number;
};

export type CancelActionState = {
  ok: boolean;
  error?: string;
  cancelledAppointmentId?: string;
  submittedAt?: number;
};

function toMinutes(time: string) {
  const normalized = time.match(/^(\d{1,2}):(\d{2})/);
  if (!normalized) return Number.NaN;
  const h = Number(normalized[1]);
  const m = Number(normalized[2]);
  return h * 60 + m;
}

function weekdayMatchesDate(slotWeekday: number, jsWeekday: number) {
  if (slotWeekday === jsWeekday) return true;
  if (((slotWeekday + 1) % 7) === jsWeekday) return true; // Monday=0 style
  if ((slotWeekday % 7) === jsWeekday) return true; // Monday=1 ... Sunday=7 style
  return false;
}

function getAlgeriaNowParts() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${pick("year")}-${pick("month")}-${pick("day")}`,
    time: `${pick("hour")}:${pick("minute")}`,
  };
}

function isPastInAlgeria(appointmentDate: string, appointmentTime: string) {
  const now = getAlgeriaNowParts();
  const time = appointmentTime.slice(0, 5);
  if (appointmentDate < now.date) return true;
  if (appointmentDate > now.date) return false;
  return time <= now.time;
}

function weekdayFromIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export async function requestAppointment(formData: FormData) {
  const user = await requireRole(["patient"]);
  const supabase = await createClient();

  const parsed = bookingSchema.safeParse({
    doctor_id: formData.get("doctor_id"),
    appointment_date: formData.get("appointment_date"),
    appointment_time: formData.get("appointment_time"),
    message_optional: formData.get("message_optional") ?? undefined,
  });

  if (!parsed.success) {
    return;
  }

  let { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!patient) {
    await supabase.from("patients").upsert({ user_id: user.id }, { onConflict: "user_id" });
    const fallback = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .single();
    patient = fallback.data ?? null;
    if (!patient) return;
  }

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, user_id, approved, suspended")
    .eq("id", parsed.data.doctor_id)
    .single();

  if (!doctor || !doctor.approved || doctor.suspended) {
    return;
  }

  if (isPastInAlgeria(parsed.data.appointment_date, parsed.data.appointment_time)) {
    return;
  }

  const weekday = weekdayFromIsoDate(parsed.data.appointment_date);
  const { data: availability } = await supabase
    .from("availability")
    .select("weekday, start_time, end_time, slot_minutes")
    .eq("doctor_id", parsed.data.doctor_id);

  const requestedMinutes = toMinutes(parsed.data.appointment_time);
  const isInsidePublishedSlot = (availability ?? []).some((slot) => {
    if (!weekdayMatchesDate(slot.weekday, weekday)) return false;
    const start = toMinutes(slot.start_time);
    const end = toMinutes(slot.end_time);
    if (requestedMinutes < start || requestedMinutes + slot.slot_minutes > end) return false;
    return (requestedMinutes - start) % slot.slot_minutes === 0;
  });

  if (!isInsidePublishedSlot) {
    return;
  }

  const adminSupabase = createAdminClient();
  const { data: duplicate } = await adminSupabase
    .from("appointments")
    .select("id")
    .eq("doctor_id", parsed.data.doctor_id)
    .eq("appointment_date", parsed.data.appointment_date)
    .eq("appointment_time", parsed.data.appointment_time)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  if (duplicate) {
    return;
  }

  await supabase.from("appointments").insert({
    patient_id: patient.id,
    doctor_id: parsed.data.doctor_id,
    appointment_date: parsed.data.appointment_date,
    appointment_time: parsed.data.appointment_time,
    message_optional: parsed.data.message_optional,
    status: "pending",
  });

  await createNotification(
    doctor.user_id,
    "New appointment request",
    `${user.full_name} sent a booking request for ${parsed.data.appointment_date} at ${parsed.data.appointment_time}.`,
  );

  revalidatePath("/patient");
  revalidatePath("/patient/appointments");
  revalidatePath(`/patient/doctors/${parsed.data.doctor_id}`);
  revalidatePath("/doctor/requests");
}

export async function requestAppointmentWithFeedback(
  _prevState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const user = await requireRole(["patient"]);
  const supabase = await createClient();

  const parsed = bookingSchema.safeParse({
    doctor_id: formData.get("doctor_id"),
    appointment_date: formData.get("appointment_date"),
    appointment_time: formData.get("appointment_time"),
    message_optional: formData.get("message_optional") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "invalid_payload", submittedAt: Date.now() };
  }

  if (!parsed.data.appointment_date || !parsed.data.appointment_time) {
    return { ok: false, error: "missing_slot", submittedAt: Date.now() };
  }

  let { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!patient) {
    await supabase.from("patients").upsert({ user_id: user.id }, { onConflict: "user_id" });
    const fallback = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .single();
    patient = fallback.data ?? null;
    if (!patient) return { ok: false, error: "patient_profile_missing", submittedAt: Date.now() };
  }

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, user_id, approved, suspended")
    .eq("id", parsed.data.doctor_id)
    .single();

  if (!doctor || !doctor.approved || doctor.suspended) {
    return { ok: false, error: "doctor_unavailable", submittedAt: Date.now() };
  }

  if (isPastInAlgeria(parsed.data.appointment_date, parsed.data.appointment_time)) {
    return { ok: false, error: "time_in_past", submittedAt: Date.now() };
  }

  const { data: duplicate } = await supabase
    .from("appointments")
    .select("id")
    .eq("doctor_id", parsed.data.doctor_id)
    .eq("appointment_date", parsed.data.appointment_date)
    .eq("appointment_time", parsed.data.appointment_time)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  if (duplicate) {
    return { ok: false, error: "slot_already_taken", submittedAt: Date.now() };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("appointments")
    .insert({
      patient_id: patient.id,
      doctor_id: parsed.data.doctor_id,
      appointment_date: parsed.data.appointment_date,
      appointment_time: parsed.data.appointment_time,
      message_optional: parsed.data.message_optional,
      status: "pending",
    })
    .select("id, doctor_id, appointment_date, appointment_time, message_optional, status")
    .single();

  if (insertError) {
    const msg = `${insertError.code ?? ""}|${insertError.message ?? ""}|${insertError.details ?? ""}`.toLowerCase();
    if (msg.includes("duplicate key") || msg.includes("appointments_unique_active_slot_idx") || insertError.code === "23505") {
      return { ok: false, error: "slot_already_taken", submittedAt: Date.now() };
    }
    if (msg.includes("row-level security") || msg.includes("permission denied") || insertError.code === "42501") {
      return { ok: false, error: "insert_blocked_by_rls", submittedAt: Date.now() };
    }
    return { ok: false, error: `insert_failed:${insertError.code ?? "unknown"}`, submittedAt: Date.now() };
  }

  if (!inserted) {
    return { ok: false, error: "insert_failed", submittedAt: Date.now() };
  }

  await createNotification(
    doctor.user_id,
    "New appointment request",
    `${user.full_name} sent a booking request for ${parsed.data.appointment_date} at ${parsed.data.appointment_time}.`,
  );

  revalidatePath("/patient");
  revalidatePath("/patient/appointments");
  revalidatePath(`/patient/doctors/${parsed.data.doctor_id}`);
  revalidatePath("/doctor/requests");

  return {
    ok: true,
    appointment: {
      id: inserted.id,
      doctor_id: inserted.doctor_id,
      appointment_date: inserted.appointment_date,
      appointment_time: inserted.appointment_time.slice(0, 5),
      message_optional: inserted.message_optional ?? "",
      status: "pending",
    },
    submittedAt: Date.now(),
  };
}

export async function cancelAppointmentByPatient(formData: FormData) {
  const user = await requireRole(["patient"]);
  const supabase = await createClient();
  const parsed = z.string().uuid().safeParse(formData.get("appointment_id"));
  if (!parsed.success) return;
  const appointmentId = parsed.data;

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!patient) {
    return;
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, appointment_date, appointment_time, status, doctor_id, doctors(user_id)")
    .eq("id", appointmentId)
    .eq("patient_id", patient.id)
    .single();

  if (!appointment) {
    return;
  }

  if (appointment.status !== "pending" && appointment.status !== "approved") {
    return;
  }

  if (appointment.status === "approved") {
    const today = new Date().toISOString().slice(0, 10);
    if (appointment.appointment_date < today) {
      return;
    }
  }

  if (appointment.status === "cancelled_by_patient") {
    return;
  }

  await supabase
    .from("appointments")
    .update({ status: "cancelled_by_patient" })
    .eq("id", appointmentId);

  try {
    const admin = createAdminClient();
    await admin.from("queue_entries").delete().eq("appointment_id", appointmentId);
  } catch {
    // Keep cancellation working even if admin env is missing.
  }

  const doctorUser = (appointment.doctors as { user_id?: string } | null)?.user_id;
  if (doctorUser) {
    await createNotification(
      doctorUser,
      "Appointment cancelled",
      `${user.full_name} cancelled an upcoming appointment.`,
    );
  }

  revalidatePath("/patient/appointments");
  revalidatePath("/doctor");
  revalidatePath("/doctor/requests");
  revalidatePath(`/patient/doctors/${appointment.doctor_id}`);
  revalidatePath("/doctor/queue");
  revalidatePath("/patient/queue");
}

export async function cancelAppointmentByPatientWithFeedback(
  _prevState: CancelActionState,
  formData: FormData,
): Promise<CancelActionState> {
  const user = await requireRole(["patient"]);
  const supabase = await createClient();
  const parsed = z.string().uuid().safeParse(formData.get("appointment_id"));
  if (!parsed.success) return { ok: false, error: "invalid_appointment", submittedAt: Date.now() };
  const appointmentId = parsed.data;

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!patient) {
    return { ok: false, error: "patient_profile_missing", submittedAt: Date.now() };
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, appointment_date, appointment_time, status, doctor_id, doctors(user_id)")
    .eq("id", appointmentId)
    .eq("patient_id", patient.id)
    .single();

  if (!appointment) {
    return { ok: false, error: "appointment_not_found", submittedAt: Date.now() };
  }

  if (appointment.status !== "pending" && appointment.status !== "approved") {
    return { ok: false, error: "cannot_cancel_status", submittedAt: Date.now() };
  }

  if (appointment.status === "approved") {
    const today = new Date().toISOString().slice(0, 10);
    if (appointment.appointment_date < today) {
      return { ok: false, error: "cannot_cancel_past", submittedAt: Date.now() };
    }
  }

  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status: "cancelled_by_patient" })
    .eq("id", appointmentId);

  if (updateError) {
    return { ok: false, error: "cancel_update_failed", submittedAt: Date.now() };
  }

  try {
    const admin = createAdminClient();
    await admin.from("queue_entries").delete().eq("appointment_id", appointmentId);
  } catch {
    // Keep cancellation working even if admin env is missing.
  }

  const doctorUser = (appointment.doctors as { user_id?: string } | null)?.user_id;
  if (doctorUser) {
    await createNotification(
      doctorUser,
      "Appointment cancelled",
      `${user.full_name} cancelled an upcoming appointment.`,
    );
  }

  revalidatePath("/patient/appointments");
  revalidatePath("/doctor");
  revalidatePath("/doctor/requests");
  revalidatePath(`/patient/doctors/${appointment.doctor_id}`);
  revalidatePath("/doctor/queue");
  revalidatePath("/patient/queue");

  return { ok: true, cancelledAppointmentId: appointmentId, submittedAt: Date.now() };
}

export async function updatePendingAppointmentMessageByPatient(formData: FormData) {
  const user = await requireRole(["patient"]);
  const supabase = await createClient();
  const payload = z
    .object({
      appointment_id: z.string().uuid(),
      message_optional: z.string().max(400),
    })
    .safeParse({
      appointment_id: formData.get("appointment_id"),
      message_optional: formData.get("message_optional") ?? "",
    });

  if (!payload.success) return;

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!patient) return;

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, doctor_id, status")
    .eq("id", payload.data.appointment_id)
    .eq("patient_id", patient.id)
    .single();

  if (!appointment || appointment.status !== "pending") return;

  await supabase
    .from("appointments")
    .update({ message_optional: payload.data.message_optional })
    .eq("id", payload.data.appointment_id);

  revalidatePath("/patient/appointments");
  revalidatePath("/doctor/requests");
  revalidatePath(`/patient/doctors/${appointment.doctor_id}`);
}
