"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TimeSlot } from "@/lib/types";
import { STYLE_OPTIONS } from "@/lib/validators";
import { formatSlotRange, getTodayDate } from "@/lib/utils";

type FormState = {
  name: string;
  phone: string;
  style: string;
  notes: string;
  date: string;
  slotId: string;
};

const initialState: FormState = {
  name: "",
  phone: "",
  style: STYLE_OPTIONS[0],
  notes: "",
  date: "",
  slotId: ""
};

export function BookingForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Не удалось загрузить слоты");
        }

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
    return Boolean(
      form.name.trim() &&
        form.phone.trim() &&
        form.style.trim() &&
        form.date &&
        form.slotId &&
        !isSubmitting
    );
  }, [form, isSubmitting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось создать запись");
      }

      router.push(`/booking/${payload.token}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Что-то пошло не так");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="two-columns">
        <div className="field">
          <label htmlFor="name">Имя</label>
          <input
            id="name"
            name="name"
            placeholder="Например, Алина"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Номер телефона</label>
          <input
            id="phone"
            name="phone"
            placeholder="+7 999 123-45-67"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
        </div>
      </div>

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
            type="date"
            min={getTodayDate()}
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
          placeholder="Например, нужен натуральный эффект или запись после 18:00"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>

      <p className="helper">
        После записи вы получите персональную ссылку, где можно посмотреть детали и отменить визит.
      </p>

      {error ? <div className="message-error">{error}</div> : null}

      <button className="button" type="submit" disabled={!canSubmit}>
        {isSubmitting ? "Создаем запись..." : "Записаться"}
      </button>
    </form>
  );
}
