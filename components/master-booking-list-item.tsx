import Link from "next/link";
import type { BookingWithSlot } from "@/lib/types";
import { formatDateLabel, formatSlotRange, getSlotEndDate } from "@/lib/utils";

type MasterBookingListItemProps = {
  booking: BookingWithSlot;
};

function getMasterBookingState(booking: BookingWithSlot) {
  if (booking.status === "cancelled") {
    return {
      label: "Отменена",
      className: "status-cancelled"
    };
  }

  if (booking.time_slots && getSlotEndDate(booking.time_slots) < new Date()) {
    return {
      label: "Прошла",
      className: "status-completed"
    };
  }

  return {
    label: "Активна",
    className: "status-confirmed"
  };
}

export function MasterBookingListItem({ booking }: MasterBookingListItemProps) {
  const state = getMasterBookingState(booking);

  return (
    <article className="master-booking-item">
      <header className="master-booking-item__header">
        <div>
          <p className="account-booking-card__eyebrow">Запись</p>
          <h3>{booking.name}</h3>
        </div>
        <span className={`status-pill ${state.className}`}>{state.label}</span>
      </header>

      <div className="master-booking-item__grid">
        <div className="booking-meta">
          <strong>Дата и время</strong>
          <span>
            {booking.time_slots
              ? `${formatDateLabel(booking.time_slots.slot_date)}, ${formatSlotRange(
                  booking.time_slots
                )}`
              : "Нет привязанного слота"}
          </span>
        </div>
        <div className="booking-meta">
          <strong>Контакт</strong>
          <span>{booking.phone}</span>
        </div>
        <div className="booking-meta">
          <strong>Стиль</strong>
          <span>{booking.style}</span>
        </div>
        <div className="booking-meta">
          <strong>Пожелания</strong>
          <span>{booking.notes || "Не указаны"}</span>
        </div>
      </div>

      <div className="inline-actions">
        <Link className="ghost-button" href={`/booking/${booking.public_token}`}>
          Открыть запись
        </Link>
      </div>
    </article>
  );
}

