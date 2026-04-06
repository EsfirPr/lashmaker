import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { logoutAction } from "@/app/auth-actions";
import { deleteTimeSlotAction } from "@/app/admin/actions";
import { AdminSlotForm } from "@/components/admin-slot-form";
import { createMasterIfNotExists, listClientsForMaster } from "@/lib/auth/service";
import { requireUserRole } from "@/lib/auth/server";
import { listScheduleDays } from "@/lib/booking-service";
import { formatDateLabel, formatSlotRange } from "@/lib/utils";

export default async function MasterDashboardPage() {
  noStore();
  await createMasterIfNotExists();
  const master = await requireUserRole("master", "/master/login");
  const days = await listScheduleDays();
  const clients = await listClientsForMaster();

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <div>
            <span className="eyebrow">Панель мастера</span>
            <h1 className="page-title">Управление расписанием</h1>
          </div>
          <div className="inline-actions">
            <div className="helper">{master.nickname}</div>
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

        <section className="admin-grid">
          <aside className="panel stack-card">
            <h2>Добавить окно</h2>
            <p className="muted">Создайте слот для записи. Клиенты увидят его на главной странице.</p>
            <div className="section-space">
              <AdminSlotForm />
            </div>
          </aside>

          <section className="day-list">
            {days.length === 0 ? (
              <div className="panel day-card">
                <p className="empty-state">Слотов пока нет. Добавьте первое окно для записи.</p>
              </div>
            ) : null}

            {days.map((day) => (
              <article className="panel day-card" key={day.date}>
                <h2>{formatDateLabel(day.date)}</h2>
                <div className="stack-list">
                  {day.slots.map((slot) => (
                    <div className="slot-item" key={slot.id}>
                      <header>
                        <strong>{formatSlotRange(slot)}</strong>
                        <span
                          className={`status-pill ${
                            slot.activeBooking ? "status-confirmed" : "status-free"
                          }`}
                        >
                          {slot.activeBooking ? "Занято" : "Свободно"}
                        </span>
                      </header>

                      {slot.activeBooking ? (
                        <div className="booking-meta">
                          <strong>Клиент</strong>
                          <div>{slot.activeBooking.name}</div>
                          <div>{slot.activeBooking.phone}</div>
                          <div>{slot.activeBooking.style}</div>
                        </div>
                      ) : (
                        <form action={deleteTimeSlotAction}>
                          <input type="hidden" name="slotId" value={slot.id} />
                          <button className="ghost-button" type="submit">
                            Удалить окно
                          </button>
                        </form>
                      )}

                      {slot.cancelledBookings.length > 0 ? (
                        <div className="stack-list">
                          {slot.cancelledBookings.map((booking) => (
                            <div className="cancelled-item" key={booking.id}>
                              <header>
                                <strong>Отмененная запись</strong>
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
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </section>

        <section className="panel stack-card section-space">
          <h2>Клиенты</h2>
          <div className="list-table section-space">
            {clients.length === 0 ? <p className="empty-state">Клиентов пока нет.</p> : null}
            {clients.map((client) => (
              <div className="list-row" key={client.id}>
                <strong>{client.phone || "Телефон не указан"}</strong>
                <p className="muted">Роль: клиент</p>
                <p className="muted">Количество записей: {client.bookingsCount}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

