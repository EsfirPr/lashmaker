"use client";

type AccountErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AccountError({ error, reset }: AccountErrorProps) {
  return (
    <main className="page-shell auth-shell">
      <section className="panel auth-card">
        <span className="eyebrow">Ошибка кабинета</span>
        <h1 className="page-title">Не удалось загрузить данные</h1>
        <p className="muted">
          {error.message || "Попробуйте обновить страницу или войти в кабинет чуть позже."}
        </p>
        <div className="inline-actions section-space">
          <button className="button" onClick={reset} type="button">
            Повторить
          </button>
          <a className="ghost-button" href="/">
            На главную
          </a>
        </div>
      </section>
    </main>
  );
}
