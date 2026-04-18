import {
  checkInPatient,
  moveQueueEntry,
  updateQueueStatus,
} from "@/lib/actions/doctor";
import { requireRole } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { buildDoctorNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { QueueStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function DoctorQueuePage() {
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

  const { data: approvedToday } = doctorId
    ? await supabase
        .from("appointments")
        .select("id, appointment_time, patients(users(full_name))")
        .eq("doctor_id", doctorId)
        .eq("appointment_date", today)
        .eq("status", "approved")
        .order("appointment_time", { ascending: true })
    : { data: [] as unknown[] };

  const { data: queue } = doctorId
    ? await supabase
        .from("queue_entries")
        .select("id, appointment_id, position, status")
        .eq("doctor_id", doctorId)
        .eq("queue_date", today)
        .order("position", { ascending: true })
    : { data: [] as unknown[] };

  const appointments = (approvedToday ?? []) as {
    id: string;
    appointment_time: string;
    patients?: { users?: { full_name?: string }[] }[];
  }[];
  const queueRows = (queue ?? []) as {
    id: string;
    appointment_id: string;
    position: number;
    status: string;
  }[];

  return (
    <DashboardShell title={text("dashboardDoctor")} pathname="/doctor/queue" nav={buildDoctorNav(text)}>
      <Card>
        <h1 className="mb-3 text-2xl font-bold">Today Queue</h1>
        <div className="space-y-2">
          {appointments.map((appointment) => {
            const patientName =
              (appointment.patients?.[0]?.users?.[0]?.full_name as string | undefined) ?? "Patient";
            const inQueue = queueRows.some((q) => q.appointment_id === appointment.id);
            return (
              <div key={appointment.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <p>
                  {appointment.appointment_time} - {patientName}
                </p>
                {!inQueue ? (
                  <form action={checkInPatient}>
                    <input type="hidden" name="appointment_id" value={appointment.id} />
                    <Button size="sm" type="submit">
                      Check In Patient
                    </Button>
                  </form>
                ) : (
                  <span className="text-xs text-slate-500">Already in queue</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Queue Order</h2>
        <div className="space-y-2">
          {queueRows.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Queue is empty.
            </p>
          )}
          {queueRows.map((entry) => {
            const appointment = appointments.find((a) => a.id === entry.appointment_id);
            const patientName = appointment?.patients?.[0]?.users?.[0]?.full_name ?? "Patient";

            return (
              <div key={entry.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    #{entry.position} - {patientName}
                  </p>
                  <QueueStatusBadge status={entry.status} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={updateQueueStatus}>
                    <input type="hidden" name="queue_entry_id" value={entry.id} />
                    <input type="hidden" name="status" value="in_progress" />
                    <Button size="sm" type="submit" variant="outline">
                      Start Consultation
                    </Button>
                  </form>
                  <form action={updateQueueStatus}>
                    <input type="hidden" name="queue_entry_id" value={entry.id} />
                    <input type="hidden" name="status" value="done" />
                    <Button size="sm" type="submit">
                      Complete
                    </Button>
                  </form>
                  <form action={updateQueueStatus}>
                    <input type="hidden" name="queue_entry_id" value={entry.id} />
                    <input type="hidden" name="status" value="skipped" />
                    <Button size="sm" type="submit" variant="outline">
                      Skip
                    </Button>
                  </form>
                  <form action={moveQueueEntry}>
                    <input type="hidden" name="queue_entry_id" value={entry.id} />
                    <input type="hidden" name="direction" value="up" />
                    <Button size="sm" type="submit" variant="outline">
                      Move Up
                    </Button>
                  </form>
                  <form action={moveQueueEntry}>
                    <input type="hidden" name="queue_entry_id" value={entry.id} />
                    <input type="hidden" name="direction" value="down" />
                    <Button size="sm" type="submit" variant="outline">
                      Move Down
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </DashboardShell>
  );
}
