import { AutoRefresh } from "@/components/auto-refresh";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { QueueStatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { buildPatientNav } from "@/lib/nav";
import { formatMinutes } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export default async function PatientQueuePage() {
  const user = await requireRole(["patient"]);
  const { text } = await getServerT();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: todayAppointments } = patient
    ? await supabase
        .from("appointments")
        .select("id, doctor_id, status, doctors(average_consultation_minutes, users!doctors_user_id_fkey(full_name))")
        .eq("patient_id", patient.id)
        .eq("appointment_date", today)
        .eq("status", "approved")
    : { data: [] as unknown[] };

  const appointmentIds = (todayAppointments ?? []).map((a) => (a as { id: string }).id);
  const { data: queueEntries } = appointmentIds.length
    ? await supabase
        .from("queue_entries")
        .select("id, appointment_id, position, status, doctor_id")
        .in("appointment_id", appointmentIds)
    : { data: [] as unknown[] };
  const appointments = (todayAppointments ?? []) as {
    id: string;
    doctor_id: string;
    doctors?: { average_consultation_minutes?: number; users?: { full_name?: string } | null } | null;
  }[];
  const queueRows = (queueEntries ?? []) as {
    id: string;
    appointment_id: string;
    position: number;
    status: string;
    doctor_id: string;
  }[];

  const doctorIds = [...new Set(queueRows.map((entry) => entry.doctor_id))];
  const { data: doctorQueues } = doctorIds.length
    ? await supabase
        .from("queue_entries")
        .select("id, doctor_id, position, status")
        .eq("queue_date", today)
        .in("doctor_id", doctorIds)
    : { data: [] as unknown[] };
  const allDoctorQueueRows = (doctorQueues ?? []) as {
    id: string;
    doctor_id: string;
    position: number;
    status: string;
  }[];

  return (
    <DashboardShell title={text("dashboardPatient")} pathname="/patient/queue" nav={buildPatientNav(text)}>
      <AutoRefresh everyMs={30000} />
      <Card>
        <h1 className="mb-3 text-2xl font-bold">{text("liveQueueTracking")}</h1>
        {queueRows.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            {text("noQueueEntriesToday")}
          </p>
        )}

        <div className="space-y-3">
          {queueRows.map((entry) => {
            const appointment = appointments.find((item) => item.id === entry.appointment_id);

            const doctorName = appointment?.doctors?.users?.full_name ?? text("doctor");
            const avg = appointment?.doctors?.average_consultation_minutes ?? 15;

            const aheadCount = allDoctorQueueRows.filter(
              (row) =>
                row.doctor_id === entry.doctor_id &&
                row.position < entry.position &&
                (row.status === "waiting" || row.status === "in_progress"),
            ).length;

            const estimated = aheadCount * avg;

            return (
              <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold">Dr. {doctorName}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {text("yourNumberInLine")}: #{entry.position}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {text("estimatedWait")}: {formatMinutes(estimated)}
                </p>
                <div className="mt-2">
                  <QueueStatusBadge status={entry.status} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </DashboardShell>
  );
}
