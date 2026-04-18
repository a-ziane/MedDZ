"use client";

import { useMemo, useState } from "react";
import { cancelAppointmentByPatient } from "@/lib/actions/patient";
import { useLanguage } from "@/components/providers/language-provider";
import { AppointmentStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

type AppointmentRow = {
  id: string;
  status: string;
  appointment_date: string;
  appointment_time: string;
  doctor_name: string;
  clinic_name: string;
};

export function PatientAppointmentsList({ items }: { items: AppointmentRow[] }) {
  const { locale, text } = useLanguage();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const confirmItem = confirmId ? byId.get(confirmId) ?? null : null;

  return (
    <>
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            {text("noAppointmentsYet")}
          </p>
        )}

        {items.map((item) => {
          const appointmentDate = new Date(`${item.appointment_date}T${item.appointment_time}`);
          const readableDate = Number.isNaN(appointmentDate.getTime())
            ? item.appointment_date
            : new Intl.DateTimeFormat(locale, {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).format(appointmentDate);
          const readableTime = Number.isNaN(appointmentDate.getTime())
            ? item.appointment_time
            : new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(appointmentDate);
          const canCancel =
            item.status === "pending" ||
            (item.status === "approved" && item.appointment_date >= new Date().toISOString().slice(0, 10));

          return (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-blue-100/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">Dr. {item.doctor_name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {item.clinic_name} • {readableDate} {text("atLabel")} {readableTime}
                  </p>
                </div>
                <AppointmentStatusBadge status={item.status} />
              </div>

              {canCancel && (
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setConfirmId(item.id)}>
                    {text("cancelAppointment")}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {confirmItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <h2 className="text-lg font-semibold">{text("confirmCancelTitle")}</h2>
            <p className="mt-1 text-sm text-slate-600">{text("confirmCancelBody")}</p>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium">Dr. {confirmItem.doctor_name}</p>
              <p className="text-slate-600">
                {confirmItem.appointment_date} {text("atLabel")} {confirmItem.appointment_time}
              </p>
              <p className="text-slate-600">{confirmItem.clinic_name}</p>
            </div>

            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmId(null)}>
                {text("keepAppointment")}
              </Button>
              <form action={cancelAppointmentByPatient} className="flex-1">
                <input type="hidden" name="appointment_id" value={confirmItem.id} />
                <Button type="submit" variant="danger" className="w-full">
                  {text("cancelNow")}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

