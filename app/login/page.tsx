import Link from "next/link";
import { loginClientAction } from "./actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) || {};

  return (
    <main className="page-shell auth-shell">
      <section className="panel auth-card">
        <span className="eyebrow">Кабинет клиента</span>
        <h1 className="page-title">Вход</h1>
        <p className="muted">Войдите по номеру телефона и паролю, чтобы видеть свои записи.</p>

        <form className="form-grid section-space" action={loginClientAction}>
          <div className="field">
            <label htmlFor="phone">Телефон</label>
            <input id="phone" name="phone" placeholder="+7 999 123-45-67" required />
          </div>
          <div className="field">
            <label htmlFor="password">Пароль</label>
            <input id="password" name="password" type="password" required />
          </div>
          {params.error ? <div className="message-error">{params.error}</div> : null}
          <button className="button" type="submit">
            Войти
          </button>
        </form>

        <div className="inline-actions section-space">
          <Link className="ghost-button" href="/register">
            Регистрация
          </Link>
          <Link className="ghost-button" href="/">
            На главную
          </Link>
        </div>
      </section>
    </main>
  );
}

