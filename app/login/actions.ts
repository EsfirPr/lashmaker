"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { createUserSession } from "@/lib/auth/server";
import {
  authenticateMaster,
  beginClientSmsLogin,
  resendClientSmsLoginCode,
  verifyClientSmsLogin
} from "@/lib/auth/service";
import type { LoginFlowState } from "@/app/login/state";

function toErrorRedirect(message: string): Route {
  return `/login?error=${encodeURIComponent(message)}` as Route;
}

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
): LoginFlowState {
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

export async function startClientSmsLoginAction(
  _previousState: LoginFlowState,
  formData: FormData
): Promise<LoginFlowState> {
  try {
    const result = await beginClientSmsLogin({
      phone: String(formData.get("phone") || "")
    });

    return toVerifyState(
      result.phone,
      "Мы отправили код входа в SMS. Введите его, чтобы открыть кабинет.",
      result.expiresAt,
      result.resendAvailableAt
    );
  } catch (error) {
    return {
      step: "request",
      message: "",
      error: error instanceof Error ? error.message : "Не удалось отправить код",
      phone: "",
      maskedPhone: "",
      expiresAt: null,
      resendAvailableAt: null
    };
  }
}

export async function resendClientSmsLoginCodeAction(
  previousState: LoginFlowState,
  formData: FormData
): Promise<LoginFlowState> {
  const currentPhone = String(formData.get("phone") || previousState.phone || "");

  try {
    const result = await resendClientSmsLoginCode(currentPhone);

    return toVerifyState(
      result.phone,
      "Новый код входа отправлен. Проверьте SMS и введите его ниже.",
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

export async function verifyClientSmsLoginAction(
  previousState: LoginFlowState,
  formData: FormData
): Promise<LoginFlowState> {
  try {
    const user = await verifyClientSmsLogin({
      phone: String(formData.get("phone") || previousState.phone || ""),
      code: String(formData.get("code") || "")
    });

    await createUserSession(user);
  } catch (error) {
    return {
      ...previousState,
      error: error instanceof Error ? error.message : "Не удалось войти"
    };
  }

  redirect("/account");
}

export async function loginMasterAction(formData: FormData) {
  try {
    const user = await authenticateMaster({
      nickname: String(formData.get("nickname") || ""),
      password: String(formData.get("password") || "")
    });

    await createUserSession(user);
    redirect("/master/dashboard");
  } catch (error) {
    redirect(toErrorRedirect(error instanceof Error ? error.message : "Не удалось войти"));
  }
}
