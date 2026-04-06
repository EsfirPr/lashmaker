"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { authenticateClient } from "@/lib/auth/service";
import { createUserSession } from "@/lib/auth/server";

function toErrorRedirect(message: string): Route {
  return `/login?error=${encodeURIComponent(message)}` as Route;
}

export async function loginClientAction(formData: FormData) {
  try {
    const user = await authenticateClient({
      phone: String(formData.get("phone") || ""),
      password: String(formData.get("password") || "")
    });

    await createUserSession(user);
    redirect("/account");
  } catch (error) {
    redirect(toErrorRedirect(error instanceof Error ? error.message : "Не удалось войти"));
  }
}
