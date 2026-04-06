"use server";

import { requireUserRole } from "@/lib/auth/server";
import { createTimeSlot, deleteFreeTimeSlot } from "@/lib/booking-service";

export async function addTimeSlotAction(formData: FormData) {
  await requireUserRole("master", "/master/login");
  await createTimeSlot({
    slotDate: String(formData.get("slotDate") || ""),
    startTime: String(formData.get("startTime") || ""),
    endTime: String(formData.get("endTime") || "")
  });
}

export async function deleteTimeSlotAction(formData: FormData) {
  await requireUserRole("master", "/master/login");
  await deleteFreeTimeSlot(String(formData.get("slotId") || ""));
}
