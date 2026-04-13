"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AccountBookingCard } from "@/components/account-booking-card";
import type { BookingWithSlot } from "@/lib/types";
import { getSlotEndDate, getSlotStartDate } from "@/lib/utils";

type AccountBookingsHistoryProps = {
  bookings: BookingWithSlot[];
};

type BookingFilter = "latest" | "year" | "all";

const filterOptions: Array<{ label: string; value: BookingFilter }> = [
  { label: "Последняя запись", value: "latest" },
  { label: "За этот год", value: "year" },
  { label: "Все записи", value: "all" }
];

function getBookingMoment(booking: BookingWithSlot) {
  if (booking.time_slots) {
    return getSlotStartDate(booking.time_slots).getTime();
  }

  return new Date(booking.created_at).getTime();
}

function getLatestRelevantBooking(bookings: BookingWithSlot[]) {
  if (bookings.length === 0) {
    return [];
  }

  const now = new Date();
  const upcomingOrCurrent = bookings
    .filter((booking) => booking.time_slots && getSlotEndDate(booking.time_slots) >= now)
    .sort((left, right) => getBookingMoment(left) - getBookingMoment(right));

  if (upcomingOrCurrent.length > 0) {
    return [upcomingOrCurrent[0]];
  }

  return [...bookings].sort((left, right) => getBookingMoment(right) - getBookingMoment(left)).slice(0, 1);
}

function getBookingsForCurrentYear(bookings: BookingWithSlot[]) {
  const currentYear = new Date().getFullYear();

  return bookings.filter((booking) => {
    const date = booking.time_slots
      ? getSlotStartDate(booking.time_slots)
      : new Date(booking.created_at);

    return date.getFullYear() === currentYear;
  });
}

export function AccountBookingsHistory({ bookings }: AccountBookingsHistoryProps) {
  const [filter, setFilter] = useState<BookingFilter>("latest");

  const filteredBookings = useMemo(() => {
    if (filter === "year") {
      return getBookingsForCurrentYear(bookings);
    }

    if (filter === "all") {
      return bookings;
    }

    return getLatestRelevantBooking(bookings);
  }, [bookings, filter]);

  const emptyMessage =
    filter === "year" ? "Записей за выбранный период нет" : "У вас пока нет записей";

  return (
    <div className="account-bookings-history visits-section">
      <div
        className="slot-segmented account-bookings-history__filters"
        aria-label="Фильтр записей"
        role="tablist"
      >
        {filterOptions.map((option) => (
          <button
            aria-selected={filter === option.value}
            className={
              filter === option.value
                ? "slot-segmented__button account-bookings-history__filter-button is-active"
                : "slot-segmented__button account-bookings-history__filter-button"
            }
            key={option.value}
            onClick={() => setFilter(option.value)}
            role="tab"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="account-bookings-list account-bookings-history__list">
        {filteredBookings.length === 0 ? (
          <div className="account-empty">
            <h3>{emptyMessage}</h3>
            <p className="empty-state">
              {filter === "year"
                ? "Попробуйте выбрать другую вкладку, чтобы посмотреть остальные визиты."
                : "Когда вы оформите первую запись, здесь появятся дата, время и статус визита."}
            </p>
            <Link className="button" href="#new-booking">
              Создать запись
            </Link>
          </div>
        ) : null}

        {filteredBookings.map((booking) => (
          <AccountBookingCard booking={booking} key={booking.id} />
        ))}
      </div>
    </div>
  );
}
