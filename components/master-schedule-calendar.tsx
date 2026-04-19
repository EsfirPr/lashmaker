"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";
import { readJsonResponse } from "@/lib/http";
import {
  addDaysToDateKey,
  addMonthsToDateKey,
  buildMonthGrid,
  CALENDAR_PERIOD_OPTIONS,
  formatMonthDayNumber,
  formatReadableDate,
  formatWeekday,
  getPeriodRange,
  getVisibleWeekDays,
  parseDateKey,
  type PeriodMode
} from "@/lib/calendar";
import type { AdminSlotView, DaySchedule } from "@/lib/types";
import { formatSlotRange, getTodayDate } from "@/lib/utils";

type MasterScheduleCalendarProps = {
  initialDays: DaySchedule[];
};

export function MasterScheduleCalendar({ initialDays }: MasterScheduleCalendarProps) {
  const today = getTodayDate();
  const hasHydratedRef = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("week");
  const [anchorDate, setAnchorDate] = useState(today);
  const [monthFocusedDate, setMonthFocusedDate] = useState(today);
  const [days, setDays] = useState(initialDays);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const period = useMemo(
    () => getPeriodRange(anchorDate, periodMode, isMobile),
    [anchorDate, isMobile, periodMode]
  );
  const weekDays = useMemo(
    () => (periodMode === "week" ? getVisibleWeekDays(period.start) : []),
    [period.start, periodMode]
  );
  const monthDays = useMemo(
    () => (periodMode === "month" ? buildMonthGrid(anchorDate) : []),
    [anchorDate, periodMode]
  );
  const slotsByDate = useMemo(
    () => new Map(days.map((day) => [day.date, day.slots])),
    [days]
  );
  const monthVisibleSlots = useMemo(
    () => slotsByDate.get(monthFocusedDate) || [],
    [monthFocusedDate, slotsByDate]
  );
  const visibleSlotCount = useMemo(() => {
    if (periodMode === "day") {
      return (slotsByDate.get(period.start) || []).length;
    }

    if (periodMode === "week") {
      return weekDays.reduce((sum, day) => sum + (slotsByDate.get(day) || []).length, 0);
    }

    return days.reduce((sum, day) => sum + day.slots.length, 0);
  }, [days, period.start, periodMode, slotsByDate, weekDays]);
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
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    let isCancelled = false;

    async function loadSchedule() {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch(`/api/master/schedule?start=${period.start}&end=${period.end}`, {
          credentials: "include",
          cache: "no-store"
        });
        const payload = await readJsonResponse<{ days: DaySchedule[] }>(response);

        if (!isCancelled) {
          setDays(payload.days);
        }
      } catch (requestError) {
        if (!isCancelled) {
          setDays([]);
          setError(
            requestError instanceof Error ? requestError.message : "Ошибка загрузки расписания"
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSchedule();

    return () => {
      isCancelled = true;
    };
  }, [period.end, period.start]);

  useEffect(() => {
    if (periodMode !== "month") {
      return;
    }

    const monthStart = period.start;
    const currentFocus = parseDateKey(monthFocusedDate);
    const currentMonth = parseDateKey(monthStart).getMonth();

    if (currentFocus.getMonth() !== currentMonth) {
      setMonthFocusedDate(monthStart);
    }
  }, [monthFocusedDate, period.start, periodMode]);

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

  function renderScheduleSlot(slot: AdminSlotView) {
    const href = (
      slot.activeBooking
        ? `/booking/${slot.activeBooking.public_token}`
        : `/master/dashboard/slots/${slot.id}`
    ) as Route;

    return (
      <Link
        className={[
          "master-schedule-slot",
          slot.activeBooking ? "master-schedule-slot--busy" : "master-schedule-slot--free"
        ]
          .filter(Boolean)
          .join(" ")}
        href={href}
        key={slot.id}
      >
        <div className="master-schedule-slot__top">
          <strong className="master-schedule-slot__time">{formatSlotRange(slot)}</strong>
        </div>
        <span
          className={
            slot.activeBooking
              ? "master-schedule-slot__name"
              : "master-schedule-slot__name master-schedule-slot__name--muted"
          }
        >
          {slot.activeBooking ? slot.activeBooking.name : "свободно"}
        </span>
      </Link>
    );
  }

  return (
    <section className="beauty-calendar master-schedule-calendar">
      <div className="master-schedule-calendar__controls">
        <p className="field__label" id="masterSchedulePeriodLabel">
          Период просмотра
        </p>
        <div
          aria-labelledby="masterSchedulePeriodLabel"
          className="slot-segmented"
          role="tablist"
        >
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
          <span className="eyebrow beauty-calendar__eyebrow">Расписание</span>
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

      {isLoading ? (
        <p className="empty-state beauty-calendar__loading">Загружаем слоты мастера...</p>
      ) : null}

      {!isLoading && error ? <div className="message-error">{error}</div> : null}

      {!isLoading && !error && visibleSlotCount === 0 ? (
        <div className="account-empty beauty-calendar__empty">
          <h3>Слотов на выбранный период нет</h3>
          <p className="empty-state">Добавьте новые окна или пролистайте календарь вперёд.</p>
        </div>
      ) : null}

      {!isLoading && !error && visibleSlotCount > 0 && periodMode === "day" ? (
        <div className="day-slots-list">
          {(slotsByDate.get(period.start) || []).length > 0 ? (
            (slotsByDate.get(period.start) || []).map((slot) => renderScheduleSlot(slot))
          ) : (
            <div className="week-day-column__empty">На этот день слотов нет</div>
          )}
        </div>
      ) : null}

      {!isLoading && !error && visibleSlotCount > 0 && periodMode === "week" ? (
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
                      daySlots.map((slot) => renderScheduleSlot(slot))
                    ) : (
                      <div className="week-day-column__empty">Нет слотов</div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}

      {!isLoading && !error && visibleSlotCount > 0 && periodMode === "month" ? (
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
                  disabled={isPast}
                  key={day.date}
                  onClick={() => setMonthFocusedDate(day.date)}
                  type="button"
                >
                  <span className="month-day__number">{formatMonthDayNumber(day.date)}</span>
                  {daySlots.length > 0 ? (
                    <span className="month-day__indicator">{daySlots.length} слота</span>
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
                  ? `${monthVisibleSlots.length} слота в расписании`
                  : "Слотов на этот день нет"}
              </span>
            </div>
            {monthVisibleSlots.length > 0 ? (
              <div className="day-slots-list">
                {monthVisibleSlots.map((slot) => renderScheduleSlot(slot))}
              </div>
            ) : (
              <div className="week-day-column__empty">На этот день слотов нет</div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
