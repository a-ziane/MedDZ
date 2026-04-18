import { cancelAppointmentByPatient } from "@/lib/actions/patient";
import { requireRole } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { buildPatientNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AppointmentStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function PatientAppointmentsPage() {
  const user = await requireRole(["patient"]);
  const { locale, text } = await getServerT();
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: appointments } = patient
    ? await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, status, doctors(clinic_name, users!doctors_user_id_fkey(full_name))")
        .eq("patient_id", patient.id)
        .order("appointment_date", { ascending: false })
    : { data: [] as unknown[] };

  return (
    <DashboardShell title={text("dashboardPatient")} pathname="/patient/appointments" nav={buildPatientNav(text)}>
      <Card>
        <h1 className="mb-2 text-2xl font-bold">{text("myAppointments")}</h1>
        <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
          {text("cancelHint")}
        </p>
        <div className="space-y-3">
          {(appointments ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              {text("noAppointmentsYet")}
            </p>
          )}
          {(appointments ?? []).map((item) => {
            const doctorName =
              ((item as { doctors?: { users?: { full_name?: string } | null } | null }).doctors?.users
                ?.full_name as string | undefined) ?? text("doctor");
            const clinic =
              ((item as { doctors?: { clinic_name?: string } | null }).doctors?.clinic_name as
                | string
                | undefined) ?? text("doctorFallbackClinic");
            const status = (item as { status: string }).status;
            const dateValue = (item as { appointment_date: string }).appointment_date;
            const timeValue = (item as { appointment_time: string }).appointment_time;
            const appointmentDate = new Date(`${dateValue}T${timeValue}`);
            const readableDate = Number.isNaN(appointmentDate.getTime())
              ? dateValue
              : new Intl.DateTimeFormat(locale, { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(appointmentDate);
            const readableTime = Number.isNaN(appointmentDate.getTime())
              ? timeValue
              : new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(appointmentDate);
            const canCancel =
              status === "pending" ||
              (status === "approved" &&
                (item as { appointment_date: string }).appointment_date >=
                  new Date().toISOString().slice(0, 10));

            return (
              <div
                key={(item as { id: string }).id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-blue-100/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">Dr. {doctorName}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {clinic} • {readableDate} {text("atLabel")} {readableTime}
                    </p>
                  </div>
                  <AppointmentStatusBadge status={status} />
                </div>

                {canCancel && (
                  <form action={cancelAppointmentByPatient} className="flex justify-end">
                    <input type="hidden" name="appointment_id" value={(item as { id: string }).id} />
                    <Button type="submit" variant="outline" size="sm">
                      {text("cancelAppointment")}
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </DashboardShell>
  );
}
