import Link from "next/link";
import { cancelOwnBookingAction } from "@/app/account/actions";
import { SubmitButton } from "@/components/submit-button";
import type { BookingWithSlot } from "@/lib/types";
import { formatDateLabel, formatSlotRange, getSlotEndDate, isBookingCancelable } from "@/lib/utils";

type AccountBookingCardProps = {
  booking: BookingWithSlot;
};

function getBookingViewState(booking: BookingWithSlot) {
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
    label: "Подтверждена",
    className: "status-confirmed"
  };
}

export function AccountBookingCard({ booking }: AccountBookingCardProps) {
  const viewState = getBookingViewState(booking);
  const isActive = booking.status === "confirmed" && viewState.className === "status-confirmed";
  const canCancel = isActive && booking.time_slots ? isBookingCancelable(booking.time_slots) : false;

  return (
    <article className={`account-booking-card ${viewState.className}`}>
      <header className="account-booking-card__header">
        <div>
          <p className="account-booking-card__eyebrow">Запись клиента</p>
          <h3>
            {booking.time_slots
              ? `${formatDateLabel(booking.time_slots.slot_date)}, ${formatSlotRange(
                  booking.time_slots
                )}`
              : "Слот больше недоступен"}
          </h3>
        </div>
        <span className={`status-pill ${viewState.className}`}>{viewState.label}</span>
      </header>

      <div className="account-booking-card__grid">
        <div className="account-booking-card__meta">
          <strong>Стиль</strong>
          <span>{booking.style}</span>
        </div>
        <div className="account-booking-card__meta">
          <strong>Контакт</strong>
          <span>{booking.phone}</span>
        </div>
      </div>

      <div className="account-booking-card__notes">
        <strong>Пожелания</strong>
        <p>{booking.notes || "Пожелания не указаны."}</p>
      </div>

      <div className="inline-actions">
        <Link className="ghost-button" href={`/booking/${booking.public_token}`}>
          Детали записи
        </Link>
        {canCancel ? (
          <form action={cancelOwnBookingAction}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <SubmitButton className="ghost-button">Отменить</SubmitButton>
          </form>
        ) : null}
      </div>
    </article>
  );
}
