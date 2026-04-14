"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/app/auth-actions";
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
  const [isMounted, setIsMounted] = useState(false);
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
    setIsMounted(true);
  }, []);

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
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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
        <svg
          aria-label="Настройки"
          className={`cog-icon${isOpen ? " cog-icon--open" : ""}`}
          role="img"
          viewBox="0 0 16 16"
        >
          <path
            clipRule="evenodd"
            d="M.974 8.504l1.728-.825a.94.94 0 00.323-1.439l-1.21-1.498a7.009 7.009 0 011.494-1.895l1.727.847a.931.931 0 001.32-.642l.407-1.88a6.96 6.96 0 012.412.001L9.6 3.057a.934.934 0 001.323.637l1.721-.847a7.053 7.053 0 011.511 1.894L12.957 6.24a.942.942 0 00.33 1.437l1.74.826a7.086 7.086 0 01-.529 2.362l-1.914-.012a.935.935 0 00-.912 1.155l.446 1.874a7.002 7.002 0 01-2.17 1.05l-1.194-1.514a.93.93 0 00-1.466.002l-1.18 1.512a7.09 7.09 0 01-2.178-1.05l.43-1.878a.94.94 0 00-.917-1.15l-1.92.011a7.095 7.095 0 01-.06-.149 7.102 7.102 0 01-.488-2.212zM9.96 7.409a2.11 2.11 0 01-1.18 2.74 2.11 2.11 0 01-2.733-1.195 2.11 2.11 0 011.179-2.741A2.11 2.11 0 019.96 7.409z"
            fill="currentColor"
            fillRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && isMounted
        ? createPortal(
        <div className="modal-overlay" onClick={() => setIsOpen(false)} role="presentation">
          <div
            aria-modal="true"
            className="panel modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">Настройки профиля</span>
                <h2>{activeState.step === "verify" ? "Подтвердите новый номер" : "Редактирование профиля"}</h2>
              </div>
              <button
                aria-label="Закрыть настройки"
                className="modal-close-button"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                ×
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
                    <label htmlFor="phoneChangeCode">Код из SMS</label>
                    <input
                      autoComplete="one-time-code"
                      id="phoneChangeCode"
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
              <>
                <form action={saveAction} className="form-grid section-space">
                  <div className="field">
                    <label htmlFor="profileName">Имя</label>
                    <input
                      autoComplete="name"
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
                      autoComplete="tel"
                      id="profilePhone"
                      name="phone"
                      onChange={(event) => setPhoneValue(event.target.value)}
                      required
                      type="tel"
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

                <form action={logoutAction} className="section-space">
                  <button className="ghost-button" type="submit">
                    Выйти
                  </button>
                </form>
              </>
            )}
          </div>
        </div>,
        document.body
      )
        : null}
    </>
  );
}
