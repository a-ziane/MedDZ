"use server";

import { createClient } from "@/lib/supabase/server";

export async function createNotification(userId: string, title: string, body: string) {
  const supabase = await createClient();
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
  });
}
