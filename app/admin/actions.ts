"use server";

import { createTimeSlot, deleteFreeTimeSlot } from "@/lib/booking-service";

export async function addTimeSlotAction(formData: FormData) {
  await createTimeSlot({
    slotDate: String(formData.get("slotDate") || ""),
    startTime: String(formData.get("startTime") || ""),
    endTime: String(formData.get("endTime") || "")
  });
}

export async function deleteTimeSlotAction(formData: FormData) {
  await deleteFreeTimeSlot(String(formData.get("slotId") || ""));
}

