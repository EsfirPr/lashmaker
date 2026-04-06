"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { createUserSession } from "@/lib/auth/server";
import { authenticateMaster, createMasterIfNotExists } from "@/lib/auth/service";

function toErrorRedirect(message: string): Route {
  return `/master/login?error=${encodeURIComponent(message)}` as Route;
}

export async function loginMasterAction(formData: FormData) {
  try {
    await createMasterIfNotExists();
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
