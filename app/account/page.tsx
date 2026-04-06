import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { cancelOwnBookingAction } from "@/app/account/actions";
import { logoutAction } from "@/app/auth-actions";
import { requireUserRole } from "@/lib/auth/server";
import { listBookingsForClient } from "@/lib/booking-service";
import { formatDateLabel, formatSlotRange, formatStatusLabel } from "@/lib/utils";

export default async function AccountPage() {
  noStore();
  const user = await requireUserRole("client", "/login");
  const bookings = await listBookingsForClient(user.id);

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <div>
            <span className="eyebrow">Личный кабинет</span>
            <h1 className="page-title">Мои записи</h1>
          </div>
          <div className="inline-actions">
            <Link className="ghost-button" href="/">
              На главную
            </Link>
            <form action={logoutAction}>
              <button className="ghost-button" type="submit">
                Выйти
              </button>
            </form>
          </div>
        </nav>

        <section className="page-columns">
          <section className="panel stack-card">
            <h2>Аккаунт</h2>
            <div className="meta-grid section-space">
              <div className="booking-meta">
                <strong>Роль</strong>
                <span>Клиент</span>
              </div>
              <div className="booking-meta">
                <strong>Телефон</strong>
                <span>{user.phone || "Не указан"}</span>
              </div>
            </div>
          </section>

          <aside className="panel stack-card">
            <h2>Быстрые действия</h2>
            <div className="stack-list section-space">
              <Link className="ghost-button" href="/">
                Новая запись
              </Link>
              <Link
                className="ghost-button"
                href={bookings[0] ? `/booking/${bookings[0].public_token}` : "/"}
              >
                Последняя запись
              </Link>
            </div>
          </aside>
        </section>

        <section className="panel stack-card section-space">
          <h2>История бронирований</h2>
          <div className="list-table section-space">
            {bookings.length === 0 ? (
              <p className="empty-state">Пока нет записей, привязанных к этому аккаунту.</p>
            ) : null}

            {bookings.map((booking) => (
              <div className="list-row" key={booking.id}>
                <header className="inline-actions">
                  <strong>
                    {booking.time_slots
                      ? `${formatDateLabel(booking.time_slots.slot_date)}, ${formatSlotRange(
                          booking.time_slots
                        )}`
                      : "Без привязанного слота"}
                  </strong>
                  <span
                    className={`status-pill ${
                      booking.status === "confirmed" ? "status-confirmed" : "status-cancelled"
                    }`}
                  >
                    {formatStatusLabel(booking.status)}
                  </span>
                </header>
                <p className="muted">
                  {booking.style}
                  {booking.notes ? ` • ${booking.notes}` : ""}
                </p>
                <div className="inline-actions">
                  <Link className="ghost-button" href={`/booking/${booking.public_token}`}>
                    Открыть публичную страницу
                  </Link>
                  {booking.status === "confirmed" ? (
                    <form action={cancelOwnBookingAction}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button className="ghost-button" type="submit">
                        Отменить
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
