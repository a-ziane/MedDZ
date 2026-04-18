"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createNotification } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/server";

export async function moderateDoctor(formData: FormData) {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const payload = z
    .object({
      doctor_id: z.string().uuid(),
      action: z.enum(["approve", "reject", "suspend"]),
    })
    .parse({
      doctor_id: formData.get("doctor_id"),
      action: formData.get("action"),
    });

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, user_id")
    .eq("id", payload.doctor_id)
    .single();

  if (!doctor) throw new Error("Doctor not found");

  if (payload.action === "approve") {
    await supabase
      .from("doctors")
      .update({ approved: true, suspended: false })
      .eq("id", payload.doctor_id);
    await createNotification(doctor.user_id, "Doctor profile approved", "Your profile is now visible to patients.");
  }

  if (payload.action === "reject") {
    await supabase
      .from("doctors")
      .update({ approved: false, suspended: false })
      .eq("id", payload.doctor_id);
    await createNotification(doctor.user_id, "Doctor profile rejected", "Please update your profile and submit again.");
  }

  if (payload.action === "suspend") {
    await supabase
      .from("doctors")
      .update({ suspended: true })
      .eq("id", payload.doctor_id);
    await createNotification(doctor.user_id, "Doctor profile suspended", "Your doctor account has been temporarily suspended.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/doctors");
  revalidatePath("/patient/doctors");
}
