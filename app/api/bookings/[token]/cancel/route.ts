import { NextResponse } from "next/server";
import { cancelBookingByToken } from "@/lib/booking-service";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const booking = await cancelBookingByToken(token);

    return NextResponse.json({ status: booking.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось отменить запись"
      },
      { status: 400 }
    );
  }
}

