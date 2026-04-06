import Link from "next/link";
import { loginUserAction } from "./actions";

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
        <span className="eyebrow">Единый вход</span>
        <h1 className="page-title">Вход</h1>
        <p className="muted">
          Войдите по телефону клиента или nickname мастера. После авторизации мы сами откроем
          нужный кабинет.
        </p>

        <form className="form-grid section-space" action={loginUserAction}>
          <div className="field">
            <label htmlFor="identifier">Телефон или nickname</label>
            <input
              id="identifier"
              name="identifier"
              placeholder="+7 999 123-45-67 или SulamitaMaster"
              required
            />
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
