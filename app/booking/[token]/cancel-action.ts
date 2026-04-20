"use server";

import { forbidden } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { cancelBookingByToken, getBookingByToken, resolveBookingAccess } from "@/lib/booking-service";

export async function cancelBookingAction(formData: FormData) {
  const token = String(formData.get("token") || "");
  const [booking, viewer] = await Promise.all([getBookingByToken(token), getCurrentUser()]);
  const access = resolveBookingAccess(booking, viewer);

  if (!access.allowed) {
    console.warn("[booking/cancel-action] Forbidden", {
      token,
      bookingId: booking?.id ?? null,
      bookingUserId: booking?.user_id ?? null,
      viewerId: viewer?.id ?? null,
      viewerRole: viewer?.role ?? null,
      reason: access.reason
    });
    forbidden();
  }

  await cancelBookingByToken(token);
}
