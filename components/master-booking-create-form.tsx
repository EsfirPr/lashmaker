"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readJsonResponse } from "@/lib/http";
import {
  addDaysToDateKey,
  addMonthsToDateKey,
  buildMonthGrid,
  CALENDAR_PERIOD_OPTIONS,
  formatMonthDayNumber,
  formatReadableDate,
  formatSlotsCountLabel,
  formatWeekday,
  getPeriodRange,
  getVisibleWeekDays,
  parseDateKey,
  type PeriodMode
} from "@/lib/calendar";
import type { TimeSlot } from "@/lib/types";
import { STYLE_OPTIONS } from "@/lib/validators";
import { formatSlotRange, getTodayDate } from "@/lib/utils";

type FormState = {
  date: string;
  name: string;
  notes: string;
  phone: string;
  slotId: string;
  style: string;
};

type SlotGroup = {
  date: string;
  slots: TimeSlot[];
};

type MasterBookingCreateFormProps = {
  initialStyle?: string;
};

function resolveInitialStyle(value?: string) {
  return STYLE_OPTIONS.includes(value as (typeof STYLE_OPTIONS)[number])
    ? (value as string)
    : STYLE_OPTIONS[0];
}

const initialState: FormState = {
  date: "",
  name: "",
  notes: "",
  phone: "",
  slotId: "",
  style: resolveInitialStyle()
};

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

export function MasterBookingCreateForm({ initialStyle }: MasterBookingCreateFormProps = {}) {
  const router = useRouter();
  const redirectTimeoutRef = useRef<number | null>(null);
  const today = getTodayDate();
  const [isMobile, setIsMobile] = useState(false);
  const [isCompactSlotsLabel, setIsCompactSlotsLabel] = useState(false);
  const [form, setForm] = useState<FormState>({
    ...initialState,
    style: resolveInitialStyle(initialStyle)
  });
  const [periodMode, setPeriodMode] = useState<PeriodMode>("week");
  const [anchorDate, setAnchorDate] = useState(getTodayDate());
  const [monthFocusedDate, setMonthFocusedDate] = useState(getTodayDate());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [successToken, setSuccessToken] = useState("");

  useEffect(() => {
    const nextStyle = resolveInitialStyle(initialStyle);

    setForm((current) => {
      if (current.style === nextStyle) {
        return current;
      }

      return {
        ...current,
        style: nextStyle
      };
    });
  }, [initialStyle]);

  const period = useMemo(
    () => getPeriodRange(anchorDate, periodMode, isMobile),
    [anchorDate, isMobile, periodMode]
  );
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
    if (periodMode === "day" || periodMode === "week") {
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
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsCompactSlotsLabel(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

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

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const canSubmit = useMemo(() => {
    return Boolean(
      form.name.trim() &&
        form.phone.trim() &&
        form.style.trim() &&
        form.date &&
        form.slotId &&
        !isSubmitting
    );
  }, [form, isSubmitting]);

  function handleNavigate(direction: "prev" | "next") {
    const step = direction === "next" ? 1 : -1;

    if (direction === "prev" && isPrevDisabled) {
      return;
    }

    setAnchorDate((current) => {
      if (periodMode === "day") {
        const next = addDaysToDateKey(current, step);
        return next < today ? today : next;
      }

      if (periodMode === "week") {
        const next = addDaysToDateKey(current, step * 7);
        return next < today ? today : next;
      }

      const next = addMonthsToDateKey(current, step);
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
    setSuccessMessage("");
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
      setSuccessMessage("Запись создана. Возвращаем в кабинет мастера...");
      setForm(initialState);
      router.refresh();

      redirectTimeoutRef.current = window.setTimeout(() => {
        router.push("/master/dashboard#bookings");
        router.refresh();
      }, 900);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось создать запись");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-grid section-space" onSubmit={handleSubmit}>
      <div className="two-columns">
        <div className="field">
          <label htmlFor="masterBookingClientName">Имя клиента</label>
          <input
            autoComplete="name"
            id="masterBookingClientName"
            name="name"
            placeholder="Например, Алина"
            type="text"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="masterBookingClientPhone">Телефон клиента</label>
          <input
            autoComplete="tel"
            id="masterBookingClientPhone"
            name="phone"
            placeholder="+7 999 123-45-67"
            type="tel"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
        </div>
      </div>

      <div className="two-columns">
        <div className="field">
          <label htmlFor="masterBookingStyle">Услуга / стиль</label>
          <select
            id="masterBookingStyle"
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
          <p className="field__label" id="masterBookingPeriodLabel">
            Период показа
          </p>
          <div aria-labelledby="masterBookingPeriodLabel" className="slot-segmented" role="tablist">
            {CALENDAR_PERIOD_OPTIONS.map((option) => (
              <button
                aria-selected={periodMode === option.value}
                className={
                  periodMode === option.value
                    ? "slot-segmented__button is-active"
                    : "slot-segmented__button"
                }
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
            <span className="eyebrow beauty-calendar__eyebrow">Выбор слота</span>
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
                      <span className="month-day__indicator">
                        {formatSlotsCountLabel(daySlots.length, isCompactSlotsLabel)}
                      </span>
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
                  {monthVisibleSlots.length > 0
                    ? isCompactSlotsLabel
                      ? formatSlotsCountLabel(monthVisibleSlots.length, true)
                      : `${formatSlotsCountLabel(monthVisibleSlots.length)} в расписании`
                    : "Слотов на этот день нет"}
              </span>
            </div>
            {monthVisibleSlots.length > 0 ? (
              <div className="day-slots-list">
                {monthVisibleSlots.map((slot) => renderSlotButton(slot, false))}
              </div>
            ) : (
                <div className="week-day-column__empty">На этот день слотов нет</div>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <div className="field">
        <label htmlFor="masterBookingNotes">Комментарий</label>
        <textarea
          autoComplete="off"
          id="masterBookingNotes"
          name="notes"
          placeholder="Например, нужен натуральный эффект или удобное время после работы"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>

      {successMessage ? (
        <div className="message-success">
          {successMessage}{" "}
          {successToken ? <Link href={`/booking/${successToken}`}>Открыть детали записи</Link> : null}
        </div>
      ) : null}

      {error ? <div className="message-error">{error}</div> : null}

      <div className="inline-actions">
        <button className="button beauty-calendar__submit" disabled={!canSubmit} type="submit">
          {isSubmitting ? "Создаём запись..." : "Записать клиента"}
        </button>
        <Link className="ghost-button" href="/master/dashboard#bookings">
          Отмена
        </Link>
      </div>
    </form>
  );
}
