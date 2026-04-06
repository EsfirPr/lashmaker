import { deleteTimeSlotAction } from "@/app/admin/actions";
import type { DaySchedule } from "@/lib/types";
import { formatDateLabel, formatSlotRange } from "@/lib/utils";

type MasterScheduleDayProps = {
  day: DaySchedule;
};

export function MasterScheduleDay({ day }: MasterScheduleDayProps) {
  return (
    <article className="panel day-card master-day-card">
      <header className="master-day-card__header">
        <div>
          <p className="account-booking-card__eyebrow">Расписание</p>
          <h2>{formatDateLabel(day.date)}</h2>
        </div>
        <div className="inline-actions">
          <span className="status-pill status-free">
            Свободных: {day.slots.filter((slot) => !slot.activeBooking).length}
          </span>
          <span className="status-pill status-confirmed">
            Занятых: {day.slots.filter((slot) => Boolean(slot.activeBooking)).length}
          </span>
        </div>
      </header>

      <div className="stack-list">
        {day.slots.map((slot) => (
          <div
            className={`master-slot-card ${
              slot.activeBooking ? "master-slot-card--busy" : "master-slot-card--free"
            }`}
            key={slot.id}
          >
            <header className="master-slot-card__header">
              <div>
                <strong>{formatSlotRange(slot)}</strong>
                <p className="muted">
                  {slot.activeBooking ? "Окно занято клиентом" : "Окно доступно для онлайн-записи"}
                </p>
              </div>
              <span
                className={`status-pill ${slot.activeBooking ? "status-confirmed" : "status-free"}`}
              >
                {slot.activeBooking ? "Занято" : "Свободно"}
              </span>
            </header>

            {slot.activeBooking ? (
              <div className="master-slot-card__grid">
                <div className="booking-meta">
                  <strong>Имя</strong>
                  <span>{slot.activeBooking.name}</span>
                </div>
                <div className="booking-meta">
                  <strong>Телефон</strong>
                  <span>{slot.activeBooking.phone}</span>
                </div>
                <div className="booking-meta">
                  <strong>Стиль</strong>
                  <span>{slot.activeBooking.style}</span>
                </div>
                <div className="booking-meta">
                  <strong>Пожелания</strong>
                  <span>{slot.activeBooking.notes || "Не указаны"}</span>
                </div>
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
              <div className="master-cancelled-stack">
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
  );
}

