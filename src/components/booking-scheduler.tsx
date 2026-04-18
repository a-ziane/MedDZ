"use client";

import { useActionState, useMemo, useState } from "react";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  cancelAppointmentByPatient,
  requestAppointmentWithFeedback,
  type BookingActionState,
  updatePendingAppointmentMessageByPatient,
} from "@/lib/actions/patient";

type Availability = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
};

type Booked = {
  appointment_date: string;
  appointment_time: string;
};

function weekdayMatchesDate(slotWeekday: number, jsWeekday: number) {
  if (slotWeekday === jsWeekday) return true;
  if (((slotWeekday + 1) % 7) === jsWeekday) return true; // Monday=0 style
  if ((slotWeekday % 7) === jsWeekday) return true; // Monday=1 ... Sunday=7 style
  return false;
}

function buildSlots(startTime: string, endTime: string, slotMinutes: number) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  const slots: string[] = [];
  for (let minute = start; minute + slotMinutes <= end; minute += slotMinutes) {
    const h = Math.floor(minute / 60)
      .toString()
      .padStart(2, "0");
    const m = (minute % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
}

const initialBookingActionState: BookingActionState = { ok: false };

function bookingErrorKey(code?: string) {
  if (!code) return "bookingErrorGeneric";
  if (code === "missing_slot") return "bookingErrorMissingSlot";
  if (code === "invalid_payload") return "bookingErrorMissingSlot";
  if (code === "time_in_past") return "bookingErrorPastTime";
  if (code === "slot_already_taken") return "bookingErrorTaken";
  if (code === "doctor_unavailable") return "bookingErrorDoctorUnavailable";
  if (code === "doctor_no_availability") return "bookingErrorNoAvailability";
  return "bookingErrorGeneric";
}

export function BookingScheduler({
  doctorId,
  availability,
  bookedSlots,
}: {
  doctorId: string;
  availability: Availability[];
  bookedSlots: Booked[];
}) {
  const { locale, text } = useLanguage();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<{ date: string; time: string } | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [bookingState, bookingAction, isBooking] = useActionState(
    requestAppointmentWithFeedback,
    initialBookingActionState,
  );
  const showPendingCard = Boolean(
    bookingState.ok &&
      bookingState.appointment &&
      bookingState.submittedAt &&
      bookingState.submittedAt !== dismissedAt,
  );
  const weekStart = useMemo(
    () => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset),
    [weekOffset],
  );

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const iso = format(date, "yyyy-MM-dd");
      return {
        date,
        iso,
        weekday: date.getDay(),
        weekdayLabel: new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date),
        dateLabel: new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(date),
      };
    });
  }, [weekStart, locale]);

  const bookedSet = useMemo(() => {
    const pendingBookedSlot: Booked[] =
      showPendingCard && bookingState.ok && bookingState.appointment
        ? [
            {
              appointment_date: bookingState.appointment.appointment_date,
              appointment_time: bookingState.appointment.appointment_time,
            },
          ]
        : [];
    const effectiveBookedSlots = [...bookedSlots, ...pendingBookedSlot];
    return new Set(
      effectiveBookedSlots.map((slot) => `${slot.appointment_date}|${slot.appointment_time.slice(0, 5)}`),
    );
  }, [bookedSlots, bookingState.ok, bookingState.appointment, showPendingCard]);

  const selectableDays = useMemo(() => {
    return days.filter((day) => availability.some((slot) => weekdayMatchesDate(slot.weekday, day.weekday)));
  }, [days, availability]);

  const slotsByDate = useMemo(() => {
    const now = new Date();
    const todayIso = format(now, "yyyy-MM-dd");

    const map = new Map<string, Set<string>>();
    for (const day of selectableDays) {
      const daySlots = availability
        .filter((slot) => weekdayMatchesDate(slot.weekday, day.weekday))
        .flatMap((slot) => buildSlots(slot.start_time.slice(0, 5), slot.end_time.slice(0, 5), slot.slot_minutes))
        .filter((time) => !bookedSet.has(`${day.iso}|${time}`))
        .filter((time) => {
          if (day.iso !== todayIso) return true;
          const [h, m] = time.split(":").map(Number);
          const candidate = new Date(now);
          candidate.setHours(h, m, 0, 0);
          return candidate > now;
        });

      map.set(day.iso, new Set(daySlots));
    }
    return map;
  }, [selectableDays, availability, bookedSet]);

  const allTimes = useMemo(() => {
    const set = new Set<string>();
    for (const slotSet of slotsByDate.values()) {
      for (const t of slotSet) set.add(t);
    }
    return [...set].sort();
  }, [slotsByDate]);

  let firstAvailable: { date: string; time: string } | null = null;
  for (const day of selectableDays) {
    const slotSet = slotsByDate.get(day.iso);
    const first = slotSet ? [...slotSet].sort()[0] : undefined;
    if (first) {
      firstAvailable = { date: day.iso, time: first };
      break;
    }
  }

  const effectiveSelected =
    selected && slotsByDate.get(selected.date)?.has(selected.time) ? selected : firstAvailable;

  const hasAnySlot = allTimes.length > 0;

  return (
    <Card className="space-y-4 border-blue-100 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold">{text("bookAppointment")}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text("bookingHint")}</p>
      </div>

      {showPendingCard && bookingState.appointment && (
        <Card className="border-amber-200 bg-amber-50/70 p-4">
          <h3 className="text-base font-semibold text-amber-900">{text("appointmentPendingTitle")}</h3>
          <p className="mt-1 text-sm text-amber-800">{text("appointmentPendingBody")}</p>
          <div className="mt-3 space-y-1 text-sm text-amber-900">
            <p>
              {text("appointmentDateLabel")}: {bookingState.appointment.appointment_date}
            </p>
            <p>
              {text("appointmentTimeLabel")}: {bookingState.appointment.appointment_time}
            </p>
            <p>
              {text("messageLabel")}: {bookingState.appointment.message_optional || "-"}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDismissedAt(bookingState.submittedAt ?? Date.now())}
            >
              {text("close")}
            </Button>
            <form action={cancelAppointmentByPatient}>
              <input type="hidden" name="appointment_id" value={bookingState.appointment.id} />
              <Button
                type="submit"
                variant="danger"
                onClick={() => setDismissedAt(bookingState.submittedAt ?? Date.now())}
              >
                {text("cancelAppointment")}
              </Button>
            </form>
          </div>

          <form action={updatePendingAppointmentMessageByPatient} className="mt-3 grid gap-2">
            <input type="hidden" name="appointment_id" value={bookingState.appointment.id} />
            <Textarea
              name="message_optional"
              defaultValue={bookingState.appointment.message_optional}
              maxLength={400}
              placeholder={text("optionalMessage")}
            />
            <div>
              <Button type="submit" variant="outline">
                {text("changeMessage")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!bookingState.ok && bookingState.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {text(bookingErrorKey(bookingState.error))}
          <span className="ml-2 text-xs opacity-70">({bookingState.error})</span>
        </p>
      )}

      <div className="mb-1 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setWeekOffset((v) => Math.max(0, v - 1))}
          disabled={weekOffset === 0}
          className="gap-1"
        >
          <ChevronLeft size={14} /> {text("previousWeek")}
        </Button>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {text("weekOf")} {new Intl.DateTimeFormat(locale, { month: "long", day: "numeric" }).format(weekStart)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setWeekOffset((v) => Math.min(4, v + 1))}
          disabled={weekOffset === 4}
          className="gap-1"
        >
          {text("nextWeek")} <ChevronRight size={14} />
        </Button>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-inner shadow-blue-50">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-24 border-b border-slate-200 bg-slate-50 p-2 text-left text-slate-600">
                {text("time")}
              </th>
              {selectableDays.map((day) => (
                <th key={day.iso} className="border-b border-l border-slate-200 bg-slate-50 p-2 text-left">
                  <p className="capitalize">{day.weekdayLabel}</p>
                  <p className="text-xs text-slate-500">{day.dateLabel}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allTimes.map((time) => (
              <tr key={time}>
                <td className="border-b border-slate-200 bg-slate-50 p-2 font-medium text-slate-600">{time}</td>
                {selectableDays.map((day) => {
                  const available = slotsByDate.get(day.iso)?.has(time) ?? false;
                  const active = effectiveSelected?.date === day.iso && effectiveSelected?.time === time;

                  return (
                    <td key={`${day.iso}-${time}`} className="border-l border-b border-slate-200 p-1">
                      <button
                        type="button"
                        disabled={!available}
                        onClick={() => setSelected({ date: day.iso, time })}
                        className={cn(
                          "h-9 w-full rounded-lg border px-1 text-[11px] font-medium transition",
                          available
                            ? "border-blue-200 bg-white text-blue-700 hover:border-blue-400 hover:bg-blue-50"
                            : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300",
                          active && "border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-300/40",
                        )}
                      >
                        {available ? text("select") : "--"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {!hasAnySlot && (
              <tr>
                <td colSpan={1 + selectableDays.length} className="p-4 text-center text-sm text-amber-700">
                  {text("noSlotsThisWeek")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form action={bookingAction} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <input type="hidden" name="doctor_id" value={doctorId} />
        <input type="hidden" name="appointment_date" value={effectiveSelected?.date ?? ""} />
        <input type="hidden" name="appointment_time" value={effectiveSelected?.time ?? ""} />

        <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {effectiveSelected
            ? `${text("selectedSlot")}: ${effectiveSelected.date} ${effectiveSelected.time}`
            : text("selectTimeSlot")}
        </p>

        <Textarea name="message_optional" placeholder={text("optionalMessage")} maxLength={400} />

        <div className="flex justify-start">
          <Button type="submit" disabled={!effectiveSelected || !hasAnySlot || isBooking}>
            {text("submitBookingRequest")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
