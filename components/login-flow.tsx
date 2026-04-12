"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  resendClientSmsLoginCodeAction,
  startClientSmsLoginAction,
  verifyClientSmsLoginAction
} from "@/app/login/actions";
import { initialLoginFlowState } from "@/app/login/state";
import { SubmitButton } from "@/components/submit-button";

function formatCountdown(target: string | null) {
  if (!target) {
    return 0;
  }

  return Math.max(0, Math.ceil((new Date(target).getTime() - Date.now()) / 1000));
}

export function LoginFlow() {
  const [startState, startAction] = useActionState(
    startClientSmsLoginAction,
    initialLoginFlowState
  );
  const [verifyState, verifyAction] = useActionState(
    verifyClientSmsLoginAction,
    initialLoginFlowState
  );
  const [resendState, resendAction] = useActionState(
    resendClientSmsLoginCodeAction,
    initialLoginFlowState
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

  const verifyError = verifyState.error || resendState.error || activeState.error;

  return activeState.step === "verify" ? (
    <>
      <div className="message-success">
        {activeState.message} Код отправлен на <strong>{activeState.maskedPhone}</strong>.
      </div>

      <form action={verifyAction} className="form-grid section-space">
        <input name="phone" type="hidden" value={activeState.phone} />
        <div className="field">
          <label htmlFor="code">Код из SMS</label>
          <input
            autoComplete="one-time-code"
            id="code"
            inputMode="numeric"
            maxLength={6}
            name="code"
            pattern="\d{4,6}"
            placeholder="Например, 1234"
            required
          />
        </div>
        {verifyError ? <div className="message-error">{verifyError}</div> : null}
        <SubmitButton>Войти</SubmitButton>
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
        <label htmlFor="phone">Номер телефона</label>
        <input id="phone" name="phone" placeholder="+7 999 123-45-67" required />
      </div>
      {startState.error ? <div className="message-error">{startState.error}</div> : null}
      <SubmitButton>Получить код</SubmitButton>
    </form>
  );
}
