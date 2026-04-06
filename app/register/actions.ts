"use server";

import { redirect } from "next/navigation";
import { createUserSession } from "@/lib/auth/server";
import { registerClient } from "@/lib/auth/service";

function toErrorRedirect(message: string) {
  return `/register?error=${encodeURIComponent(message)}`;
}

export async function registerClientAction(formData: FormData) {
  try {
    const user = await registerClient({
      phone: String(formData.get("phone") || ""),
      password: String(formData.get("password") || "")
    });

    await createUserSession(user);
    redirect("/account");
  } catch (error) {
    redirect(toErrorRedirect(error instanceof Error ? error.message : "Не удалось зарегистрироваться"));
  }
}

