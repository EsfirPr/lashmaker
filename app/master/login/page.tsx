import Link from "next/link";
import { createMasterIfNotExists } from "@/lib/auth/service";
import { loginMasterAction } from "./actions";

type MasterLoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function MasterLoginPage({ searchParams }: MasterLoginPageProps) {
  const params = (await searchParams) || {};
  await createMasterIfNotExists();

  return (
    <main className="page-shell auth-shell">
      <section className="panel auth-card">
        <span className="eyebrow">Вход мастера</span>
        <h1 className="page-title">Master Login</h1>
        <p className="muted">Авторизация мастера выполняется по nickname и паролю из seed-аккаунта.</p>

        <form className="form-grid section-space" action={loginMasterAction}>
          <div className="field">
            <label htmlFor="nickname">Nickname</label>
            <input id="nickname" name="nickname" placeholder="SulamitaMaster" required />
          </div>
          <div className="field">
            <label htmlFor="password">Пароль</label>
            <input id="password" name="password" type="password" required />
          </div>
          {params.error ? <div className="message-error">{params.error}</div> : null}
          <button className="button" type="submit">
            Войти как мастер
          </button>
        </form>

        <div className="inline-actions section-space">
          <Link className="ghost-button" href="/">
            На главную
          </Link>
        </div>
      </section>
    </main>
  );
}

