import { NextResponse } from "next/server";
import { sendUpcomingReminders } from "@/lib/booking-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const expected = cronSecret ? `Bearer ${cronSecret}`.trim() : undefined;
    const actual = authHeader?.trim();

    console.log("CRON_SECRET =", JSON.stringify(process.env.CRON_SECRET));
    console.log("AUTH HEADER =", JSON.stringify(request.headers.get("authorization")));
    console.log(
      "MATCH =",
      request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
    );

    if (!cronSecret) {
      console.warn("CRON_SECRET not set");
    }

    if (cronSecret && actual !== expected) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await sendUpcomingReminders();

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    console.error("Failed to send reminders", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
