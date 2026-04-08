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
        <div className="inline-actions">
          <Link className="ghost-button" href="/">
            На главную
          </Link>
        </div>
        <h1 className="page-title">Вход</h1>
        <p className="muted">
          Войдите по номеру телефона. После авторизации вы попадете в свой кабинет.
        </p>

        <form className="form-grid section-space" action={loginUserAction}>
          <div className="field">
            <label htmlFor="identifier">Номер телефона</label>
            <input
              id="identifier"
              name="identifier"
              placeholder="+7 999 123-45-67"
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

        <p className="helper section-space">
          Продолжая использование сайта, вы соглашаетесь с{" "}
          <Link href="/privacy">
            Политикой конфиденциальности
          </Link>
          .
        </p>

        <div className="inline-actions section-space">
          <Link className="ghost-button" href="/register">
            Регистрация
          </Link>
        </div>
      </section>
    </main>
  );
}
