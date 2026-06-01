import Link from "next/link";
import { requireUserRole } from "@/lib/auth/server";
import { MasterBookingCreateForm } from "@/components/master-booking-create-form";
import { ENABLE_BOOKING } from "@/lib/features";
import { STYLE_OPTIONS } from "@/lib/validators";

type MasterNewBookingPageProps = {
  searchParams?: Promise<{
    style?: string;
  }>;
};

export default async function MasterNewBookingPage({ searchParams }: MasterNewBookingPageProps) {
  await requireUserRole("master", "/login");

  if (!ENABLE_BOOKING) {
    return (
      <main className="page-shell">
        <div className="container">
          <section className="panel stack-card master-section">
            <span className="eyebrow">Кабинет мастера</span>
            <h1 className="page-title">Запись временно отключена</h1>
            <p className="muted">
              Создание записей скрыто на время тестирования интерфейса.
            </p>
            <div className="inline-actions section-space">
              <Link className="ghost-button" href="/master/dashboard">
                Назад в кабинет
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const filters = (await searchParams) || {};
  const requestedStyle = STYLE_OPTIONS.includes(filters.style as (typeof STYLE_OPTIONS)[number])
    ? filters.style
    : undefined;

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

          <MasterBookingCreateForm initialStyle={requestedStyle} />
        </section>
      </div>
    </main>
  );
}
