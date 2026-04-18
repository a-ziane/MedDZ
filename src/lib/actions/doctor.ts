"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createNotification } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";

async function ensureApprovedDoctor(userId: string) {
  const supabase = await createClient();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, approved, suspended")
    .eq("user_id", userId)
    .single();

  if (!doctor || !doctor.approved || doctor.suspended) {
    throw new Error("Doctor account is not approved.");
  }

  return doctor.id;
}

export async function saveAvailability(formData: FormData) {
  const user = await requireRole(["doctor"]);
  const supabase = await createClient();

  const payload = z
    .object({
      weekday: z.coerce.number().min(0).max(6),
      start_time: z.string().regex(/^\d{2}:\d{2}$/),
      end_time: z.string().regex(/^\d{2}:\d{2}$/),
      slot_minutes: z.coerce.number().min(10).max(60),
    })
    .parse({
      weekday: formData.get("weekday"),
      start_time: formData.get("start_time"),
      end_time: formData.get("end_time"),
      slot_minutes: formData.get("slot_minutes"),
    });

  const doctorId = await ensureApprovedDoctor(user.id);

  await supabase.from("availability").insert({
    doctor_id: doctorId,
    ...payload,
  });

  revalidatePath("/doctor/availability");
}

export async function removeAvailability(formData: FormData) {
  await requireRole(["doctor"]);
  const supabase = await createClient();
  const availabilityId = z.string().uuid().parse(formData.get("availability_id"));

  await supabase.from("availability").delete().eq("id", availabilityId);
  revalidatePath("/doctor/availability");
}

export async function approveAppointment(formData: FormData) {
  const user = await requireRole(["doctor"]);
  const supabase = await createClient();
  const appointmentId = z.string().uuid().parse(formData.get("appointment_id"));
  const doctorId = await ensureApprovedDoctor(user.id);

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, patient_id, patients(user_id)")
    .eq("id", appointmentId)
    .eq("doctor_id", doctorId)
    .single();

  if (!appointment) throw new Error("Appointment not found");

  await supabase.from("appointments").update({ status: "approved" }).eq("id", appointmentId);

  const patientUser = (appointment.patients as { user_id?: string } | null)?.user_id;
  if (patientUser) {
    await createNotification(
      patientUser,
      "Appointment approved",
      "Your booking request has been approved.",
    );
  }

  revalidatePath("/doctor/requests");
  revalidatePath("/patient/appointments");
}

export async function rejectAppointment(formData: FormData) {
  const user = await requireRole(["doctor"]);
  const supabase = await createClient();
  const appointmentId = z.string().uuid().parse(formData.get("appointment_id"));
  const doctorId = await ensureApprovedDoctor(user.id);

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, patients(user_id)")
    .eq("id", appointmentId)
    .eq("doctor_id", doctorId)
    .single();

  if (!appointment) throw new Error("Appointment not found");

  await supabase.from("appointments").update({ status: "rejected" }).eq("id", appointmentId);

  const patientUser = (appointment.patients as { user_id?: string } | null)?.user_id;
  if (patientUser) {
    await createNotification(
      patientUser,
      "Appointment rejected",
      "Your booking request was rejected by the doctor.",
    );
  }

  revalidatePath("/doctor/requests");
  revalidatePath("/patient/appointments");
}

export async function cancelAppointmentByDoctor(formData: FormData) {
  const user = await requireRole(["doctor"]);
  const supabase = await createClient();
  const appointmentId = z.string().uuid().parse(formData.get("appointment_id"));
  const doctorId = await ensureApprovedDoctor(user.id);

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, patients(user_id)")
    .eq("id", appointmentId)
    .eq("doctor_id", doctorId)
    .single();

  if (!appointment) throw new Error("Appointment not found");

  await supabase
    .from("appointments")
    .update({ status: "cancelled_by_doctor" })
    .eq("id", appointmentId);

  const patientUser = (appointment.patients as { user_id?: string } | null)?.user_id;
  if (patientUser) {
    await createNotification(
      patientUser,
      "Appointment cancelled",
      "Your appointment was cancelled by the doctor.",
    );
  }

  revalidatePath("/doctor");
  revalidatePath("/patient/appointments");
}

export async function checkInPatient(formData: FormData) {
  const user = await requireRole(["doctor"]);
  const supabase = await createClient();
  const appointmentId = z.string().uuid().parse(formData.get("appointment_id"));

  const doctorId = await ensureApprovedDoctor(user.id);

  const today = new Date().toISOString().slice(0, 10);

  const { data: exists } = await supabase
    .from("queue_entries")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (!exists) {
    const { data: last } = await supabase
      .from("queue_entries")
      .select("position")
      .eq("doctor_id", doctorId)
      .eq("queue_date", today)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const position = (last?.position ?? 0) + 1;
    await supabase.from("queue_entries").insert({
      doctor_id: doctorId,
      appointment_id: appointmentId,
      queue_date: today,
      position,
      status: "waiting",
    });
  }

  revalidatePath("/doctor/queue");
  revalidatePath("/patient/queue");
}

export async function updateQueueStatus(formData: FormData) {
  const user = await requireRole(["doctor"]);
  await ensureApprovedDoctor(user.id);
  const supabase = await createClient();

  const payload = z
    .object({
      queue_entry_id: z.string().uuid(),
      status: z.enum(["waiting", "in_progress", "done", "skipped"]),
    })
    .parse({
      queue_entry_id: formData.get("queue_entry_id"),
      status: formData.get("status"),
    });

  await supabase
    .from("queue_entries")
    .update({ status: payload.status })
    .eq("id", payload.queue_entry_id);

  if (payload.status === "done") {
    const { data: queue } = await supabase
      .from("queue_entries")
      .select("appointment_id")
      .eq("id", payload.queue_entry_id)
      .single();

    if (queue?.appointment_id) {
      await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", queue.appointment_id);
    }
  }

  revalidatePath("/doctor/queue");
  revalidatePath("/patient/queue");
  revalidatePath("/patient/appointments");
}

export async function moveQueueEntry(formData: FormData) {
  const user = await requireRole(["doctor"]);
  await ensureApprovedDoctor(user.id);
  const supabase = await createClient();
  const payload = z
    .object({
      queue_entry_id: z.string().uuid(),
      direction: z.enum(["up", "down"]),
    })
    .parse({
      queue_entry_id: formData.get("queue_entry_id"),
      direction: formData.get("direction"),
    });

  const { data: current } = await supabase
    .from("queue_entries")
    .select("id, doctor_id, queue_date, position")
    .eq("id", payload.queue_entry_id)
    .single();

  if (!current) throw new Error("Queue entry not found");

  const sortAscending = payload.direction === "up";
  const baseQuery = supabase
    .from("queue_entries")
    .select("id, position")
    .eq("doctor_id", current.doctor_id)
    .eq("queue_date", current.queue_date)
    .order("position", { ascending: sortAscending })
    .limit(1);

  const { data: neighbor } =
    payload.direction === "up"
      ? await baseQuery.lt("position", current.position).maybeSingle()
      : await baseQuery.gt("position", current.position).maybeSingle();

  if (!neighbor) return;

  await supabase.from("queue_entries").update({ position: -1 }).eq("id", current.id);
  await supabase
    .from("queue_entries")
    .update({ position: current.position })
    .eq("id", neighbor.id);
  await supabase
    .from("queue_entries")
    .update({ position: neighbor.position })
    .eq("id", current.id);

  revalidatePath("/doctor/queue");
  revalidatePath("/patient/queue");
}

export async function updateDoctorProfile(formData: FormData) {
  const user = await requireRole(["doctor"]);
  const supabase = await createClient();

  const payload = z
    .object({
      specialty: z.string().min(2),
      clinic_name: z.string().min(2),
      wilaya: z.string().min(2),
      city: z.string().min(2),
      address: z.string().min(2),
      bio: z.string().max(500).optional(),
      languages_spoken: z.string().optional(),
      average_consultation_minutes: z.coerce.number().min(5).max(90),
      profile_photo: z.string().url().optional().or(z.literal("")),
    })
    .parse({
      specialty: formData.get("specialty"),
      clinic_name: formData.get("clinic_name"),
      wilaya: formData.get("wilaya"),
      city: formData.get("city"),
      address: formData.get("address"),
      bio: formData.get("bio") ?? undefined,
      languages_spoken: formData.get("languages_spoken") ?? undefined,
      average_consultation_minutes: formData.get("average_consultation_minutes"),
      profile_photo: formData.get("profile_photo") ?? undefined,
    });

  await supabase
    .from("doctors")
    .update(payload)
    .eq("user_id", user.id);

  revalidatePath("/doctor/profile");
  revalidatePath("/patient/doctors");
}
