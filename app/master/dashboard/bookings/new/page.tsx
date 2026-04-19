import Link from "next/link";
import { requireUserRole } from "@/lib/auth/server";
import { MasterBookingCreateForm } from "@/components/master-booking-create-form";

export default async function MasterNewBookingPage() {
  await requireUserRole("master", "/login");

  return (
    <main className="page-shell">
      <div className="container">
        <section className="panel stack-card master-section">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Новая запись</span>
              <h1 className="page-title">Записать клиента</h1>
            </div>
            <Link className="ghost-button" href="/master/dashboard#bookings">
              Назад в кабинет
            </Link>
          </div>

          <p className="muted">
            Выберите свободный слот и заполните данные клиента. Занятые окна по-прежнему недоступны
            для ручной записи.
          </p>

          <MasterBookingCreateForm />
        </section>
      </div>
    </main>
  );
}
