"use server";

import { redirect } from "next/navigation";
import { clearUserSession } from "@/lib/auth/server";

export async function logoutAction() {
  await clearUserSession();
  redirect("/");
}

