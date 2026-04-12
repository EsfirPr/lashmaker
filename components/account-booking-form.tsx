"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readJsonResponse } from "@/lib/http";
import type { TimeSlot } from "@/lib/types";
import { STYLE_OPTIONS } from "@/lib/validators";
import { formatSlotRange, getTodayDate } from "@/lib/utils";

type PeriodMode = "day" | "week" | "month";

type FormState = {
  style: string;
  notes: string;
  date: string;
  slotId: string;
};

type SlotGroup = {
  date: string;
  slots: TimeSlot[];
};

const initialState: FormState = {
  style: STYLE_OPTIONS[0],
  notes: "",
  date: "",
  slotId: ""
};

const periodOptions: Array<{ value: PeriodMode; label: string }> = [
  { value: "day", label: "День" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" }
];

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const next = parseDateKey(dateKey);
  next.setDate(next.getDate() + days);
  return toDateKey(next);
}

function addMonths(dateKey: string, months: number) {
  const next = parseDateKey(dateKey);
  next.setMonth(next.getMonth() + months);
  return toDateKey(next);
}

function getWeekStart(dateKey: string) {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toDateKey(date);
}

function formatReadableDate(dateKey: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long"
  }).format(parseDateKey(dateKey));
}

function formatReadableMonth(dateKey: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric"
  }).format(parseDateKey(dateKey));
}

function formatWeekday(dateKey: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short"
  })
    .format(parseDateKey(dateKey))
    .replace(".", "");
}

function formatMonthDayNumber(dateKey: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric"
  }).format(parseDateKey(dateKey));
}

function getPeriodRange(anchorDate: string, mode: PeriodMode) {
  if (mode === "day") {
    return {
      start: anchorDate,
      end: anchorDate,
      label: formatReadableDate(anchorDate)
    };
  }

  if (mode === "week") {
    const start = anchorDate;
    const end = addDays(start, 6);

    return {
      start,
      end,
      label: `${formatReadableDate(start)} - ${formatReadableDate(end)}`
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

function groupSlotsByDay(slots: TimeSlot[]) {
  return slots.reduce<SlotGroup[]>((accumulator, slot) => {
    const current = accumulator[accumulator.length - 1];

    if (current && current.date === slot.slot_date) {
      current.slots.push(slot);
      return accumulator;
    }

    accumulator.push({
      date: slot.slot_date,
      slots: [slot]
    });

    return accumulator;
  }, []);
}

function buildMonthGrid(anchorDate: string) {
  const monthStart = parseDateKey(toDateKey(new Date(parseDateKey(anchorDate).getFullYear(), parseDateKey(anchorDate).getMonth(), 1)));
  const monthEnd = parseDateKey(toDateKey(new Date(parseDateKey(anchorDate).getFullYear(), parseDateKey(anchorDate).getMonth() + 1, 0)));
  const gridStart = parseDateKey(getWeekStart(toDateKey(monthStart)));
  const endWeekday = monthEnd.getDay();
  const monthGridEnd = parseDateKey(
    toDateKey(
      new Date(
        monthEnd.getFullYear(),
        monthEnd.getMonth(),
        monthEnd.getDate() + (endWeekday === 0 ? 0 : 7 - endWeekday)
      )
    )
  );

  const days: Array<{ date: string; inMonth: boolean }> = [];

  for (let cursor = new Date(gridStart); cursor <= monthGridEnd; cursor.setDate(cursor.getDate() + 1)) {
    const dateKey = toDateKey(cursor);
    days.push({
      date: dateKey,
      inMonth: cursor.getMonth() === monthStart.getMonth()
    });
  }

  return days;
}

function getVisibleWeekDays(startDate: string) {
  const start = startDate;
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function AccountBookingForm() {
  const router = useRouter();
  const today = getTodayDate();
  const [form, setForm] = useState<FormState>(initialState);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("week");
  const [anchorDate, setAnchorDate] = useState(getTodayDate());
  const [monthFocusedDate, setMonthFocusedDate] = useState(getTodayDate());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successToken, setSuccessToken] = useState("");

  const period = useMemo(() => getPeriodRange(anchorDate, periodMode), [anchorDate, periodMode]);
  const groupedSlots = useMemo(() => groupSlotsByDay(slots), [slots]);
  const slotsByDate = useMemo(
    () => new Map(groupedSlots.map((group) => [group.date, group.slots])),
    [groupedSlots]
  );
  const weekDays = useMemo(
    () => (periodMode === "week" ? getVisibleWeekDays(period.start) : []),
    [period.start, periodMode]
  );
  const monthDays = useMemo(
    () => (periodMode === "month" ? buildMonthGrid(anchorDate) : []),
    [anchorDate, periodMode]
  );
  const monthVisibleSlots = useMemo(
    () => slotsByDate.get(monthFocusedDate) || [],
    [monthFocusedDate, slotsByDate]
  );
  const isPrevDisabled = useMemo(() => {
    if (periodMode === "day") {
      return anchorDate <= today;
    }

    if (periodMode === "week") {
      return anchorDate <= today;
    }

    const currentMonth = parseDateKey(today);
    const viewedMonth = parseDateKey(anchorDate);

    return (
      viewedMonth.getFullYear() === currentMonth.getFullYear() &&
      viewedMonth.getMonth() === currentMonth.getMonth()
    );
  }, [anchorDate, periodMode, today]);

  useEffect(() => {
    let isCancelled = false;

    async function loadSlots() {
      try {
        setIsLoadingSlots(true);
        setError("");
        const response = await fetch(`/api/slots?start=${period.start}&end=${period.end}`);
        const payload = await readJsonResponse<{ slots: TimeSlot[] }>(response);

        if (!isCancelled) {
          setSlots(payload.slots);
          setForm((current) => {
            const stillSelected = payload.slots.some((slot) => slot.id === current.slotId);

            if (stillSelected) {
              return current;
            }

            return {
              ...current,
              date: "",
              slotId: ""
            };
          });
        }
      } catch (requestError) {
        if (!isCancelled) {
          setSlots([]);
          setForm((current) => ({ ...current, date: "", slotId: "" }));
          setError(requestError instanceof Error ? requestError.message : "Ошибка загрузки слотов");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSlots(false);
        }
      }
    }

    loadSlots();

    return () => {
      isCancelled = true;
    };
  }, [period.end, period.start]);

  useEffect(() => {
    if (periodMode === "month") {
      const monthStart = period.start;
      const currentFocus = parseDateKey(monthFocusedDate);
      const currentMonth = parseDateKey(monthStart).getMonth();

      if (currentFocus.getMonth() !== currentMonth) {
        setMonthFocusedDate(monthStart);
      }
    }
  }, [monthFocusedDate, period.start, periodMode]);

  const canSubmit = useMemo(() => {
    return Boolean(form.style.trim() && form.date && form.slotId && !isSubmitting);
  }, [form, isSubmitting]);

  function handleNavigate(direction: "prev" | "next") {
    const step = direction === "next" ? 1 : -1;

    if (direction === "prev" && isPrevDisabled) {
      return;
    }

    setAnchorDate((current) => {
      if (periodMode === "day") {
        const next = addDays(current, step);
        return next < today ? today : next;
      }

      if (periodMode === "week") {
        const next = addDays(current, step * 7);
        return next < today ? today : next;
      }

      const next = addMonths(current, step);
      const currentMonth = parseDateKey(today);
      const nextMonth = parseDateKey(next);

      if (
        nextMonth.getFullYear() < currentMonth.getFullYear() ||
        (nextMonth.getFullYear() === currentMonth.getFullYear() &&
          nextMonth.getMonth() < currentMonth.getMonth())
      ) {
        return today;
      }

      return next;
    });
  }

  function handleSelectSlot(slot: TimeSlot) {
    setForm((current) => ({
      ...current,
      date: slot.slot_date,
      slotId: slot.id
    }));
  }

  function renderSlotButton(slot: TimeSlot, showDate = false) {
    const isSelected = form.slotId === slot.id;

    return (
      <button
        className={isSelected ? "slot-card is-selected" : "slot-card"}
        key={slot.id}
        onClick={() => handleSelectSlot(slot)}
        type="button"
      >
        <span className="slot-card__time">{slot.start_time.slice(0, 5)}</span>
        <span className="slot-card__duration">до {slot.end_time.slice(0, 5)}</span>
        {showDate ? <span className="slot-card__date">{formatReadableDate(slot.slot_date)}</span> : null}
      </button>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessToken("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const payload = await readJsonResponse<{ token: string }>(response);

      setSuccessToken(payload.token);
      setForm(initialState);
      setAnchorDate(getTodayDate());
      setMonthFocusedDate(getTodayDate());
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Что-то пошло не так");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-grid section-space" onSubmit={handleSubmit}>
      <div className="two-columns">
        <div className="field">
          <label htmlFor="style">Стиль наращивания</label>
          <select
            id="style"
            name="style"
            value={form.style}
            onChange={(event) => setForm((current) => ({ ...current, style: event.target.value }))}
          >
            {STYLE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Период показа</label>
          <div className="slot-segmented" role="tablist" aria-label="Выбор периода">
            {periodOptions.map((option) => (
              <button
                aria-selected={periodMode === option.value}
                className={periodMode === option.value ? "slot-segmented__button is-active" : "slot-segmented__button"}
                key={option.value}
                onClick={() => setPeriodMode(option.value)}
                role="tab"
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="beauty-calendar">
        <div className="beauty-calendar__topbar">
          <button
            aria-label="Предыдущий период"
            className="calendar-nav-button"
            disabled={isPrevDisabled}
            onClick={() => handleNavigate("prev")}
            type="button"
          >
            ←
          </button>
          <div className="beauty-calendar__title-wrap">
            <span className="eyebrow beauty-calendar__eyebrow">Календарь записи</span>
            <h3>{period.label}</h3>
          </div>
          <button
            aria-label="Следующий период"
            className="calendar-nav-button"
            onClick={() => handleNavigate("next")}
            type="button"
          >
            →
          </button>
        </div>

        {isLoadingSlots ? <p className="empty-state beauty-calendar__loading">Загружаем доступные окна...</p> : null}

        {!isLoadingSlots && slots.length === 0 ? (
          <div className="account-empty beauty-calendar__empty">
            <div className="account-empty__icon">○</div>
            <h3>Нет свободных окон на выбранный период</h3>
            <p className="empty-state">Попробуйте переключить режим или пролистать календарь вперед.</p>
          </div>
        ) : null}

        {!isLoadingSlots && slots.length > 0 && periodMode === "day" ? (
          <div className="day-slots-list">
            {(slotsByDate.get(period.start) || []).map((slot) => renderSlotButton(slot))}
          </div>
        ) : null}

        {!isLoadingSlots && slots.length > 0 && periodMode === "week" ? (
          <div className="week-calendar-scroll">
            <div className="week-calendar">
              {weekDays.map((day) => {
                const daySlots = slotsByDate.get(day) || [];

                return (
                  <section className="week-day-column" key={day}>
                    <header className="week-day-column__head">
                      <span>{formatWeekday(day)}</span>
                      <strong>{formatMonthDayNumber(day)}</strong>
                    </header>
                    <div className="week-day-column__slots">
                      {daySlots.length > 0 ? (
                        daySlots.map((slot) => renderSlotButton(slot))
                      ) : (
                        <div className="week-day-column__empty">Нет окон</div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        ) : null}

        {!isLoadingSlots && slots.length > 0 && periodMode === "month" ? (
          <div className="month-calendar">
            <div className="month-calendar__weekdays">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="month-calendar__grid">
              {monthDays.map((day) => {
                const daySlots = slotsByDate.get(day.date) || [];
                const isCurrentMonth = day.inMonth;
                const isSelectedDay = monthFocusedDate === day.date;
                const isPast = day.date < today;

                return (
                  <button
                    className={[
                      "month-day",
                      isCurrentMonth ? "" : "is-outside",
                      isPast ? "is-past" : "",
                      daySlots.length > 0 ? "has-slots" : "",
                      isSelectedDay ? "is-selected" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={day.date}
                    disabled={isPast}
                    onClick={() => setMonthFocusedDate(day.date)}
                    type="button"
                  >
                    <span className="month-day__number">{formatMonthDayNumber(day.date)}</span>
                    {daySlots.length > 0 ? (
                      <span className="month-day__indicator">{daySlots.length} окна</span>
                    ) : (
                      <span className="month-day__indicator month-day__indicator--empty"> </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="month-day-detail">
              <div className="month-day-detail__head">
                <strong>{formatReadableDate(monthFocusedDate)}</strong>
                <span className="muted">
                  {(slotsByDate.get(monthFocusedDate) || []).length > 0
                    ? `${(slotsByDate.get(monthFocusedDate) || []).length} свободных окон`
                    : "Свободных окон нет"}
                </span>
              </div>
              {monthVisibleSlots.length > 0 ? (
                <div className="day-slots-list">
                  {monthVisibleSlots.map((slot) => renderSlotButton(slot, false))}
                </div>
              ) : (
                <div className="week-day-column__empty">На этот день свободных окон нет</div>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <div className="field">
        <label htmlFor="notes">Дополнительные пожелания</label>
        <textarea
          id="notes"
          name="notes"
          placeholder="Например, нужен натуральный эффект или комфортное время после работы"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>

      {successToken ? (
        <div className="message-success">
          Запись создана.{" "}
          <Link href={`/booking/${successToken}`}>Открыть детали записи</Link>
        </div>
      ) : null}

      {error ? <div className="message-error">{error}</div> : null}

      <button className="button beauty-calendar__submit" disabled={!canSubmit} type="submit">
        {isSubmitting ? "Создаем запись..." : "Записаться"}
      </button>
    </form>
  );
}
