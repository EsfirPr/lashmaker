import Link from "next/link";
import { BookingForm } from "@/components/booking-form";

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <div className="brand">LashMaker</div>
          <div className="nav-links">
            <Link className="ghost-button" href="/admin">
              Расписание мастера
            </Link>
          </div>
        </nav>

        <section className="hero">
          <div className="panel hero-copy">
            <span className="eyebrow">MVP для записи на ресницы</span>
            <h1>Добро пожаловать</h1>
            <p className="lead">
              Клиент видит понятную страницу услуги, выбирает только свободные окна и получает
              персональную ссылку на свою запись. Мастер управляет расписанием в одном месте.
            </p>

            <div className="feature-grid">
              <article className="feature">
                <h3>Только свободные слоты</h3>
                <p>Время выбирается из доступных окон, поэтому двойных бронирований не возникает.</p>
              </article>
              <article className="feature">
                <h3>Публичная ссылка</h3>
                <p>После записи создается уникальный токен, по которому клиент видит детали визита.</p>
              </article>
              <article className="feature">
                <h3>Подготовка под SMS</h3>
                <p>Подтверждения и напоминания вынесены в серверную абстракцию для провайдера.</p>
              </article>
            </div>

            <div className="stats-grid">
              <div className="stat">
                <strong>1 страница</strong>
                <span className="muted">для записи клиента</span>
              </div>
              <div className="stat">
                <strong>14 дней</strong>
                <span className="muted">обзора в панели мастера</span>
              </div>
              <div className="stat">
                <strong>0 лишнего</strong>
                <span className="muted">только базовый рабочий MVP</span>
              </div>
            </div>
          </div>

          <section className="panel hero-form" id="booking">
            <h2>Онлайн-запись</h2>
            <p className="muted">
              Заполните форму, выберите свободную дату и время, и мы сразу создадим вашу запись.
            </p>
            <div className="section-space">
              <BookingForm />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
