import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createBookingRequest } from "@/lib/booking-service";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "client") {
      return NextResponse.json({ error: "Войдите в кабинет клиента" }, { status: 401 });
    }

    if (!user.name?.trim() || !user.phone?.trim()) {
      return NextResponse.json({ error: "Заполните имя и телефон в настройках профиля" }, { status: 400 });
    }

    const payload = (await request.json()) as {
      style?: string;
      notes?: string;
    };
    const result = await createBookingRequest({
      userId: user.id,
      name: user.name,
      phone: user.phone,
      style: payload.style || "",
      notes: payload.notes || ""
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось отправить заявку"
      },
      { status: 400 }
    );
  }
}
