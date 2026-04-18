import { requireRole } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { buildPatientNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PatientAppointmentsList } from "@/components/patient-appointments-list";
import { Card } from "@/components/ui/card";

export default async function PatientAppointmentsPage() {
  const user = await requireRole(["patient"]);
  const { text } = await getServerT();
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

  const items = (appointments ?? []).map((item) => {
    const doctorName =
      ((item as { doctors?: { users?: { full_name?: string } | null } | null }).doctors?.users
        ?.full_name as string | undefined) ?? text("doctor");
    const clinic =
      ((item as { doctors?: { clinic_name?: string } | null }).doctors?.clinic_name as
        | string
        | undefined) ?? text("doctorFallbackClinic");

    return {
      id: (item as { id: string }).id,
      status: (item as { status: string }).status,
      appointment_date: (item as { appointment_date: string }).appointment_date,
      appointment_time: (item as { appointment_time: string }).appointment_time,
      doctor_name: doctorName,
      clinic_name: clinic,
    };
  });

  return (
    <DashboardShell title={text("dashboardPatient")} pathname="/patient/appointments" nav={buildPatientNav(text)}>
      <Card>
        <h1 className="mb-2 text-2xl font-bold">{text("myAppointments")}</h1>
        <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
          {text("cancelHint")}
        </p>
        <PatientAppointmentsList items={items} />
      </Card>
    </DashboardShell>
  );
}
