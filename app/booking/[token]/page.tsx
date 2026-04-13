import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { SubmitButton } from "@/components/submit-button";
import { getBookingByToken } from "@/lib/booking-service";
import { formatDateLabel, formatSlotRange, formatStatusLabel, isBookingCancelable } from "@/lib/utils";
import { cancelBookingAction } from "./cancel-action";

type BookingPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function BookingPage({ params }: BookingPageProps) {
  noStore();
  const { token } = await params;
  const booking = await getBookingByToken(token);

  if (!booking || !booking.time_slots) {
    notFound();
  }

  const canCancel = booking.status === "confirmed" && isBookingCancelable(booking.time_slots);

  return (
    <main className="page-shell">
      <div className="container">
        <section className="panel booking-card">
          <header>
            <div>
              <div className="inline-actions">
                <span className="eyebrow">Детали записи</span>
                <span
                  className={`status-pill ${
                    booking.status === "confirmed" ? "status-confirmed" : "status-cancelled"
                  }`}
                >
                  {formatStatusLabel(booking.status)}
                </span>
              </div>
              <h1 className="page-title">Бронирование клиента</h1>
            </div>
          </header>

          <div className="meta-grid">
            <div className="booking-meta">
              <strong>Имя</strong>
              <span>{booking.name}</span>
            </div>
            <div className="booking-meta">
              <strong>Телефон</strong>
              <span>{booking.phone}</span>
            </div>
            <div className="booking-meta">
              <strong>Дата</strong>
              <span>{formatDateLabel(booking.time_slots.slot_date)}</span>
            </div>
            <div className="booking-meta">
              <strong>Время</strong>
              <span>{formatSlotRange(booking.time_slots)}</span>
            </div>
            <div className="booking-meta">
              <strong>Стиль</strong>
              <span>{booking.style}</span>
            </div>
            <div className="booking-meta">
              <strong>Статус</strong>
              <span>{formatStatusLabel(booking.status)}</span>
            </div>
          </div>

          <div className="note-box">
            <strong>Пожелания</strong>
            <p className="muted">{booking.notes || "Пожелания не указаны."}</p>
          </div>

          {canCancel ? (
            <form className="section-space" action={cancelBookingAction}>
              <input type="hidden" name="token" value={booking.public_token} />
              <SubmitButton className="danger-button">Отменить запись</SubmitButton>
            </form>
          ) : booking.status === "confirmed" ? (
            <div className="message-error section-space">
              Отмена возможна не позднее чем за 5 минут до начала записи.
            </div>
          ) : (
            <div className="message-success section-space">
              Запись уже отменена. Освободившийся слот снова доступен для бронирования.
            </div>
          )}

          <div className="inline-actions section-space">
            <Link className="ghost-button" href="/account">
              Вернуться в кабинет
            </Link>
            <Link className="ghost-button" href="/">
              Вернуться на главную
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
