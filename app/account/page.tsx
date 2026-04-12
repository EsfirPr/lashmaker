import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { logoutAction } from "@/app/auth-actions";
import { AccountBookingForm } from "@/components/account-booking-form";
import { AccountBookingCard } from "@/components/account-booking-card";
import { AccountProfileSettings } from "@/components/account-profile-settings";
import { requireUserRole } from "@/lib/auth/server";
import { listBookingsForClient } from "@/lib/booking-service";
import { getGreetingByTime } from "@/lib/utils";

export default async function AccountPage() {
  noStore();
  const user = await requireUserRole("client", "/login");
  const bookings = await listBookingsForClient(user.id);
  const profileName = user.name || bookings.find((booking) => booking.name.trim())?.name || null;
  const displayIdentity = profileName || user.phone || "гостья";
  const greeting = getGreetingByTime();

  return (
    <main className="page-shell">
      <div className="container">
        <section className="panel account-hero">
          <div className="account-hero__top">
            <span className="eyebrow">Личный кабинет клиента</span>
            <div className="account-hero__header-actions">
              <AccountProfileSettings
                name={profileName || ""}
                phone={user.phone || ""}
              />
              <form action={logoutAction}>
                <button className="ghost-button" type="submit">
                  Выйти
                </button>
              </form>
            </div>
          </div>
          <div className="account-hero__copy">
            <h1 className="page-title">
              {greeting}, {displayIdentity}
            </h1>
            <div className="account-hero__links">
              <Link className="button" href="#new-booking">
                Новая запись
              </Link>
              <Link className="ghost-button" href="/#portfolio">
                Портфолио
              </Link>
              <Link
                className="ghost-button"
                href={bookings[0] ? `/booking/${bookings[0].public_token}` : "/"}
              >
                Последняя запись
              </Link>
            </div>
          </div>
        </section>

        <section className="panel stack-card section-space account-section" id="new-booking">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Новая запись</span>
              <h2>Запишитесь прямо в кабинете</h2>
            </div>
          </div>
          <p className="muted">
            Выберите стиль, дату и свободное время. Имя и номер телефона подставятся автоматически
            из вашего аккаунта.
          </p>
          <AccountBookingForm
            phone={user.phone || "Телефон не указан"}
            profileName={profileName || "Имя не указано"}
          />
        </section>

        <section className="panel stack-card section-space account-section">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Мои записи</span>
              <h2>История и текущие визиты</h2>
            </div>
          </div>
          <div className="account-bookings-list section-space">
            {bookings.length === 0 ? (
              <div className="account-empty">
                <div className="account-empty__icon">L</div>
                <h3>У вас пока нет записей</h3>
                <p className="empty-state">
                  Когда вы оформите первую запись, здесь появятся дата, время, статус и пожелания.
                </p>
                <Link className="button" href="#new-booking">
                  Создать запись
                </Link>
              </div>
            ) : null}

            {bookings.map((booking) => (
              <AccountBookingCard booking={booking} key={booking.id} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
