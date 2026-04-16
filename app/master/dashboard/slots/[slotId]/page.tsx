import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { requireUserRole } from "@/lib/auth/server";
import { getScheduleSlotDetail } from "@/lib/booking-service";
import { formatDateLabel, formatSlotRange } from "@/lib/utils";
import { deleteTimeSlotFromDetailsAction } from "./actions";

type MasterSlotDetailsPageProps = {
  params: Promise<{
    slotId: string;
  }>;
};

export default async function MasterSlotDetailsPage({ params }: MasterSlotDetailsPageProps) {
  noStore();
  await requireUserRole("master", "/login");
  const { slotId } = await params;
  const slot = await getScheduleSlotDetail(slotId);

  if (!slot) {
    notFound();
  }

  return (
    <main className="page-shell">
      <div className="container">
        <section className="panel booking-card">
          <header>
            <div>
              <div className="booking-card__badges">
                <span className="eyebrow">Детали слота</span>
                <span
                  className={`status-pill ${slot.activeBooking ? "status-confirmed" : "status-free"}`}
                >
                  {slot.activeBooking ? "Занято" : "Свободно"}
                </span>
              </div>
              <h1 className="page-title">{formatDateLabel(slot.slot_date)}</h1>
            </div>
          </header>

          <div className="meta-grid">
            <div className="booking-meta">
              <strong>Дата</strong>
              <span>{formatDateLabel(slot.slot_date)}</span>
            </div>
            <div className="booking-meta">
              <strong>Время</strong>
              <span>{formatSlotRange(slot)}</span>
            </div>
            <div className="booking-meta">
              <strong>Статус</strong>
              <span>{slot.activeBooking ? "Занято" : "Свободно"}</span>
            </div>
            <div className="booking-meta">
              <strong>Клиент</strong>
              <span>{slot.activeBooking ? slot.activeBooking.name : "Свободное окно"}</span>
            </div>
          </div>

          {slot.activeBooking ? (
            <div className="inline-actions section-space">
              <Link className="button" href={`/booking/${slot.activeBooking.public_token}`}>
                Открыть детали записи
              </Link>
              <Link className="ghost-button" href="/master/dashboard#schedule">
                Вернуться к расписанию
              </Link>
            </div>
          ) : (
            <div className="inline-actions section-space">
              <form action={deleteTimeSlotFromDetailsAction}>
                <input name="slotId" type="hidden" value={slot.id} />
                <button className="danger-button" type="submit">
                  Удалить окно
                </button>
              </form>
              <Link className="ghost-button" href="/master/dashboard#schedule">
                Вернуться к расписанию
              </Link>
            </div>
          )}

          {slot.cancelledBookings.length > 0 ? (
            <div className="note-box">
              <strong>История отмен</strong>
              <div className="master-cancelled-stack section-space">
                {slot.cancelledBookings.map((booking) => (
                  <div className="cancelled-item" key={booking.id}>
                    <header>
                      <strong>{booking.name}</strong>
                      <span className="status-pill status-cancelled">Отменена</span>
                    </header>
                    <p>{booking.phone}</p>
                    <p className="muted">
                      {booking.style}
                      {booking.notes ? ` • ${booking.notes}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
