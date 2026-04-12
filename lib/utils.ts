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

function getDateTimeParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(value);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const second = Number(parts.find((part) => part.type === "second")?.value);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second
  };
}

export function getGreetingByTime(value = new Date()) {
  const hour = getDateTimeParts(value).hour;

  if (hour >= 5 && hour <= 11) {
    return "Доброе утро";
  }

  if (hour >= 12 && hour <= 16) {
    return "Добрый день";
  }

  if (hour >= 17 && hour <= 22) {
    return "Добрый вечер";
  }

  return "Доброй ночи";
}

export function zonedDateTimeToUtc(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);

  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let index = 0; index < 3; index += 1) {
    const parts = getDateTimeParts(new Date(utcMs));
    const expectedUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
    const actualUtcMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );

    const diff = expectedUtcMs - actualUtcMs;

    if (diff === 0) {
      break;
    }

    utcMs += diff;
  }

  return new Date(utcMs);
}

export function getSlotStartDate(slot: Pick<TimeSlot, "slot_date" | "start_time">) {
  return zonedDateTimeToUtc(slot.slot_date, slot.start_time);
}

export function getSlotEndDate(slot: Pick<TimeSlot, "slot_date" | "end_time">) {
  return zonedDateTimeToUtc(slot.slot_date, slot.end_time);
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
