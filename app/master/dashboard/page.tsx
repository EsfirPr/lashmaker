import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { logoutAction } from "@/app/auth-actions";
import { AdminSlotForm } from "@/components/admin-slot-form";
import { MasterPortfolioManager } from "@/components/master-portfolio-manager";
import { MasterBookingListItem } from "@/components/master-booking-list-item";
import { MasterScheduleDay } from "@/components/master-schedule-day";
import { createMasterIfNotExists, listClientsForMaster } from "@/lib/auth/service";
import { requireUserRole } from "@/lib/auth/server";
import { listBookingsForMaster, listScheduleDays } from "@/lib/booking-service";
import { getPortfolioDashboardData, resolveMasterProfile } from "@/lib/portfolio-service";
import { formatDateLabel, formatSlotRange, getSlotEndDate } from "@/lib/utils";

type MasterDashboardPageProps = {
  searchParams?: Promise<{
    status?: string;
    date?: string;
    query?: string;
  }>;
};

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
  const portfolioProfile = resolveMasterProfile(master, portfolioData.profile);

  const allSlots = days.flatMap((day) => day.slots);
  const activeCount = allBookings.filter((booking) => getBookingVisualState(booking) === "confirmed").length;
  const freeCount = allSlots.filter((slot) => !slot.activeBooking).length;
  const cancelledCount = allBookings.filter((booking) => booking.status === "cancelled").length;
  const upcomingBookings = allBookings
    .filter((booking) => booking.time_slots && getBookingVisualState(booking) === "confirmed")
    .slice(0, 4);
  const cancelledBookings = allBookings.filter((booking) => booking.status === "cancelled");

  return (
    <main className="page-shell">
      <div className="container">
        <section className="panel master-hero">
          <div className="master-hero__copy">
            <span className="eyebrow">Кабинет мастера</span>
            <h1 className="page-title">Здравствуйте, {master.nickname}</h1>
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
              <a className="ghost-button" href="#portfolio-manager">
                Портфолио
              </a>
              <a className="ghost-button" href="#cancellations">
                Отмены
              </a>
            </div>
          </div>
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
        </section>

        <section className="page-columns section-space">
          <section className="panel stack-card master-section">
            <div className="account-section__heading">
              <div>
                <span className="eyebrow">Ближайшие записи</span>
                <h2>Что запланировано дальше</h2>
              </div>
            </div>
            <div className="master-upcoming-list section-space">
              {upcomingBookings.length === 0 ? (
                <p className="empty-state">Ближайших активных записей пока нет.</p>
              ) : null}
              {upcomingBookings.map((booking) => (
                <div className="master-upcoming-card" key={booking.id}>
                  <strong>{booking.name}</strong>
                  <p className="muted">
                    {booking.time_slots
                      ? `${formatDateLabel(booking.time_slots.slot_date)}, ${formatSlotRange(
                          booking.time_slots
                        )}`
                      : "Нет времени"}
                  </p>
                  <p className="muted">
                    {booking.phone} • {booking.style}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <aside className="panel stack-card master-section" id="slots">
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
          </aside>
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
              <Link className="ghost-button" href="/master/dashboard">
                Сбросить
              </Link>
            </div>
          </form>

          <div className="master-bookings-list section-space">
            {bookings.length === 0 ? (
              <p className="empty-state">По выбранным фильтрам записи не найдены.</p>
            ) : null}
            {bookings.map((booking) => (
              <MasterBookingListItem booking={booking} key={booking.id} />
            ))}
          </div>
        </section>

        <section className="panel stack-card section-space master-section" id="schedule">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Расписание</span>
              <h2>Слоты по дням</h2>
            </div>
          </div>
          <div className="master-schedule-list section-space">
            {days.length === 0 ? (
              <div className="account-empty">
                <div className="account-empty__icon">M</div>
                <h3>Слотов пока нет</h3>
                <p className="empty-state">
                  Добавьте первое окно, чтобы клиенты смогли выбрать время для записи.
                </p>
              </div>
            ) : null}
            {days.map((day) => (
              <MasterScheduleDay day={day} key={day.date} />
            ))}
          </div>
        </section>

        <section className="panel stack-card section-space master-section" id="clients">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Клиенты</span>
              <h2>Клиентская база</h2>
            </div>
          </div>
          <div className="master-clients-list section-space">
            {clients.length === 0 ? <p className="empty-state">Клиентов пока нет.</p> : null}
            {clients.map((client) => (
              <article className="master-client-card" key={client.id}>
                <div className="master-client-card__head">
                  <strong>{client.displayName || client.phone || "Клиент без имени"}</strong>
                  <span className="status-pill status-free">{client.bookingsCount} записей</span>
                </div>
                <p className="muted">{client.phone || "Телефон не указан"}</p>
                <p className="muted">
                  Ближайшая запись: {client.nextBookingLabel || "Пока не запланирована"}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-space">
          <MasterPortfolioManager items={portfolioData.items} profile={portfolioProfile} />
        </section>

        <section className="panel stack-card section-space master-section" id="cancellations">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Отмены</span>
              <h2>Отменённые записи</h2>
            </div>
          </div>
          <p className="helper">Инициатор отмены пока не сохраняется отдельно в базе.</p>
          <div className="master-cancellations-list section-space">
            {cancelledBookings.length === 0 ? (
              <p className="empty-state">Пока нет отменённых записей.</p>
            ) : null}
            {cancelledBookings.map((booking) => (
              <div className="cancelled-item" key={booking.id}>
                <header>
                  <strong>
                    {booking.time_slots
                      ? `${formatDateLabel(booking.time_slots.slot_date)}, ${formatSlotRange(
                          booking.time_slots
                        )}`
                      : "Без времени"}
                  </strong>
                  <span className="status-pill status-cancelled">Отменена</span>
                </header>
                <p>
                  {booking.name} • {booking.phone}
                </p>
                <p className="muted">
                  {booking.style}
                  {booking.notes ? ` • ${booking.notes}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
