"use client";

type MasterSectionErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function MasterSectionError({ error, reset }: MasterSectionErrorProps) {
  return (
    <main className="page-shell auth-shell">
      <section className="panel auth-card">
        <span className="eyebrow">Ошибка мастера</span>
        <h1 className="page-title">Не удалось загрузить страницу</h1>
        <p className="muted">
          {error.message || "Попробуйте обновить страницу или вернуться в кабинет мастера."}
        </p>
        <div className="inline-actions section-space">
          <button className="button" onClick={reset} type="button">
            Повторить
          </button>
          <a className="ghost-button" href="/master/dashboard">
            В кабинет
          </a>
        </div>
      </section>
    </main>
  );
}
