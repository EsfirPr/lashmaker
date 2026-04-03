import type { BookingStatus, TimeSlot } from "@/lib/types";

const appTimeZone = process.env.APP_TIMEZONE || "Europe/Moscow";
const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: appTimeZone,
  day: "numeric",
  month: "long",
  year: "numeric"
});

function getDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Could not format date");
  }

  return { year, month, day };
}

export function formatDateLabel(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

export function formatSlotRange(slot: Pick<TimeSlot, "start_time" | "end_time">) {
  return `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`;
}

export function formatStatusLabel(status: BookingStatus) {
  return status === "confirmed" ? "Подтверждена" : "Отменена";
}

export function getTodayDate() {
  const { year, month, day } = getDateParts(new Date());
  return `${year}-${month}-${day}`;
}

export function getRelativeDate(daysToAdd: number) {
  const next = new Date();
  next.setDate(next.getDate() + daysToAdd);
  const { year, month, day } = getDateParts(next);
  return `${year}-${month}-${day}`;
}

export function getTomorrowDate() {
  return getRelativeDate(1);
}

export function createPublicBookingUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/booking/${token}`;
}
