"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readJsonResponse } from "@/lib/http";
import type { TimeSlot } from "@/lib/types";
import { STYLE_OPTIONS } from "@/lib/validators";
import { formatSlotRange, getTodayDate } from "@/lib/utils";

type FormState = {
  style: string;
  notes: string;
  date: string;
  slotId: string;
};

const initialState: FormState = {
  style: STYLE_OPTIONS[0],
  notes: "",
  date: "",
  slotId: ""
};

export function AccountBookingForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successToken, setSuccessToken] = useState("");

  useEffect(() => {
    if (!form.date) {
      setSlots([]);
      setForm((current) => ({ ...current, slotId: "" }));
      return;
    }

    let isCancelled = false;

    async function loadSlots() {
      try {
        setIsLoadingSlots(true);
        setError("");
        const response = await fetch(`/api/slots?date=${form.date}`);
        const payload = await readJsonResponse<{ slots: TimeSlot[] }>(response);

        if (!isCancelled) {
          setSlots(payload.slots);
          setForm((current) => ({
            ...current,
            slotId: payload.slots[0]?.id || ""
          }));
        }
      } catch (requestError) {
        if (!isCancelled) {
          setSlots([]);
          setForm((current) => ({ ...current, slotId: "" }));
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
  }, [form.date]);

  const canSubmit = useMemo(() => {
    return Boolean(form.style.trim() && form.date && form.slotId && !isSubmitting);
  }, [form, isSubmitting]);

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
      setSlots([]);
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
          <label htmlFor="date">Дата</label>
          <input
            id="date"
            name="date"
            min={getTodayDate()}
            type="date"
            value={form.date}
            onChange={(event) =>
              setForm((current) => ({ ...current, date: event.target.value, slotId: "" }))
            }
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="slotId">Свободное время</label>
        <select
          id="slotId"
          name="slotId"
          disabled={!form.date || isLoadingSlots || slots.length === 0}
          value={form.slotId}
          onChange={(event) => setForm((current) => ({ ...current, slotId: event.target.value }))}
        >
          {!form.date && <option value="">Сначала выберите дату</option>}
          {form.date && isLoadingSlots && <option value="">Загружаем доступные слоты...</option>}
          {form.date && !isLoadingSlots && slots.length === 0 && (
            <option value="">На эту дату свободных слотов пока нет</option>
          )}
          {slots.map((slot) => (
            <option key={slot.id} value={slot.id}>
              {formatSlotRange(slot)}
            </option>
          ))}
        </select>
      </div>

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

      <p className="helper">
        После записи слот сразу станет недоступен для других клиентов.
      </p>

      {successToken ? (
        <div className="message-success">
          Запись создана.{" "}
          <Link href={`/booking/${successToken}`}>
            Открыть детали записи
          </Link>
        </div>
      ) : null}

      {error ? <div className="message-error">{error}</div> : null}

      <button className="button" disabled={!canSubmit} type="submit">
        {isSubmitting ? "Создаем запись..." : "Записаться"}
      </button>
    </form>
  );
}
