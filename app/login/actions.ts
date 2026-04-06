"use server";

import { redirect } from "next/navigation";
import { authenticateClient } from "@/lib/auth/service";
import { createUserSession } from "@/lib/auth/server";

function toErrorRedirect(message: string) {
  return `/login?error=${encodeURIComponent(message)}`;
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

