import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { logoutAction } from "@/app/auth-actions";
import { AccountBookingForm } from "@/components/account-booking-form";
import { AccountBookingsHistory } from "@/components/account-bookings-history";
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
            Выберите стиль, период и свободное время, затем подтвердите запись.
          </p>
          <AccountBookingForm />
        </section>

        <section className="panel stack-card section-space account-section">
          <div className="account-section__heading">
            <div>
              <span className="eyebrow">Мои записи</span>
              <h2>История и текущие визиты</h2>
            </div>
          </div>
          <AccountBookingsHistory bookings={bookings} />
        </section>
      </div>
    </main>
  );
}
