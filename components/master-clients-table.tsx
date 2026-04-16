"use client";

import { useState } from "react";
import type { ClientOverview } from "@/lib/types";

type MasterClientsTableProps = {
  clients: ClientOverview[];
};

const clientsPerPage = 5;

export function MasterClientsTable({ clients }: MasterClientsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(clients.length / clientsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * clientsPerPage;
  const visibleClients = clients.slice(pageStart, pageStart + clientsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="master-clients-list section-space">
      {clients.length === 0 ? <p className="empty-state">Клиентов пока нет.</p> : null}

      {clients.length > 0 ? (
        <>
          <div className="master-clients-table-wrap">
            <table className="master-clients-table">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Телефон</th>
                  <th>Количество записей</th>
                  <th>Ближайшая запись</th>
                </tr>
              </thead>
              <tbody>
                {visibleClients.map((client) => (
                  <tr className="master-clients-row" key={client.id}>
                    <td>{client.displayName || client.phone || "Клиент без имени"}</td>
                    <td>{client.phone || "Телефон не указан"}</td>
                    <td>{client.bookingsCount}</td>
                    <td>{client.nextBookingLabel || "Пока не запланирована"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {clients.length > clientsPerPage ? (
            <nav aria-label="Пагинация клиентов" className="master-pagination section-space">
              <div className="master-pagination__track">
                <button
                  className={`master-pagination__item master-pagination__item--nav${
                    safeCurrentPage === 1 ? " is-disabled" : ""
                  }`}
                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  type="button"
                >
                  Назад
                </button>

                <div className="master-pagination__pages">
                  {pageNumbers.map((page) => (
                    <button
                      aria-current={page === safeCurrentPage ? "page" : undefined}
                      className={`master-pagination__item${
                        page === safeCurrentPage ? " is-active" : ""
                      }`}
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      type="button"
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className={`master-pagination__item master-pagination__item--nav${
                    safeCurrentPage === totalPages ? " is-disabled" : ""
                  }`}
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  type="button"
                >
                  Вперёд
                </button>
              </div>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
