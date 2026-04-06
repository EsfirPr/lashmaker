import Link from "next/link";
import { registerClientAction } from "./actions";

type RegisterPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = (await searchParams) || {};

  return (
    <main className="page-shell auth-shell">
      <section className="panel auth-card">
        <span className="eyebrow">Новый клиент</span>
        <h1 className="page-title">Регистрация</h1>
        <p className="muted">Создайте аккаунт по имени, номеру телефона и паролю, чтобы хранить свои записи.</p>

        <form className="form-grid section-space" action={registerClientAction}>
          <div className="field">
            <label htmlFor="name">Имя</label>
            <input id="name" name="name" placeholder="Например, Алина" required />
          </div>
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
            Создать аккаунт
          </button>
        </form>

        <div className="inline-actions section-space">
          <Link className="ghost-button" href="/login">
            Уже есть аккаунт
          </Link>
          <Link className="ghost-button" href="/">
            На главную
          </Link>
        </div>
      </section>
    </main>
  );
}
