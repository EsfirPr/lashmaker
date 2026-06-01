"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http";
import { STYLE_OPTIONS } from "@/lib/validators";

type FormState = {
  style: string;
  notes: string;
};

type AccountBookingFormProps = {
  initialStyle?: string;
};

function resolveInitialStyle(value?: string) {
  return STYLE_OPTIONS.includes(value as (typeof STYLE_OPTIONS)[number])
    ? (value as string)
    : STYLE_OPTIONS[0];
}

export function AccountBookingForm({ initialStyle }: AccountBookingFormProps = {}) {
  const [form, setForm] = useState<FormState>({
    style: resolveInitialStyle(initialStyle),
    notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      style: resolveInitialStyle(initialStyle)
    }));
  }, [initialStyle]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/booking-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      await readJsonResponse<{ requestId: string }>(response);
      setForm({
        style: resolveInitialStyle(initialStyle),
        notes: ""
      });
      setIsSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось отправить заявку");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-grid section-space" onSubmit={handleSubmit}>
      <div className="note-box">
        <strong>Ваша запись будет обработана администратором</strong>
        <p className="muted">
          После отправки заявки администратор свяжется с вами и согласует удобные день и время.
        </p>
      </div>

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
        <label htmlFor="notes">Дополнительные пожелания</label>
        <textarea
          autoComplete="off"
          id="notes"
          name="notes"
          placeholder="Например, нужен натуральный эффект или удобное время для звонка"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>

      {isSuccess ? (
        <div className="message-success">Ваша запись будет обработана администратором</div>
      ) : null}

      {error ? <div className="message-error">{error}</div> : null}

      <button className="button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Отправляем заявку..." : "Отправить заявку"}
      </button>
    </form>
  );
}
