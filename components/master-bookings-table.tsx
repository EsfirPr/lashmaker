"use client";

import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { BookingWithSlot } from "@/lib/types";
import { formatDateLabel, formatSlotRange } from "@/lib/utils";

type MasterBookingsTableProps = {
  bookings: BookingWithSlot[];
};

export function MasterBookingsTable({ bookings }: MasterBookingsTableProps) {
  const router = useRouter();

  function openBooking(token: string) {
    router.push(`/booking/${token}`);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, token: string) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openBooking(token);
  }

  return (
    <div className="master-bookings-table-wrap">
      <table className="master-bookings-table">
        <thead>
          <tr>
            <th>Дата и время</th>
            <th>Имя</th>
            <th>Контакт</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr
              className="master-bookings-row"
              key={booking.id}
              onClick={() => openBooking(booking.public_token)}
              onKeyDown={(event) => handleRowKeyDown(event, booking.public_token)}
              role="link"
              tabIndex={0}
            >
              <td>
                {booking.time_slots
                  ? `${formatDateLabel(booking.time_slots.slot_date)}, ${formatSlotRange(
                      booking.time_slots
                    )}`
                  : "Нет привязанного слота"}
              </td>
              <td>{booking.name}</td>
              <td>{booking.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
