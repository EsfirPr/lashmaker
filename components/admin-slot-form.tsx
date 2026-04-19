"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addTimeSlotAction, initialAdminSlotFormState } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { readJsonResponse } from "@/lib/http";
import {
  addDaysToDateKey,
  CALENDAR_PERIOD_OPTIONS,
  formatReadableDate,
  formatWeekday,
  getPeriodRange,
  getVisibleWeekDays,
  type PeriodMode
} from "@/lib/calendar";
import type { DaySchedule } from "@/lib/types";
import { getTodayDate } from "@/lib/utils";

type AdminSlotFormProps = {
  initialDays: DaySchedule[];
};

type SlotSelection = {
  slotDate: string;
  startTime: string;
  endTime: string;
};

const WORKDAY_START_MINUTES = 9 * 60;
const WORKDAY_END_MINUTES = 21 * 60;
const SLOT_STEP_MINUTES = 30;
const SLOT_DURATION_MINUTES = 120;
const SLOT_PERIOD_OPTIONS = CALENDAR_PERIOD_OPTIONS.filter(
  (option) => option.value === "day" || option.value === "week"
);

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatSelectionRange(startTime: string, endTime: string) {
  return `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`;
}

function getSelectionId(selection: SlotSelection) {
  return `${selection.slotDate}-${selection.startTime}-${selection.endTime}`;
}

export function AdminSlotForm({ initialDays }: AdminSlotFormProps) {
  const router = useRouter();
  const today = getTodayDate();
  const formRef = useRef<HTMLFormElement>(null);
  const hasHydratedRef = useRef(false);
  const [state, formAction] = useActionState(addTimeSlotAction, initialAdminSlotFormState);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("week");
  const [anchorDate, setAnchorDate] = useState(today);
  const [days, setDays] = useState(initialDays);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<SlotSelection[]>([]);

  const period = useMemo(() => getPeriodRange(anchorDate, periodMode), [anchorDate, periodMode]);
  const visibleDays = useMemo(
    () => (periodMode === "week" ? getVisibleWeekDays(period.start) : [period.start]),
    [period.start, periodMode]
  );
  const slotsByDate = useMemo(() => new Map(days.map((day) => [day.date, day.slots])), [days]);

  useEffect(() => {
    setDays(initialDays);
  }, [initialDays]);

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
        const response = await fetch(`/api/master/schedule?start=${period.start}&end=${period.end}`);
        const payload = await readJsonResponse<{ days: DaySchedule[] }>(response);

        if (!isCancelled) {
          setDays(payload.days);
        }
      } catch (requestError) {
        if (!isCancelled) {
          setDays([]);
          setError(
            requestError instanceof Error ? requestError.message : "Не удалось загрузить окна"
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
    if (state.status === "success") {
      setSelectedSlots([]);
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  const selectionIds = useMemo(
    () => new Set(selectedSlots.map((selection) => getSelectionId(selection))),
    [selectedSlots]
  );

  const availabilityByDate = useMemo(() => {
    return new Map(
      visibleDays.map((dateKey) => {
        const existingSlots = slotsByDate.get(dateKey) || [];
        const busyIntervals = existingSlots.map((slot) => ({
          startMinutes: timeToMinutes(slot.start_time),
          endMinutes: timeToMinutes(slot.end_time)
        }));
        const selectedIntervals = selectedSlots
          .filter((selection) => selection.slotDate === dateKey)
          .map((selection) => ({
            startMinutes: timeToMinutes(selection.startTime),
            endMinutes: timeToMinutes(selection.endTime)
          }));

        const options = [];

        for (
          let startMinutes = WORKDAY_START_MINUTES;
          startMinutes <= WORKDAY_END_MINUTES - SLOT_STEP_MINUTES;
          startMinutes += SLOT_STEP_MINUTES
        ) {
          const startTime = minutesToTime(startMinutes);
          const endTime = minutesToTime(startMinutes + SLOT_DURATION_MINUTES);
          const selectionId = getSelectionId({
            slotDate: dateKey,
            startTime,
            endTime
          });
          const isSelected = selectionIds.has(selectionId);

          if (isSelected) {
            options.push({
              id: selectionId,
              startTime,
              endTime,
              state: "selected" as const
            });
            continue;
          }

          if (startMinutes + SLOT_DURATION_MINUTES > WORKDAY_END_MINUTES) {
            options.push({
              id: selectionId,
              startTime,
              endTime,
              state: "too-short" as const
            });
            continue;
          }

          const overlapsBusy = busyIntervals.some(
            (interval) =>
              startMinutes < interval.endMinutes &&
              interval.startMinutes < startMinutes + SLOT_DURATION_MINUTES
          );

          if (overlapsBusy) {
            options.push({
              id: selectionId,
              startTime,
              endTime,
              state: "busy" as const
            });
            continue;
          }

          const overlapsSelected = selectedIntervals.some(
            (interval) =>
              startMinutes < interval.endMinutes &&
              interval.startMinutes < startMinutes + SLOT_DURATION_MINUTES
          );

          if (overlapsSelected) {
            options.push({
              id: selectionId,
              startTime,
              endTime,
              state: "blocked" as const
            });
            continue;
          }

          options.push({
            id: selectionId,
            startTime,
            endTime,
            state: "available" as const
          });
        }

        return [dateKey, options] as const;
      })
    );
  }, [selectedSlots, selectionIds, slotsByDate, visibleDays]);

  const selectedCount = selectedSlots.length;

  function handleNavigate(direction: "prev" | "next") {
    const step = direction === "next" ? 1 : -1;
    setAnchorDate((current) => {
      if (periodMode === "day") {
        const next = addDaysToDateKey(current, step);
        return next < today ? today : next;
      }

      const next = addDaysToDateKey(current, step * 7);
      return next < today ? today : next;
    });
  }

  function handleToggleSelection(dateKey: string, startTime: string, endTime: string) {
    const nextSelection = { slotDate: dateKey, startTime, endTime };
    const selectionId = getSelectionId(nextSelection);

    setSelectedSlots((current) => {
      const alreadySelected = current.some((selection) => getSelectionId(selection) === selectionId);

      if (alreadySelected) {
        return current.filter((selection) => getSelectionId(selection) !== selectionId);
      }

      return [...current, nextSelection];
    });
  }

  return (
    <form action={formAction} className="slot-builder" ref={formRef}>
      <input name="slotSelections" type="hidden" value={JSON.stringify(selectedSlots)} />

      <div className="slot-builder__controls">
        <div className="slot-builder__controls-head">
          <div>
            <p className="field__label">Режим добавления</p>
            <p className="muted">
              Выберите день или неделю и просто прокликайте стартовые слоты. Каждый клик создаёт окно на 2 часа.
            </p>
          </div>
          <div className="slot-builder__legend">
            <span className="slot-builder__legend-item is-available">Доступен</span>
            <span className="slot-builder__legend-item is-selected">Выбран</span>
            <span className="slot-builder__legend-item is-busy">Занят</span>
            <span className="slot-builder__legend-item is-too-short">Не помещается</span>
          </div>
        </div>

        <div aria-label="Режим выбора окон" className="slot-segmented" role="tablist">
          {SLOT_PERIOD_OPTIONS.map((option) => (
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

      <section className="beauty-calendar slot-builder__calendar">
        <div className="beauty-calendar__topbar">
          <button
            aria-label="Предыдущий период"
            className="calendar-nav-button"
            disabled={anchorDate <= today}
            onClick={() => handleNavigate("prev")}
            type="button"
          >
            ←
          </button>
          <div className="beauty-calendar__title-wrap">
            <span className="eyebrow beauty-calendar__eyebrow">Добавить окна</span>
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

        {isLoading ? <p className="empty-state beauty-calendar__loading">Пересчитываем доступные слоты...</p> : null}
        {error ? <p className="message-error">{error}</p> : null}
        {state.status !== "idle" ? (
          <p className={state.status === "error" ? "message-error" : "message-success"}>{state.message}</p>
        ) : null}

        <div className="slot-builder__days">
          {visibleDays.map((dateKey) => {
            const options = availabilityByDate.get(dateKey) || [];
            const availableCount = options.filter((option) => option.state === "available").length;
            const selectedForDay = selectedSlots.filter((selection) => selection.slotDate === dateKey).length;

            return (
              <section className="slot-builder__day-card" key={dateKey}>
                <header className="slot-builder__day-head">
                  <div>
                    <span>{formatWeekday(dateKey)}</span>
                    <strong>{formatReadableDate(dateKey)}</strong>
                  </div>
                  <span className="slot-builder__day-meta">
                    {selectedForDay > 0 ? `Выбрано: ${selectedForDay}` : `Свободно стартов: ${availableCount}`}
                  </span>
                </header>

                <div className="slot-builder__slot-grid">
                  {options.map((option) => {
                    const isClickable = option.state === "available" || option.state === "selected";
                    const className = [
                      "slot-builder__slot",
                      option.state === "selected" ? "is-selected" : "",
                      option.state === "busy" ? "is-busy" : "",
                      option.state === "blocked" ? "is-blocked" : "",
                      option.state === "too-short" ? "is-too-short" : ""
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <button
                        className={className}
                        disabled={!isClickable}
                        key={option.id}
                        onClick={() => handleToggleSelection(dateKey, option.startTime, option.endTime)}
                        type="button"
                      >
                        <strong>{option.startTime}</strong>
                        <span>{formatSelectionRange(option.startTime, option.endTime)}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="slot-builder__summary">
        <div className="slot-builder__summary-copy">
          <strong>{selectedCount > 0 ? `Выбрано окон: ${selectedCount}` : "Окна ещё не выбраны"}</strong>
          <p className="muted">
            Система показывает только стартовые точки, где реально помещается полное окно на 2 часа без пересечений.
          </p>
        </div>
        <div className="slot-builder__summary-actions">
          <button
            className="ghost-button"
            disabled={selectedCount === 0}
            onClick={() => setSelectedSlots([])}
            type="button"
          >
            Очистить выбор
          </button>
          <SubmitButton disabled={selectedCount === 0}>Сохранить выбранные окна</SubmitButton>
        </div>
      </section>
    </form>
  );
}
