"use server";

import { cancelBookingByToken } from "@/lib/booking-service";

export async function cancelBookingAction(formData: FormData) {
  await cancelBookingByToken(String(formData.get("token") || ""));
}

