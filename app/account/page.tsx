import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { logoutAction } from "@/app/auth-actions";
import { AccountBookingForm } from "@/components/account-booking-form";
import { AccountBookingCard } from "@/components/account-booking-card";
import { requireUserRole } from "@/lib/auth/server";
import { listBookingsForClient } from "@/lib/booking-service";

export default async function AccountPage() {
  noStore();
  const user = await requireUserRole("client", "/login");
  const bookings = await listBookingsForClient(user.id);
  const nextBooking = bookings.find((booking) => booking.status === "confirmed" && booking.time_slots);
  const profileName = user.name || bookings.find((booking) => booking.name.trim())?.name || null;
  const displayIdentity = profileName || user.phone || "гостья";

  return (
    <main className="page-shell">
      <div className="container">
        <section className="panel account-hero">
          <div className="account-hero__copy">
            <span className="eyebrow">Личный кабинет клиента</span>
            <h1 className="page-title">Здравствуйте, {displayIdentity}</h1>
            <p className="lead">
              Здесь собраны ваши записи, статус визитов и быстрые действия. Кабинет показывает
              только бронирования, привязанные к текущему аккаунту.
            </p>
          </div>
          <div className="account-hero__stats">
            <div className="stat">
              <strong>{bookings.length}</strong>
              <span className="muted">всего записей</span>
            </div>
            <div className="stat">
              <strong>
                {
                  bookings.filter((booking) => booking.status === "confirmed").length
                }
              </strong>
              <span className="muted">активных визитов</span>
            </div>
            <div className="stat">
              <strong>{nextBooking ? "Есть" : "Нет"}</strong>
              <span className="muted">ближайшей записи</span>
            </div>
          </div>
        </section>

        <section className="page-columns">
          <section className="panel stack-card account-section">
            <div className="account-section__heading">
              <div>
                <span className="eyebrow">Профиль</span>
                <h2>Ваши данные</h2>
              </div>
              <button className="ghost-button" type="button" disabled>
                Редактирование скоро
              </button>
            </div>
            <div className="account-profile-grid section-space">
              <div className="booking-meta">
                <strong>Телефон</strong>
                <span>{user.phone || "Не указан"}</span>
              </div>
              <div className="booking-meta">
                <strong>Имя</strong>
                <span>{profileName || "Добавится после записи"}</span>
              </div>
              <div className="booking-meta">
                <strong>Роль</strong>
                <span>Клиент</span>
              </div>
              <div className="booking-meta">
                <strong>Ближайшая запись</strong>
                <span>{nextBooking?.time_slots ? "Запланирована" : "Пока нет"}</span>
              </div>
            </div>
          </section>

          <aside className="panel stack-card account-section">
            <div className="account-section__heading">
              <div>
                <span className="eyebrow">Быстрые действия</span>
                <h2>Что можно сделать</h2>
              </div>
            </div>
            <div className="account-actions section-space">
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
              <form action={logoutAction}>
                <button className="ghost-button" type="submit">
                  Выйти
                </button>
              </form>
            </div>
            <p className="helper">
              Если нужно отменить визит, сделайте это прямо в карточке записи ниже.
            </p>
            <p className="helper">
              Подробнее об обработке персональных данных можно прочитать в{" "}
              <Link href="/privacy">
                Политике конфиденциальности
              </Link>
              .
            </p>
          </aside>
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
