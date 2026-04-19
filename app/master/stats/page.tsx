import type { Route } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { MasterBookingsTable } from "@/components/master-bookings-table";
import { MasterClientsTable } from "@/components/master-clients-table";
import { createMasterIfNotExists, listClientsForMaster } from "@/lib/auth/service";
import { requireUserRole } from "@/lib/auth/server";
import { listBookingsForMaster } from "@/lib/booking-service";
import { getSlotEndDate } from "@/lib/utils";

type MasterStatsPageProps = {
  searchParams?: Promise<{
    status?: string;
    date?: string;
    page?: string;
    query?: string;
  }>;
};

const bookingsPerPage = 5;

function getBookingVisualState(booking: Awaited<ReturnType<typeof listBookingsForMaster>>[number]) {
  if (booking.status === "cancelled") {
    return "cancelled";
  }

  if (booking.time_slots && getSlotEndDate(booking.time_slots) < new Date()) {
    return "completed";
  }

  return "confirmed";
}

function buildStatsPageHref(
  filters: Awaited<NonNullable<MasterStatsPageProps["searchParams"]>>,
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
  return `/master/stats${query ? `?${query}` : ""}#bookings` as Route;
}

function getSettledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

export default async function MasterStatsPage({ searchParams }: MasterStatsPageProps) {
  noStore();
  await createMasterIfNotExists();
  await requireUserRole("master", "/login");
  const filters = (await searchParams) || {};

  const [clientsResult, allBookingsResult, bookingsResult] = await Promise.allSettled([
    listClientsForMaster(),
    listBookingsForMaster(),
    listBookingsForMaster(filters)
  ]);
  const clients = getSettledValue(clientsResult, []);
  const allBookings = getSettledValue(allBookingsResult, []);
  const bookings = getSettledValue(bookingsResult, []);
  const cancelledCount = allBookings.filter((booking) => getBookingVisualState(booking) === "cancelled").length;

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
        <section className="panel master-hero master-profile-hero">
          <div className="master-hero__copy">
            <div className="master-hero__header">
              <span className="eyebrow master-hero__label">Статистика</span>
              <div className="master-hero__actions">
                <Link className="ghost-button" href="/master/dashboard">
                  Назад в кабинет
                </Link>
                <Link className="ghost-button" href="/master/dashboard/bookings/new">
                  Записать клиента
                </Link>
              </div>
            </div>
            <h1 className="page-title">Статистика</h1>
            <p className="lead">
              Здесь собраны все записи и клиентская база. Основной кабинет остаётся лёгким и
              сфокусированным на расписании и быстрых действиях.
            </p>
            <div className="master-dashboard-nav">
              <a className="ghost-button" href="#bookings">
                Записи
              </a>
              <a className="ghost-button" href="#clients">
                Клиенты
              </a>
            </div>
          </div>
        </section>

        <section className="master-stats-grid section-space">
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
        </section>

        <section className="panel stack-card section-space master-section" id="bookings">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Записи</span>
              <h2>Все бронирования</h2>
            </div>
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
              <Link className="ghost-button" href="/master/stats">
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
                    href={buildStatsPageHref(filters, currentBookingPage - 1)}
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
                        href={buildStatsPageHref(filters, page)}
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
                    href={buildStatsPageHref(filters, currentBookingPage + 1)}
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
