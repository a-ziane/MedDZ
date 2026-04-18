import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Supabase admin environment variables are missing");
  }

  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const { data: sameDay } = await supabase
    .from("appointments")
    .select("id, appointment_time, patient_id, patients(user_id), doctors(users(full_name))")
    .eq("appointment_date", todayStr)
    .eq("status", "approved");

  const { data: nextDay } = await supabase
    .from("appointments")
    .select("id, appointment_time, patient_id, patients(user_id), doctors(users(full_name))")
    .eq("appointment_date", tomorrowStr)
    .eq("status", "approved");

  const notifications = [
    ...(sameDay ?? []).map((appointment) => ({
      user_id: (appointment.patients as { user_id?: string }[])[0]?.user_id,
      title: "Appointment reminder (today)",
      body: `You have an appointment today at ${appointment.appointment_time}.`,
    })),
    ...(nextDay ?? []).map((appointment) => ({
      user_id: (appointment.patients as { user_id?: string }[])[0]?.user_id,
      title: "Appointment reminder (tomorrow)",
      body: `Reminder: your appointment is tomorrow at ${appointment.appointment_time}.`,
    })),
  ].filter((item) => item.user_id);

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }

  return NextResponse.json({ ok: true, created: notifications.length });
}
