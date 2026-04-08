"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { createUserSession } from "@/lib/auth/server";
import { registerClient } from "@/lib/auth/service";

function toErrorRedirect(message: string): Route {
  return `/register?error=${encodeURIComponent(message)}` as Route;
}

export async function registerClientAction(formData: FormData) {
  try {
    const user = await registerClient({
      name: String(formData.get("name") || ""),
      phone: String(formData.get("phone") || ""),
      password: String(formData.get("password") || ""),
      privacyAccepted: formData.get("privacyAccepted") === "on"
    });

    await createUserSession(user);
    redirect("/account");
  } catch (error) {
    redirect(toErrorRedirect(error instanceof Error ? error.message : "Не удалось зарегистрироваться"));
  }
}
