import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppointmentStatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { buildPatientNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";

export default async function PatientHomePage() {
  const user = await requireRole(["patient"]);
  const { text } = await getServerT();
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: upcoming } = patient
    ? await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, status, doctors(clinic_name, users!doctors_user_id_fkey(full_name))")
        .eq("patient_id", patient.id)
        .in("status", ["pending", "approved"])
        .order("appointment_date", { ascending: true })
        .limit(5)
    : { data: [] as unknown[] };

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(4);

  return (
    <DashboardShell title={text("dashboardPatient")} pathname="/patient" nav={buildPatientNav(text)}>
      <Card>
        <h1 className="text-2xl font-bold">{text("welcome")}, {user.full_name}</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{text("tagline")}</p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">{text("quickSearchDoctor")}</h2>
        <form action="/patient/doctors" className="flex flex-col gap-2 sm:flex-row">
          <Input name="name" placeholder={text("doctor")} />
          <button className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white">
            {text("searchDoctors")}
          </button>
        </form>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{text("upcomingAppointments")}</h2>
          <Link href="/patient/appointments" className="text-sm text-blue-600 hover:underline">
            {text("viewAll")}
          </Link>
        </div>
        <div className="space-y-2">
          {(upcoming ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              {text("noUpcomingAppointments")}
            </p>
          )}
          {(upcoming ?? []).map((item) => {
            const doctorName =
              ((item as { doctors?: { users?: { full_name?: string } | null } | null }).doctors?.users
                ?.full_name as string | undefined) ?? text("doctor");
            const clinic =
              ((item as { doctors?: { clinic_name?: string } | null }).doctors?.clinic_name as
                | string
                | undefined) ?? "Clinic";

            return (
              <div
                key={(item as { id: string }).id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">Dr. {doctorName}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {clinic} • {(item as { appointment_date: string }).appointment_date} at{" "}
                    {(item as { appointment_time: string }).appointment_time}
                  </p>
                </div>
                <AppointmentStatusBadge status={(item as { status: string }).status} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">{text("recentNotifications")}</h2>
        <div className="space-y-2">
          {(notifications ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              {text("noNotifications")}
            </p>
          )}
          {(notifications ?? []).map((note) => (
            <div key={note.id} className="rounded-xl border border-slate-200 p-3">
              <p className="font-medium">{note.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{note.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </DashboardShell>
  );
}
