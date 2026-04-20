export type PeriodMode = "day" | "week" | "month";

export const CALENDAR_PERIOD_OPTIONS: Array<{ value: PeriodMode; label: string }> = [
  { value: "day", label: "День" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" }
];

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const next = parseDateKey(dateKey);
  next.setDate(next.getDate() + days);
  return toDateKey(next);
}

export function addMonthsToDateKey(dateKey: string, months: number) {
  const next = parseDateKey(dateKey);
  next.setMonth(next.getMonth() + months);
  return toDateKey(next);
}

export function getWeekStart(dateKey: string) {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toDateKey(date);
}

export function formatReadableDate(dateKey: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long"
  }).format(parseDateKey(dateKey));
}

export function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit"
  }).format(parseDateKey(dateKey));
}

export function formatReadableMonth(dateKey: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric"
  }).format(parseDateKey(dateKey));
}

export function formatWeekday(dateKey: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short"
  })
    .format(parseDateKey(dateKey))
    .replace(".", "");
}

export function formatMonthDayNumber(dateKey: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric"
  }).format(parseDateKey(dateKey));
}

export function formatSlotsCountLabel(count: number, compact = false) {
  if (compact) {
    return String(count);
  }

  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod100 >= 11 && mod100 <= 14) {
    return `${count} слотов`;
  }

  if (mod10 === 1) {
    return `${count} слот`;
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return `${count} слота`;
  }

  return `${count} слотов`;
}

export function getPeriodRange(anchorDate: string, mode: PeriodMode, useShortLabel = false) {
  if (mode === "day") {
    return {
      start: anchorDate,
      end: anchorDate,
      label: useShortLabel ? formatShortDate(anchorDate) : formatReadableDate(anchorDate)
    };
  }

  if (mode === "week") {
    const start = anchorDate;
    const end = addDaysToDateKey(start, 6);
    const formatter = useShortLabel ? formatShortDate : formatReadableDate;

    return {
      start,
      end,
      label: `${formatter(start)} - ${formatter(end)}`
    };
  }

  const date = parseDateKey(anchorDate);
  const start = toDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
  const end = toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));

  return {
    start,
    end,
    label: formatReadableMonth(anchorDate)
  };
}

export function buildMonthGrid(anchorDate: string) {
  const anchor = parseDateKey(anchorDate);
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const gridStart = parseDateKey(getWeekStart(toDateKey(monthStart)));
  const endWeekday = monthEnd.getDay();
  const monthGridEnd = new Date(
    monthEnd.getFullYear(),
    monthEnd.getMonth(),
    monthEnd.getDate() + (endWeekday === 0 ? 0 : 7 - endWeekday)
  );
  const days: Array<{ date: string; inMonth: boolean }> = [];

  for (const cursor = new Date(gridStart); cursor <= monthGridEnd; cursor.setDate(cursor.getDate() + 1)) {
    const dateKey = toDateKey(cursor);
    days.push({
      date: dateKey,
      inMonth: cursor.getMonth() === monthStart.getMonth()
    });
  }

  return days;
}

export function getVisibleWeekDays(startDate: string) {
  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(startDate, index));
}
