"use server";

import { redirect } from "next/navigation";
import { createUserSession } from "@/lib/auth/server";
import {
  beginClientRegistration,
  resendClientVerificationCode,
  verifyClientRegistration
} from "@/lib/auth/service";
import type { RegisterFlowState } from "@/app/register/state";

function maskPhone(phone: string) {
  if (phone.length < 6) {
    return phone;
  }

  return `${phone.slice(0, 2)} ••• ${phone.slice(-4)}`;
}

function toVerifyState(
  phone: string,
  message: string,
  expiresAt: string,
  resendAvailableAt: string
): RegisterFlowState {
  return {
    step: "verify",
    message,
    error: "",
    phone,
    maskedPhone: maskPhone(phone),
    expiresAt,
    resendAvailableAt
  };
}

export async function startClientRegistrationAction(
  _previousState: RegisterFlowState,
  formData: FormData
): Promise<RegisterFlowState> {
  try {
    const result = await beginClientRegistration({
      name: String(formData.get("name") || ""),
      phone: String(formData.get("phone") || ""),
      password: String(formData.get("password") || ""),
      privacyAccepted: formData.get("privacyAccepted") === "on"
    });

    return toVerifyState(
      result.phone,
      "Мы отправили код подтверждения в SMS. Введите его, чтобы завершить регистрацию.",
      result.expiresAt,
      result.resendAvailableAt
    );
  } catch (error) {
    return {
      step: "register",
      message: "",
      error: error instanceof Error ? error.message : "Не удалось отправить код",
      phone: "",
      maskedPhone: "",
      expiresAt: null,
      resendAvailableAt: null
    };
  }
}

export async function resendClientVerificationCodeAction(
  previousState: RegisterFlowState,
  formData: FormData
): Promise<RegisterFlowState> {
  const currentPhone = String(formData.get("phone") || previousState.phone || "");

  try {
    const result = await resendClientVerificationCode(currentPhone);

    return toVerifyState(
      result.phone,
      "Новый код отправлен. Проверьте SMS и введите его ниже.",
      result.expiresAt,
      result.resendAvailableAt
    );
  } catch (error) {
    return {
      ...previousState,
      error: error instanceof Error ? error.message : "Не удалось отправить код повторно"
    };
  }
}

export async function verifyClientRegistrationAction(
  previousState: RegisterFlowState,
  formData: FormData
): Promise<RegisterFlowState> {
  try {
    const user = await verifyClientRegistration({
      phone: String(formData.get("phone") || previousState.phone || ""),
      code: String(formData.get("code") || "")
    });

    await createUserSession(user);
  } catch (error) {
    return {
      ...previousState,
      error: error instanceof Error ? error.message : "Не удалось подтвердить код"
    };
  }

  redirect("/account");
}
