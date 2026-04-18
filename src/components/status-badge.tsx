"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { Badge } from "@/components/ui/badge";

export function AppointmentStatusBadge({ status }: { status: string }) {
  const { text } = useLanguage();

  if (status === "approved") return <Badge variant="success">{text("approved")}</Badge>;
  if (status === "completed") return <Badge variant="success">{text("completed")}</Badge>;
  if (status === "pending") return <Badge variant="warning">{text("pending")}</Badge>;
  if (status === "rejected") return <Badge variant="danger">{text("rejected")}</Badge>;
  if (status === "cancelled_by_patient") {
    return <Badge variant="danger">{text("cancelledByPatient")}</Badge>;
  }
  if (status === "cancelled_by_doctor") {
    return <Badge variant="danger">{text("cancelledByDoctor")}</Badge>;
  }

  return <Badge variant="muted">{status}</Badge>;
}

export function QueueStatusBadge({ status }: { status: string }) {
  const { text } = useLanguage();

  if (status === "done") return <Badge variant="success">{text("done")}</Badge>;
  if (status === "in_progress") return <Badge variant="warning">{text("inProgress")}</Badge>;
  if (status === "skipped") return <Badge variant="danger">{text("skipped")}</Badge>;
  return <Badge variant="default">{text("waiting")}</Badge>;
}
