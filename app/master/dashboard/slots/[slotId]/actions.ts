"use server";

import { redirect } from "next/navigation";
import { deleteFreeTimeSlot } from "@/lib/booking-service";
import { getCurrentUserByRole } from "@/lib/auth/server";
import { logServerActionError } from "@/lib/server-action-log";

export async function deleteTimeSlotFromDetailsAction(formData: FormData) {
  const master = await getCurrentUserByRole("master");

  if (!master) {
    console.warn("[server-action:deleteTimeSlotFromDetailsAction] Missing master session");
    redirect("/login");
  }

  try {
    await deleteFreeTimeSlot(String(formData.get("slotId") || ""));
  } catch (error) {
    logServerActionError("deleteTimeSlotFromDetailsAction", error, {
      userId: master.id
    });
  }

  redirect("/master/dashboard#schedule");
}
