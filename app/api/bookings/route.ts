import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createBooking } from "@/lib/booking-service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const user = await getCurrentUser();

     if (user?.role === "client") {
      if (!user.name?.trim() || !user.phone?.trim()) {
        throw new Error("Профиль клиента заполнен не полностью");
      }

      const result = await createBooking({
        ...payload,
        name: user.name,
        phone: user.phone,
        userId: user.id
      });

      return NextResponse.json(result, { status: 201 });
    }

    const result = await createBooking({
      ...payload,
      userId: null
    });

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
