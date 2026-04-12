import Link from "next/link";
import { RegisterFlow } from "@/components/register-flow";

export default function RegisterPage() {

  return (
    <main className="page-shell auth-shell">
      <section className="panel auth-card">
        <span className="eyebrow">Новый клиент</span>
        <h1 className="page-title">Регистрация</h1>
        <p className="muted">
          Сначала мы отправим одноразовый код в SMS, а после подтверждения сразу откроем ваш кабинет.
        </p>

        <RegisterFlow />

        <p className="helper section-space">
          Продолжая регистрацию, вы подтверждаете согласие с{" "}
          <Link href="/privacy">
            Политикой конфиденциальности
          </Link>
          .
        </p>

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
