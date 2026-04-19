import Link from "next/link";
import { requireUserRole } from "@/lib/auth/server";
import { MasterBookingCreateForm } from "@/components/master-booking-create-form";
import { STYLE_OPTIONS } from "@/lib/validators";

type MasterNewBookingPageProps = {
  searchParams?: Promise<{
    style?: string;
  }>;
};

export default async function MasterNewBookingPage({ searchParams }: MasterNewBookingPageProps) {
  await requireUserRole("master", "/login");
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
