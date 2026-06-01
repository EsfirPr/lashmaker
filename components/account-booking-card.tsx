import Link from "next/link";
import { cancelOwnBookingAction } from "@/app/account/actions";
import { SubmitButton } from "@/components/submit-button";
import type { BookingWithSlot } from "@/lib/types";
import { formatDateLabel, formatSlotRange, getSlotEndDate, isBookingCancelable } from "@/lib/utils";

type AccountBookingCardProps = {
  booking: BookingWithSlot;
};

function formatClientBookingDate(value: string) {
  return formatDateLabel(value).replace(" г.", "");
}

function getBookingViewState(booking: BookingWithSlot) {
  if (booking.status === "cancelled") {
    return {
      label: "Отменена",
      className: "status-cancelled",
      compactIcon: "cancel" as const
    };
  }

  if (booking.time_slots && getSlotEndDate(booking.time_slots) < new Date()) {
    return {
      label: "Прошла",
      className: "status-completed",
      compactIcon: null
    };
  }

  return {
    label: "Подтверждена",
    className: "status-confirmed",
    compactIcon: "check" as const
  };
}

function renderStatusIcon(icon: "check" | "cancel" | null) {
  if (icon === "check") {
    return (
      <svg
        aria-hidden="true"
        fill="none"
        height="14"
        viewBox="0 0 14 14"
        width="14"
      >
        <path
          d="M2.5 7.5 5.5 10.5 11.5 3.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (icon === "cancel") {
    return (
      <svg
        aria-hidden="true"
        fill="none"
        height="14"
        viewBox="0 0 14 14"
        width="14"
      >
        <path
          d="M4 4 10 10"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M10 4 4 10"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return null;
}

export function AccountBookingCard({ booking }: AccountBookingCardProps) {
  const viewState = getBookingViewState(booking);
  const isActive = booking.status === "confirmed" && viewState.className === "status-confirmed";
  const canCancel = isActive && booking.time_slots ? isBookingCancelable(booking.time_slots) : false;

  return (
    <article className={`account-booking-card ${viewState.className}`}>
      <header className="account-booking-card__header">
        <div>
          <p className="account-booking-card__eyebrow">Моя запись</p>
          {booking.time_slots ? (
            <div className="account-booking-card__schedule">
              <h3>{formatClientBookingDate(booking.time_slots.slot_date)}</h3>
              <span className="account-booking-card__time-badge">
                {formatSlotRange(booking.time_slots)}
              </span>
            </div>
          ) : (
            <h3>Слот больше недоступен</h3>
          )}
        </div>
        <div className="account-booking-card__status-block">
          <span
            aria-label={viewState.label}
            className={`status-pill ${viewState.className}`}
          >
            {viewState.compactIcon ? (
              <span aria-hidden="true" className="status-pill__icon">
                {renderStatusIcon(viewState.compactIcon)}
              </span>
            ) : null}
            <span className="status-pill__text">{viewState.label}</span>
          </span>
          <Link className="ghost-button" href={`/booking/${booking.public_token}`}>
            Детали записи
          </Link>
        </div>
      </header>

      {canCancel ? (
        <div className="inline-actions">
          <form action={cancelOwnBookingAction}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <SubmitButton className="ghost-button">Отменить</SubmitButton>
          </form>
        </div>
      ) : null}
    </article>
  );
}
