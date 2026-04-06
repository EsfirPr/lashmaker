import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendUpcomingReminders } from "@/lib/booking-service";

function isAuthorized(request: Request) {
  const authHeader = request.headers.get("authorization");
  const legacySecret = request.headers.get("x-cron-secret");

  if (!env.cronSecret) {
    return true;
  }

  return authHeader === `Bearer ${env.cronSecret}` || legacySecret === env.cronSecret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendUpcomingReminders();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось отправить напоминания"
      },
      { status: 500 }
    );
  }
}
