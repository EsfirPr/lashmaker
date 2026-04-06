"use server";

import { requireUserRole } from "@/lib/auth/server";
import { createTimeSlot, createTimeSlots, deleteFreeTimeSlot } from "@/lib/booking-service";

export async function addTimeSlotAction(formData: FormData) {
  await requireUserRole("master", "/master/login");
  const slotDate = String(formData.get("slotDate") || "");
  const timeRanges = String(formData.get("timeRanges") || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  if (timeRanges.length > 0) {
    await createTimeSlots({
      slotDate,
      ranges: timeRanges.map((range) => {
        const [startTime, endTime] = range.split("-").map((value) => value.trim());
        return {
          startTime: startTime || "",
          endTime: endTime || ""
        };
      })
    });

    return;
  }

  await createTimeSlot({
    slotDate,
    startTime: String(formData.get("startTime") || ""),
    endTime: String(formData.get("endTime") || "")
  });
}

export async function deleteTimeSlotAction(formData: FormData) {
  await requireUserRole("master", "/master/login");
  await deleteFreeTimeSlot(String(formData.get("slotId") || ""));
}
