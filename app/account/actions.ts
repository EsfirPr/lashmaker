"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelBookingForClient } from "@/lib/booking-service";
import { requireUserRole } from "@/lib/auth/server";
import { bookingIdSchema } from "@/lib/validators";

export async function cancelOwnBookingAction(formData: FormData) {
  const user = await requireUserRole("client", "/login");
  const payload = bookingIdSchema.parse({
    bookingId: String(formData.get("bookingId") || "")
  });

  await cancelBookingForClient(payload.bookingId, user.id);
  revalidatePath("/account");
  redirect("/account");
}

