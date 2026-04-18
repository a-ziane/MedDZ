import { approveAppointment, rejectAppointment } from "@/lib/actions/doctor";
import { requireRole } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { buildDoctorNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AppointmentStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type RequestRow = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  message_optional?: string | null;
  patients?:
    | {
        users?:
          | {
              full_name?: string | null;
              email?: string | null;
              phone?: string | null;
            }
          | {
              full_name?: string | null;
              email?: string | null;
              phone?: string | null;
            }[]
          | null;
      }
    | {
        users?:
          | {
              full_name?: string | null;
              email?: string | null;
              phone?: string | null;
            }
          | {
              full_name?: string | null;
              email?: string | null;
              phone?: string | null;
            }[]
          | null;
      }[]
    | null;
};

function RequestItem({ request, showActions }: { request: RequestRow; showActions: boolean }) {
  const patientRow = Array.isArray(request.patients) ? request.patients[0] : request.patients;
  const userRow = patientRow?.users;
  const user = Array.isArray(userRow) ? userRow[0] : userRow;
  const patientName = user?.full_name ?? "Patient";
  const patientEmail = user?.email ?? "--";
  const patientPhone = user?.phone ?? "--";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{patientName}</p>
          <p className="text-xs text-slate-500">{patientEmail}</p>
          <p className="text-xs text-slate-500">{patientPhone}</p>
        </div>
        <AppointmentStatusBadge status={request.status} />
      </div>
      <p className="mt-2 text-sm text-slate-700">
        {request.appointment_date} at {request.appointment_time}
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Message: {request.message_optional?.trim() ? request.message_optional : "--"}
      </p>

      {showActions && (
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={approveAppointment}>
            <input type="hidden" name="appointment_id" value={request.id} />
            <Button type="submit" size="sm">
              Approve
            </Button>
          </form>
          <form action={rejectAppointment}>
            <input type="hidden" name="appointment_id" value={request.id} />
            <Button type="submit" variant="outline" size="sm">
              Decline
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

export default async function DoctorRequestsPage() {
  const user = await requireRole(["doctor"]);
  const { text } = await getServerT();
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: rows } = doctor
    ? await supabase
        .from("appointments")
        .select(
          "id, appointment_date, appointment_time, status, message_optional, patients(users(full_name, email, phone))",
        )
        .eq("doctor_id", doctor.id)
        .in("status", ["pending", "approved", "rejected"])
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false })
    : { data: [] as unknown[] };
  const requests = (rows ?? []) as RequestRow[];
  const pending = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");
  const declined = requests.filter((r) => r.status === "rejected");

  return (
    <DashboardShell title={text("dashboardDoctor")} pathname="/doctor/requests" nav={buildDoctorNav(text)}>
      <Card className="space-y-4">
        <h1 className="text-2xl font-bold">Appointment Requests</h1>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Pending</h2>
          {pending.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No pending requests.
            </p>
          )}
          {pending.map((request) => (
            <RequestItem key={request.id} request={request} showActions />
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Approved</h2>
          {approved.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No approved appointments yet.
            </p>
          )}
          {approved.map((request) => (
            <RequestItem key={request.id} request={request} showActions={false} />
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Declined</h2>
          {declined.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No declined appointments yet.
            </p>
          )}
          {declined.map((request) => (
            <RequestItem key={request.id} request={request} showActions={false} />
          ))}
        </section>
      </Card>
    </DashboardShell>
  );
}
