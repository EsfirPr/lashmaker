import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { listScheduleDaysInRange } from "@/lib/booking-service";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "master") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start") || "";
    const end = searchParams.get("end") || "";
    const days = await listScheduleDaysInRange(start, end);

    return NextResponse.json({ days });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось загрузить расписание"
      },
      { status: 400 }
    );
  }
}
