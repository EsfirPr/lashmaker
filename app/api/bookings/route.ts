import { NextResponse } from "next/server";
import { createBooking } from "@/lib/booking-service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await createBooking(payload);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось создать запись"
      },
      { status: 400 }
    );
  }
}

