import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendTomorrowReminders } from "@/lib/booking-service";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");

  if (env.cronSecret && secret !== env.cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendTomorrowReminders();
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

