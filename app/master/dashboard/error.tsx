"use client";

type MasterDashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function MasterDashboardError({ error, reset }: MasterDashboardErrorProps) {
  return (
    <main className="page-shell auth-shell">
      <section className="panel auth-card">
        <span className="eyebrow">Ошибка мастера</span>
        <h1 className="page-title">Не удалось загрузить кабинет</h1>
        <p className="muted">
          {error.message || "Попробуйте перезагрузить страницу или войти повторно."}
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
