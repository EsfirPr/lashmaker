"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  resendClientVerificationCodeAction,
  startClientRegistrationAction,
  verifyClientRegistrationAction
} from "@/app/register/actions";
import { initialRegisterFlowState } from "@/app/register/state";
import { SubmitButton } from "@/components/submit-button";

function formatCountdown(target: string | null) {
  if (!target) {
    return 0;
  }

  return Math.max(0, Math.ceil((new Date(target).getTime() - Date.now()) / 1000));
}

export function RegisterFlow() {
  const [startState, startAction] = useActionState(
    startClientRegistrationAction,
    initialRegisterFlowState
  );
  const [verifyState, verifyAction] = useActionState(
    verifyClientRegistrationAction,
    initialRegisterFlowState
  );
  const [resendState, resendAction] = useActionState(
    resendClientVerificationCodeAction,
    initialRegisterFlowState
  );

  const activeState = useMemo(() => {
    if (verifyState.step === "verify") {
      return verifyState;
    }

    if (resendState.step === "verify") {
      return resendState;
    }

    return startState;
  }, [resendState, startState, verifyState]);

  const [secondsLeft, setSecondsLeft] = useState(
    formatCountdown(activeState.resendAvailableAt)
  );

  useEffect(() => {
    setSecondsLeft(formatCountdown(activeState.resendAvailableAt));
  }, [activeState.resendAvailableAt]);

  useEffect(() => {
    if (!activeState.resendAvailableAt) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft(formatCountdown(activeState.resendAvailableAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeState.resendAvailableAt]);

  const verifyMessage = verifyState.error || resendState.error || activeState.error;

  return (
    <>
      {activeState.step === "verify" ? (
        <>
          <div className="message-success">
            {activeState.message} Код отправлен на <strong>{activeState.maskedPhone}</strong>.
          </div>

          <form action={verifyAction} className="form-grid section-space">
            <input name="phone" type="hidden" value={activeState.phone} />
            <div className="field">
              <label htmlFor="registerCode">Код из SMS</label>
              <input
                autoComplete="one-time-code"
                id="registerCode"
                inputMode="numeric"
                maxLength={6}
                name="code"
                pattern="\d{4,6}"
                placeholder="Например, 1234"
                required
              />
            </div>
            {verifyMessage ? <div className="message-error">{verifyMessage}</div> : null}
            <SubmitButton>Подтвердить и войти</SubmitButton>
          </form>

          <form action={resendAction} className="form-grid helper-link">
            <input name="phone" type="hidden" value={activeState.phone} />
            <button className="ghost-button" disabled={secondsLeft > 0} type="submit">
              {secondsLeft > 0 ? `Отправить код повторно через ${secondsLeft}с` : "Отправить код повторно"}
            </button>
          </form>
        </>
      ) : (
        <form className="form-grid section-space" action={startAction}>
          <div className="field">
            <label htmlFor="registerName">Имя</label>
            <input
              autoComplete="name"
              id="registerName"
              name="name"
              placeholder="Например, Алина"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="registerPhone">Телефон</label>
            <input
              autoComplete="tel"
              id="registerPhone"
              name="phone"
              placeholder="+7 999 123-45-67"
              required
              type="tel"
            />
          </div>
          <div className="field">
            <label htmlFor="registerPassword">Пароль</label>
            <input
              autoComplete="new-password"
              id="registerPassword"
              name="password"
              type="password"
              required
            />
          </div>
          <label className="consent-row">
            <input name="privacyAccepted" type="checkbox" required />
            <span>
              Я соглашаюсь с{" "}
              <Link href="/privacy">
                Политикой конфиденциальности
              </Link>
            </span>
          </label>
          {startState.error ? <div className="message-error">{startState.error}</div> : null}
          <SubmitButton>Получить код из SMS</SubmitButton>
        </form>
      )}
    </>
  );
}
