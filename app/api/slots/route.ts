import { NextResponse } from "next/server";
import { listAvailableSlots } from "@/lib/booking-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || "";
    const slots = await listAvailableSlots(date);

    return NextResponse.json({ slots });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось загрузить слоты"
      },
      { status: 400 }
    );
  }
}

