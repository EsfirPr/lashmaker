import Link from "next/link";
import { LoginFlow } from "@/components/login-flow";
import { loginMasterAction } from "./actions";

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
        <div className="inline-actions login-header">
          <Link className="ghost-button" href="/">
            На главную
          </Link>
          <Link className="ghost-button" href="/register">
            Регистрация
          </Link>
        </div>
        <h1 className="page-title">Вход</h1>
        <p className="muted">
          Введите номер телефона, получите одноразовый код в SMS и войдите без пароля.
        </p>

        <LoginFlow />

        <section className="auth-secondary section-space">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Мастер</span>
              <h2>Вход по паролю</h2>
            </div>
          </div>
          <form className="form-grid section-space" action={loginMasterAction}>
            <div className="field">
              <label htmlFor="nickname">Nickname</label>
              <input autoComplete="username" id="nickname" name="nickname" required />
            </div>
            <div className="field">
              <label htmlFor="password">Пароль</label>
              <input
                autoComplete="current-password"
                id="password"
                name="password"
                type="password"
                required
              />
            </div>
            {params.error ? <div className="message-error">{params.error}</div> : null}
            <button className="ghost-button" type="submit">
              Войти как мастер
            </button>
          </form>
        </section>

        <p className="helper section-space">
          Продолжая использование сайта, вы соглашаетесь с{" "}
          <Link href="/privacy">
            Политикой конфиденциальности
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
