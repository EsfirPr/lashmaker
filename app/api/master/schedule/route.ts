import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/lib/auth/service";
import { getCurrentUser } from "@/lib/auth/server";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "@/lib/auth/session";
import { listScheduleDaysInRange } from "@/lib/booking-service";

export async function GET(request: NextRequest) {
  try {
    const sessionValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionCookieValue(sessionValue);
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start") || "";
    const end = searchParams.get("end") || "";

    if (!user || user.role !== "master") {
      const sessionUser = session?.userId ? await getUserById(session.userId) : null;
      console.warn("[api/master/schedule] Forbidden", {
        hasSessionCookie: Boolean(sessionValue),
        sessionUserId: session?.userId ?? null,
        sessionRole: session?.role ?? null,
        resolvedSessionUserId: sessionUser?.id ?? null,
        resolvedSessionUserRole: sessionUser?.role ?? null,
        currentUserId: user?.id ?? null,
        currentUserRole: user?.role ?? null,
        start,
        end,
        reason: !session
          ? "missing_or_invalid_session"
          : !sessionUser
            ? "session_user_not_found"
            : user?.role !== "master"
              ? "user_is_not_master"
              : "unknown_forbidden"
      });
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const days = await listScheduleDaysInRange(start, end);

    return NextResponse.json({ days });
  } catch (error) {
    console.error("[api/master/schedule] Failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось загрузить расписание"
      },
      { status: 400 }
    );
  }
}
