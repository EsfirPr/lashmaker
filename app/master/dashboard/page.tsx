import type { Route } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AdminSlotForm } from "@/components/admin-slot-form";
import { MasterDashboardGreeting } from "@/components/master-dashboard-greeting";
import { MasterScheduleCalendar } from "@/components/master-schedule-calendar";
import { createMasterIfNotExists } from "@/lib/auth/service";
import { requireUserRole } from "@/lib/auth/server";
import { listBookingsForMaster, listScheduleDays } from "@/lib/booking-service";
import { getMasterProfileForOwner, resolveMasterProfile } from "@/lib/portfolio-service";
import { getSlotEndDate } from "@/lib/utils";

function getBookingVisualState(booking: Awaited<ReturnType<typeof listBookingsForMaster>>[number]) {
  if (booking.status === "cancelled") {
    return "cancelled";
  }

  if (booking.time_slots && getSlotEndDate(booking.time_slots) < new Date()) {
    return "completed";
  }

  return "confirmed";
}

function getSettledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function getSlotDurationMinutes(durationInHours: number | null | undefined) {
  const numericValue = Number(durationInHours);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 120;
  }

  return Math.max(30, Math.round(numericValue * 60));
}

function formatDurationLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} ч ${minutes} мин`;
  }

  if (hours > 0) {
    return `${hours} ч`;
  }

  return `${minutes} мин`;
}

function collectSlots(
  days: Awaited<ReturnType<typeof listScheduleDays>>
) {
  const slots: Awaited<ReturnType<typeof listScheduleDays>>[number]["slots"][number][] = [];

  for (const day of days) {
    if (!Array.isArray(day.slots)) {
      continue;
    }

    for (const slot of day.slots) {
      slots.push(slot);
    }
  }

  return slots;
}

export default async function MasterDashboardPage() {
  noStore();
  await createMasterIfNotExists();
  const master = await requireUserRole("master", "/login");

  const [daysResult, bookingsResult, profileResult] = await Promise.allSettled([
    listScheduleDays(),
    listBookingsForMaster(),
    getMasterProfileForOwner(master.id)
  ]);
  const days = getSettledValue(daysResult, []);
  const allBookings = getSettledValue(bookingsResult, []);
  const profile = resolveMasterProfile(master, getSettledValue(profileResult, null));
  const slotDurationMinutes = getSlotDurationMinutes(profile.lash_experience_years);
  const slotDurationLabel = formatDurationLabel(slotDurationMinutes);

  const allSlots = collectSlots(days);
  const activeCount = allBookings.filter((booking) => getBookingVisualState(booking) === "confirmed").length;
  const freeCount = allSlots.filter((slot) => !slot.activeBooking).length;

  return (
    <main className="page-shell">
      <div className="container">
        <section className="panel master-hero">
          <div className="master-hero__copy">
            <div className="master-hero__header">
              <span className="eyebrow master-hero__label">Кабинет мастера</span>
              <div className="master-hero__actions">
                <Link className="button" href="/master/dashboard/bookings/new">
                  Записать клиента
                </Link>
                <Link
                  aria-label="Настройки профиля мастера"
                  className="icon-button"
                  href="/master/profile"
                >
                  <svg
                    aria-label="Настройки"
                    className="cog-icon"
                    role="img"
                    viewBox="0 0 16 16"
                  >
                    <path
                      clipRule="evenodd"
                      d="M.974 8.504l1.728-.825a.94.94 0 00.323-1.439l-1.21-1.498a7.009 7.009 0 011.494-1.895l1.727.847a.931.931 0 001.32-.642l.407-1.88a6.96 6.96 0 012.412.001L9.6 3.057a.934.934 0 001.323.637l1.721-.847a7.053 7.053 0 011.511 1.894L12.957 6.24a.942.942 0 00.33 1.437l1.74.826a7.086 7.086 0 01-.529 2.362l-1.914-.012a.935.935 0 00-.912 1.155l.446 1.874a7.002 7.002 0 01-2.17 1.05l-1.194-1.514a.93.93 0 00-1.466.002l-1.18 1.512a7.09 7.09 0 01-2.178-1.05l.43-1.878a.94.94 0 00-.917-1.15l-1.92.011a7.095 7.095 0 01-.06-.149 7.102 7.102 0 01-.488-2.212zM9.96 7.409a2.11 2.11 0 01-1.18 2.74 2.11 2.11 0 01-2.733-1.195 2.11 2.11 0 011.179-2.741A2.11 2.11 0 019.96 7.409z"
                      fill="currentColor"
                      fillRule="evenodd"
                    />
                  </svg>
                </Link>
                <Link className="ghost-button" href="/">
                  На главную
                </Link>
              </div>
            </div>
            <MasterDashboardGreeting nickname={master.nickname || "мастер"} />
            <p className="lead">
              Здесь собраны расписание, записи, клиенты и быстрые действия.
            </p>
            <div className="master-dashboard-nav">
              <a className="ghost-button" href="#schedule">
                Расписание
              </a>
              <a className="ghost-button" href="#slots">
                Добавить окна
              </a>
              <Link className="ghost-button" href="/master/stats">
                Статистика
              </Link>
            </div>
          </div>
        </section>

        <section className="master-stats-grid section-space">
          <article className="panel stack-card">
            <span className="eyebrow">Сводка</span>
            <div className="stat section-space">
              <strong>{activeCount}</strong>
              <span className="muted">активных записей</span>
            </div>
          </article>
          <article className="panel stack-card">
            <span className="eyebrow">Окна</span>
            <div className="stat section-space">
              <strong>{freeCount}</strong>
              <span className="muted">свободных слотов</span>
            </div>
          </article>
        </section>

        <section className="panel stack-card section-space master-section" id="schedule">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Расписание</span>
              <h2>Календарь мастера</h2>
            </div>
          </div>
          <MasterScheduleCalendar initialDays={days} />
        </section>

        <section className="panel stack-card master-section section-space" id="slots">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Добавить окна</span>
              <h2>Управление доступностью</h2>
            </div>
          </div>
          <div className="section-space">
            <AdminSlotForm initialDays={days} slotDurationMinutes={slotDurationMinutes} />
          </div>
        </section>
      </div>
    </main>
  );
}
