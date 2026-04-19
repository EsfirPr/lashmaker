import type { Route } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { logoutAction } from "@/app/auth-actions";
import { AdminSlotForm } from "@/components/admin-slot-form";
import { MasterBookingsTable } from "@/components/master-bookings-table";
import { MasterClientsTable } from "@/components/master-clients-table";
import { MasterDashboardGreeting } from "@/components/master-dashboard-greeting";
import { MasterScheduleCalendar } from "@/components/master-schedule-calendar";
import { createMasterIfNotExists, listClientsForMaster } from "@/lib/auth/service";
import { requireUserRole } from "@/lib/auth/server";
import { listBookingsForMaster, listScheduleDays } from "@/lib/booking-service";
import { getPortfolioDashboardData } from "@/lib/portfolio-service";
import { getSlotEndDate } from "@/lib/utils";

type MasterDashboardPageProps = {
  searchParams?: Promise<{
    status?: string;
    date?: string;
    page?: string;
    query?: string;
  }>;
};

const bookingsPerPage = 5;

function buildDashboardPageHref(
  filters: Awaited<NonNullable<MasterDashboardPageProps["searchParams"]>>,
  page: number
): Route {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.date) {
    params.set("date", filters.date);
  }

  if (filters.query) {
    params.set("query", filters.query);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return `/master/dashboard${query ? `?${query}` : ""}#bookings` as Route;
}

function getBookingVisualState(booking: Awaited<ReturnType<typeof listBookingsForMaster>>[number]) {
  if (booking.status === "cancelled") {
    return "cancelled";
  }

  if (booking.time_slots && getSlotEndDate(booking.time_slots) < new Date()) {
    return "completed";
  }

  return "confirmed";
}

export default async function MasterDashboardPage({ searchParams }: MasterDashboardPageProps) {
  noStore();
  await createMasterIfNotExists();
  const master = await requireUserRole("master", "/login");
  const filters = (await searchParams) || {};

  const [days, clients, allBookings, bookings, portfolioData] = await Promise.all([
    listScheduleDays(),
    listClientsForMaster(),
    listBookingsForMaster(),
    listBookingsForMaster(filters),
    getPortfolioDashboardData(master.id)
  ]);

  const allSlots = days.flatMap((day) => day.slots);
  const activeCount = allBookings.filter((booking) => getBookingVisualState(booking) === "confirmed").length;
  const freeCount = allSlots.filter((slot) => !slot.activeBooking).length;
  const cancelledCount = allBookings.filter((booking) => booking.status === "cancelled").length;
  const serviceCount = portfolioData.services.length;
  const totalBookingPages = Math.max(1, Math.ceil(bookings.length / bookingsPerPage));
  const requestedPage = Number.parseInt(filters.page || "1", 10);
  const currentBookingPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, totalBookingPages)
      : 1;
  const bookingPageStart = (currentBookingPage - 1) * bookingsPerPage;
  const visibleBookings = bookings.slice(bookingPageStart, bookingPageStart + bookingsPerPage);
  const bookingPageNumbers = Array.from({ length: totalBookingPages }, (_, index) => index + 1);

  return (
    <main className="page-shell">
      <div className="container">
        <section className="panel master-hero">
          <div className="master-hero__copy">
            <div className="master-hero__header">
              <span className="eyebrow master-hero__label">Кабинет мастера</span>
              <div className="master-hero__actions">
                <Link className="ghost-button" href="/">
                  На главную
                </Link>
                <form action={logoutAction}>
                  <button className="ghost-button" type="submit">
                    Выйти
                  </button>
                </form>
              </div>
            </div>
            <MasterDashboardGreeting nickname={master.nickname || "мастер"} />
            <p className="lead">
              Здесь собраны расписание, записи, клиенты и быстрые действия. Все данные доступны
              только мастеру с ролью `master`.
            </p>
            <div className="master-dashboard-nav">
              <a className="ghost-button" href="#schedule">
                Расписание
              </a>
              <a className="ghost-button" href="#bookings">
                Записи
              </a>
              <a className="ghost-button" href="#clients">
                Клиенты
              </a>
              <a className="ghost-button" href="#slots">
                Добавить окна
              </a>
              <Link className="ghost-button" href="/master/profile">
                Профиль мастера
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
          <article className="panel stack-card">
            <span className="eyebrow">Отмены</span>
            <div className="stat section-space">
              <strong>{cancelledCount}</strong>
              <span className="muted">отменённых записей</span>
            </div>
          </article>
          <article className="panel stack-card">
            <span className="eyebrow">Клиенты</span>
            <div className="stat section-space">
              <strong>{clients.length}</strong>
              <span className="muted">клиентов в базе</span>
            </div>
          </article>
          <article className="panel stack-card">
            <span className="eyebrow">Портфолио</span>
            <div className="stat section-space">
              <strong>{portfolioData.items.length}</strong>
              <span className="muted">работ на главной</span>
            </div>
          </article>
          <article className="panel stack-card">
            <span className="eyebrow">Прайс</span>
            <div className="stat section-space">
              <strong>{serviceCount}</strong>
              <span className="muted">услуг в прайсе</span>
            </div>
          </article>
        </section>

        <section className="panel stack-card master-section section-space">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Профиль мастера</span>
              <h2>Публичная страница и контент</h2>
            </div>
            <Link className="button" href="/master/profile">
              Управление профилем
            </Link>
          </div>
          <p className="muted">
            Информацию о мастере, портфолио и прайс мы вынесли на отдельную страницу, чтобы кабинет
            оставался быстрым и сфокусированным на работе с расписанием, записями и клиентами.
          </p>
          <div className="master-profile-preview-grid section-space">
            <article className="master-profile-preview-card">
              <strong>{portfolioData.profile?.display_name || master.nickname || "Без имени"}</strong>
              <span className="muted">имя и тексты профиля</span>
            </article>
            <article className="master-profile-preview-card">
              <strong>{portfolioData.items.length}</strong>
              <span className="muted">изображений в портфолио</span>
            </article>
            <article className="master-profile-preview-card">
              <strong>{serviceCount}</strong>
              <span className="muted">услуг доступны клиентам</span>
            </article>
          </div>
          <div className="inline-actions">
            <Link className="ghost-button" href="/master/profile">
              Редактировать профиль
            </Link>
            <Link className="ghost-button" href="/#pricing">
              Посмотреть публичную страницу
            </Link>
          </div>
        </section>

        <section className="panel stack-card master-section section-space" id="slots">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Добавить окна</span>
              <h2>Управление доступностью</h2>
            </div>
          </div>
          <p className="muted">
            Можно создать одно окно или сразу несколько интервалов на выбранную дату.
          </p>
          <div className="section-space">
            <AdminSlotForm />
          </div>
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

        <section className="panel stack-card section-space master-section" id="bookings">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Записи</span>
              <h2>Все бронирования</h2>
            </div>
            <Link className="button" href="/master/dashboard/bookings/new">
              Записать клиента
            </Link>
          </div>

          <form className="master-filters section-space" method="get">
            <div className="field">
              <label htmlFor="status">Статус</label>
              <select defaultValue={filters.status || ""} id="status" name="status">
                <option value="">Все</option>
                <option value="active">Активные</option>
                <option value="confirmed">Подтверждённые</option>
                <option value="cancelled">Отменённые</option>
                <option value="completed">Прошедшие</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="date">Дата</label>
              <input defaultValue={filters.date || ""} id="date" name="date" type="date" />
            </div>
            <div className="field">
              <label htmlFor="query">Поиск</label>
              <input
                defaultValue={filters.query || ""}
                id="query"
                name="query"
                placeholder="Имя, телефон или стиль"
              />
            </div>
            <div className="inline-actions">
              <button className="button" type="submit">
                Применить
              </button>
              <Link className="ghost-button" href="/master/dashboard">
                Сбросить
              </Link>
            </div>
          </form>

          <div className="master-bookings-list section-space">
            {bookings.length === 0 ? (
              <p className="empty-state">По выбранным фильтрам записи не найдены.</p>
            ) : null}
            {visibleBookings.length > 0 ? <MasterBookingsTable bookings={visibleBookings} /> : null}
          </div>

          {bookings.length > bookingsPerPage ? (
            <nav aria-label="Пагинация бронирований" className="master-pagination section-space">
              <div className="master-pagination__track">
                {currentBookingPage > 1 ? (
                  <Link
                    className="master-pagination__item master-pagination__item--nav"
                    href={buildDashboardPageHref(filters, currentBookingPage - 1)}
                  >
                    Назад
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="master-pagination__item master-pagination__item--nav is-disabled"
                  >
                    Назад
                  </span>
                )}

                <div className="master-pagination__pages">
                  {bookingPageNumbers.map((page) =>
                    page === currentBookingPage ? (
                      <span
                        aria-current="page"
                        className="master-pagination__item is-active"
                        key={page}
                      >
                        {page}
                      </span>
                    ) : (
                      <Link
                        className="master-pagination__item"
                        href={buildDashboardPageHref(filters, page)}
                        key={page}
                      >
                        {page}
                      </Link>
                    )
                  )}
                </div>

                {currentBookingPage < totalBookingPages ? (
                  <Link
                    className="master-pagination__item master-pagination__item--nav"
                    href={buildDashboardPageHref(filters, currentBookingPage + 1)}
                  >
                    Вперёд
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="master-pagination__item master-pagination__item--nav is-disabled"
                  >
                    Вперёд
                  </span>
                )}
              </div>
            </nav>
          ) : null}
        </section>

        <section className="panel stack-card section-space master-section" id="clients">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Клиенты</span>
              <h2>Клиентская база</h2>
            </div>
          </div>
          <MasterClientsTable clients={clients} />
        </section>
      </div>
    </main>
  );
}
