"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmClientPhoneChangeAction,
  resendClientPhoneChangeCodeAction,
  startClientProfileUpdateAction
} from "@/app/account/actions";
import {
  createInitialAccountProfileState,
  type AccountProfileState
} from "@/app/account/state";
import { SubmitButton } from "@/components/submit-button";

type AccountProfileSettingsProps = {
  name: string;
  phone: string;
};

function formatCountdown(target: string | null) {
  if (!target) {
    return 0;
  }

  return Math.max(0, Math.ceil((new Date(target).getTime() - Date.now()) / 1000));
}

export function AccountProfileSettings({
  name,
  phone
}: AccountProfileSettingsProps) {
  const router = useRouter();
  const initialState = useMemo(() => createInitialAccountProfileState(name, phone), [name, phone]);
  const [isOpen, setIsOpen] = useState(false);
  const handledSuccessRef = useRef<string>("");
  const [nameValue, setNameValue] = useState(name);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [saveState, saveAction] = useActionState(startClientProfileUpdateAction, initialState);
  const [verifyState, verifyAction] = useActionState(confirmClientPhoneChangeAction, initialState);
  const [resendState, resendAction] = useActionState(
    resendClientPhoneChangeCodeAction,
    initialState
  );

  const activeState = useMemo<AccountProfileState>(() => {
    if (verifyState.status !== "idle" || verifyState.step === "verify") {
      return verifyState;
    }

    if (resendState.status !== "idle" || resendState.step === "verify") {
      return resendState;
    }

    return saveState;
  }, [resendState, saveState, verifyState]);

  const [secondsLeft, setSecondsLeft] = useState(
    formatCountdown(activeState.resendAvailableAt)
  );

  useEffect(() => {
    setNameValue(activeState.currentName);
    setPhoneValue(activeState.step === "verify" ? activeState.pendingPhone : activeState.currentPhone);
  }, [activeState.currentName, activeState.currentPhone, activeState.pendingPhone, activeState.step]);

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

  useEffect(() => {
    const successKey = `${activeState.status}:${activeState.step}:${activeState.currentName}:${activeState.currentPhone}:${activeState.message}`;

    if (
      activeState.status === "success" &&
      activeState.step === "edit" &&
      isOpen &&
      handledSuccessRef.current !== successKey
    ) {
      handledSuccessRef.current = successKey;
      const timer = window.setTimeout(() => {
        setIsOpen(false);
        router.refresh();
      }, 400);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [activeState.status, activeState.step, isOpen, router]);

  return (
    <>
      <button
        aria-label="Редактировать профиль"
        className="icon-button"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="M10.4 2.7a1 1 0 0 1 1.2-.7l1.5.4a1 1 0 0 0 .8-.1l1.3-.8a1 1 0 0 1 1.4.3l1.5 2.5a1 1 0 0 0 .6.5l1.6.3a1 1 0 0 1 .8 1.2l-.4 2a1 1 0 0 0 .2.8l1.1 1.4a1 1 0 0 1 0 1.4l-1.1 1.4a1 1 0 0 0-.2.8l.4 2a1 1 0 0 1-.8 1.2l-1.6.3a1 1 0 0 0-.6.5l-1.5 2.5a1 1 0 0 1-1.4.3l-1.3-.8a1 1 0 0 0-.8-.1l-1.5.4a1 1 0 0 1-1.2-.7l-.5-1.9a1 1 0 0 0-.5-.6l-1.4-.8a1 1 0 0 1-.4-1.4l.8-1.5a1 1 0 0 0 .1-.8l-.4-1.6a1 1 0 0 1 .7-1.2l1.9-.5a1 1 0 0 0 .6-.5l.8-1.4Zm1.6 5.8a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className="modal-overlay" onClick={() => setIsOpen(false)} role="presentation">
          <div
            aria-modal="true"
            className="panel modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="account-section__heading">
              <div>
                <span className="eyebrow">Настройки профиля</span>
                <h2>{activeState.step === "verify" ? "Подтвердите новый номер" : "Редактирование профиля"}</h2>
              </div>
              <button className="ghost-button" onClick={() => setIsOpen(false)} type="button">
                Отмена
              </button>
            </div>

            {activeState.status !== "idle" ? (
              <div
                className={activeState.status === "error" ? "message-error section-space" : "message-success section-space"}
              >
                {activeState.message}
                {activeState.step === "verify" && activeState.maskedPendingPhone ? (
                  <> Номер для подтверждения: <strong>{activeState.maskedPendingPhone}</strong>.</>
                ) : null}
              </div>
            ) : null}

            {activeState.step === "verify" ? (
              <>
                <form action={verifyAction} className="form-grid section-space">
                  <input name="phone" type="hidden" value={activeState.pendingPhone} />
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
                  <SubmitButton>Подтвердить</SubmitButton>
                </form>

                <form action={resendAction} className="form-grid helper-link">
                  <input name="phone" type="hidden" value={activeState.pendingPhone} />
                  <button className="ghost-button" disabled={secondsLeft > 0} type="submit">
                    {secondsLeft > 0
                      ? `Отправить код повторно через ${secondsLeft}с`
                      : "Отправить код повторно"}
                  </button>
                </form>
              </>
            ) : (
              <form action={saveAction} className="form-grid section-space">
                <div className="field">
                  <label htmlFor="profileName">Имя</label>
                  <input
                    id="profileName"
                    name="name"
                    onChange={(event) => setNameValue(event.target.value)}
                    required
                    value={nameValue}
                  />
                </div>
                <div className="field">
                  <label htmlFor="profilePhone">Номер телефона</label>
                  <input
                    id="profilePhone"
                    name="phone"
                    onChange={(event) => setPhoneValue(event.target.value)}
                    required
                    value={phoneValue}
                  />
                </div>
                <div className="inline-actions">
                  <SubmitButton>Сохранить</SubmitButton>
                  <button className="ghost-button" onClick={() => setIsOpen(false)} type="button">
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
