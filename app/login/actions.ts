"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { authenticateUser } from "@/lib/auth/service";
import { createUserSession } from "@/lib/auth/server";

function toErrorRedirect(message: string): Route {
  return `/login?error=${encodeURIComponent(message)}` as Route;
}

export async function loginUserAction(formData: FormData) {
  try {
    const user = await authenticateUser({
      identifier: String(formData.get("identifier") || ""),
      password: String(formData.get("password") || "")
    });

    await createUserSession(user);
    redirect(user.role === "master" ? "/master/dashboard" : "/account");
  } catch (error) {
    redirect(toErrorRedirect(error instanceof Error ? error.message : "Не удалось войти"));
  }
}
