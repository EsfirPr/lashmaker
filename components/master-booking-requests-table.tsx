import type { BookingRequest } from "@/lib/types";

type MasterBookingRequestsTableProps = {
  requests: BookingRequest[];
};

function formatRequestDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function MasterBookingRequestsTable({ requests }: MasterBookingRequestsTableProps) {
  return (
    <div className="master-bookings-table-wrap">
      <table className="master-bookings-table">
        <thead>
          <tr>
            <th>Получена</th>
            <th>Клиент</th>
            <th>Контакт</th>
            <th>Услуга</th>
            <th>Комментарий</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr className="master-bookings-row" key={request.id}>
              <td>{formatRequestDate(request.created_at)}</td>
              <td>{request.name}</td>
              <td>{request.phone}</td>
              <td>{request.style}</td>
              <td>{request.notes || "Не указан"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
