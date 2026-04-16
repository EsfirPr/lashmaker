"use server";

import { redirect } from "next/navigation";
import { deleteFreeTimeSlot } from "@/lib/booking-service";
import { requireUserRole } from "@/lib/auth/server";

export async function deleteTimeSlotFromDetailsAction(formData: FormData) {
  await requireUserRole("master", "/login");
  await deleteFreeTimeSlot(String(formData.get("slotId") || ""));
  redirect("/master/dashboard#schedule");
}
