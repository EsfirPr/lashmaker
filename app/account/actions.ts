"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createUserSession, getCurrentUserByRole } from "@/lib/auth/server";
import {
  confirmClientPhoneChange,
  resendClientPhoneChangeCode,
  startClientProfileUpdate
} from "@/lib/auth/service";
import { cancelBookingForClient } from "@/lib/booking-service";
import { logServerActionError } from "@/lib/server-action-log";
import { bookingIdSchema } from "@/lib/validators";
import type { AccountProfileState } from "@/app/account/state";

export async function cancelOwnBookingAction(formData: FormData) {
  const user = await getCurrentUserByRole("client");

  if (!user) {
    console.warn("[server-action:cancelOwnBookingAction] Missing client session");
    redirect("/login");
  }

  try {
    const payload = bookingIdSchema.parse({
      bookingId: String(formData.get("bookingId") || "")
    });

    await cancelBookingForClient(payload.bookingId, user.id);
    revalidatePath("/account");
  } catch (error) {
    logServerActionError("cancelOwnBookingAction", error, {
      userId: user.id
    });
  }

  redirect("/account");
}

function maskPhone(phone: string) {
  if (phone.length < 6) {
    return phone;
  }

  return `${phone.slice(0, 2)} ••• ${phone.slice(-4)}`;
}

export async function startClientProfileUpdateAction(
  previousState: AccountProfileState,
  formData: FormData
): Promise<AccountProfileState> {
  const user = await getCurrentUserByRole("client");

  if (!user) {
    return {
      ...previousState,
      status: "error",
      message: "Сессия истекла. Войдите снова."
    };
  }

  try {
    const result = await startClientProfileUpdate(user.id, {
      name: String(formData.get("name") || ""),
      phone: String(formData.get("phone") || "")
    });

    await createUserSession(result.user);
    revalidatePath("/account");

    if (!result.requiresPhoneConfirmation) {
      return {
        step: "edit",
        status: "success",
        message: "Данные обновлены",
        currentName: result.user.name || previousState.currentName,
        currentPhone: result.user.phone || previousState.currentPhone,
        pendingPhone: "",
        maskedPendingPhone: "",
        resendAvailableAt: null
      };
    }

    return {
      step: "verify",
      status: "success",
      message: "Код отправлен на новый номер. Подтвердите его, чтобы завершить смену телефона.",
      currentName: result.user.name || previousState.currentName,
      currentPhone: previousState.currentPhone,
      pendingPhone: result.phone,
      maskedPendingPhone: maskPhone(result.phone),
      resendAvailableAt: result.resendAvailableAt
    };
  } catch (error) {
    logServerActionError("startClientProfileUpdateAction", error, {
      userId: user.id
    });
    return {
      ...previousState,
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось сохранить данные"
    };
  }
}

export async function resendClientPhoneChangeCodeAction(
  previousState: AccountProfileState,
  formData: FormData
): Promise<AccountProfileState> {
  const phone = String(formData.get("phone") || previousState.pendingPhone || "");
  const user = await getCurrentUserByRole("client");

  if (!user) {
    return {
      ...previousState,
      status: "error",
      message: "Сессия истекла. Войдите снова."
    };
  }

  try {
    const result = await resendClientPhoneChangeCode(user.id, phone);

    return {
      ...previousState,
      step: "verify",
      status: "success",
      message: "Новый код отправлен. Проверьте SMS и подтвердите номер.",
      pendingPhone: result.phone,
      maskedPendingPhone: maskPhone(result.phone),
      resendAvailableAt: result.resendAvailableAt
    };
  } catch (error) {
    logServerActionError("resendClientPhoneChangeCodeAction", error, {
      userId: user.id
    });
    return {
      ...previousState,
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось отправить код повторно"
    };
  }
}

export async function confirmClientPhoneChangeAction(
  previousState: AccountProfileState,
  formData: FormData
): Promise<AccountProfileState> {
  const user = await getCurrentUserByRole("client");

  if (!user) {
    return {
      ...previousState,
      status: "error",
      message: "Сессия истекла. Войдите снова."
    };
  }

  try {
    const updatedUser = await confirmClientPhoneChange(user.id, {
      phone: String(formData.get("phone") || previousState.pendingPhone || ""),
      code: String(formData.get("code") || "")
    });

    await createUserSession(updatedUser);
    revalidatePath("/account");

    return {
      step: "edit",
      status: "success",
      message: "Данные обновлены",
      currentName: updatedUser.name || previousState.currentName,
      currentPhone: updatedUser.phone || previousState.currentPhone,
      pendingPhone: "",
      maskedPendingPhone: "",
      resendAvailableAt: null
    };
  } catch (error) {
    logServerActionError("confirmClientPhoneChangeAction", error, {
      userId: user.id
    });
    return {
      ...previousState,
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось подтвердить номер"
    };
  }
}
