import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";
import { AppointmentStatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { buildDoctorNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";

export default async function DoctorHomePage() {
  const user = await requireRole(["doctor"]);
  const { text } = await getServerT();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const doctorId = doctor?.id;

  const { data: todayAppointments } = doctorId
    ? await supabase
        .from("appointments")
        .select("id, appointment_time, status, patients(users(full_name))")
        .eq("doctor_id", doctorId)
        .eq("appointment_date", today)
        .order("appointment_time", { ascending: true })
    : { data: [] as unknown[] };

  const { count: pendingCount } = doctorId
    ? await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("doctor_id", doctorId)
        .eq("status", "pending")
    : { count: 0 };

  const { count: queueCount } = doctorId
    ? await supabase
        .from("queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("doctor_id", doctorId)
        .eq("queue_date", today)
        .in("status", ["waiting", "in_progress"])
    : { count: 0 };

  const metrics = [
    { label: "Today's appointments", value: (todayAppointments ?? []).length },
    { label: "Pending requests", value: pendingCount ?? 0 },
    { label: "Queue today", value: queueCount ?? 0 },
    { label: "Total patients today", value: (todayAppointments ?? []).length },
  ];

  return (
    <DashboardShell title={text("dashboardDoctor")} pathname="/doctor" nav={buildDoctorNav(text)}>
      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="text-3xl font-bold text-blue-700">{metric.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Today Appointments</h2>
        <div className="space-y-2">
          {(todayAppointments ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No appointments scheduled today.
            </p>
          )}
          {(todayAppointments ?? []).map((appointment) => {
            const patientName =
              ((appointment as { patients?: { users?: { full_name?: string }[] }[] }).patients?.[0]
                ?.users?.[0]?.full_name as string | undefined) ?? "Patient";

            return (
              <div
                key={(appointment as { id: string }).id}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
              >
                <p>
                  {(appointment as { appointment_time: string }).appointment_time} - {patientName}
                </p>
                <AppointmentStatusBadge status={(appointment as { status: string }).status} />
              </div>
            );
          })}
        </div>
      </Card>
    </DashboardShell>
  );
}
