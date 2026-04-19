"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/submit-button";
import {
  createMasterServiceAction,
  deleteMasterServiceAction,
  type MasterFormState,
  updateMasterServiceAction
} from "@/app/master/dashboard/actions";
import type { MasterService } from "@/lib/types";

type MasterServicesManagerProps = {
  services: MasterService[];
};

const initialState: MasterFormState = {
  status: "idle",
  message: ""
};

const priceFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0
});

function MasterServiceRow({ service }: { service: MasterService }) {
  const [updateState, updateAction] = useActionState(updateMasterServiceAction, initialState);
  const [deleteState, deleteAction] = useActionState(deleteMasterServiceAction, initialState);

  return (
    <article className="master-service-editor">
      <form action={updateAction} className="master-service-editor__form">
        <input name="serviceId" type="hidden" value={service.id} />
        <div className="master-service-editor__grid">
          <div className="field">
            <label htmlFor={`service-name-${service.id}`}>Название</label>
            <input
              defaultValue={service.name}
              id={`service-name-${service.id}`}
              name="name"
              required
            />
          </div>
          <div className="field">
            <label htmlFor={`service-price-${service.id}`}>Цена, ₽</label>
            <input
              defaultValue={service.price}
              id={`service-price-${service.id}`}
              min="0"
              name="price"
              required
              step="1"
              type="number"
            />
          </div>
          <div className="field">
            <label htmlFor={`service-duration-${service.id}`}>Длительность</label>
            <input
              defaultValue={service.duration || ""}
              id={`service-duration-${service.id}`}
              name="duration"
              placeholder="Например, 2 часа"
            />
          </div>
          <div className="field master-service-editor__description">
            <label htmlFor={`service-description-${service.id}`}>Описание</label>
            <input
              defaultValue={service.description || ""}
              id={`service-description-${service.id}`}
              name="description"
              placeholder="Короткое пояснение для клиента"
            />
          </div>
        </div>

        <div className="master-service-editor__footer">
          <div className="master-service-editor__summary">
            <strong>{priceFormatter.format(service.price)}</strong>
            {service.duration ? <span className="muted">{service.duration}</span> : null}
          </div>

          <div className="master-service-editor__actions">
            {updateState.status !== "idle" ? (
              <div className={updateState.status === "error" ? "message-error" : "message-success"}>
                {updateState.message}
              </div>
            ) : null}
            <SubmitButton>Сохранить</SubmitButton>
          </div>
        </div>
      </form>

      <form action={deleteAction} className="master-service-editor__delete">
        <input name="serviceId" type="hidden" value={service.id} />
        {deleteState.status !== "idle" ? (
          <div className={deleteState.status === "error" ? "message-error" : "message-success"}>
            {deleteState.message}
          </div>
        ) : null}
        <SubmitButton className="danger-button">Удалить</SubmitButton>
      </form>
    </article>
  );
}

export function MasterServicesManager({ services }: MasterServicesManagerProps) {
  const [createState, createAction] = useActionState(createMasterServiceAction, initialState);
  const createFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (createState.status === "success") {
      createFormRef.current?.reset();
    }
  }, [createState.status]);

  return (
    <section className="panel stack-card master-section" id="services-manager">
      <div className="account-section__heading">
        <div>
          <span className="eyebrow">Прайс</span>
          <h2>Услуги и цены</h2>
        </div>
      </div>
      <p className="muted">
        Этот список сразу отображается на главной странице. Короткие названия и ясные описания
        обычно читаются лучше всего.
      </p>

      <form action={createAction} className="form-grid section-space" ref={createFormRef}>
        <div className="master-service-editor__grid">
          <div className="field">
            <label htmlFor="newServiceName">Название услуги</label>
            <input
              id="newServiceName"
              name="name"
              placeholder="Например, Наращивание ресниц"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="newServicePrice">Цена, ₽</label>
            <input
              id="newServicePrice"
              min="0"
              name="price"
              placeholder="3000"
              required
              step="1"
              type="number"
            />
          </div>
          <div className="field">
            <label htmlFor="newServiceDuration">Длительность</label>
            <input
              id="newServiceDuration"
              name="duration"
              placeholder="Например, 2 часа"
            />
          </div>
          <div className="field master-service-editor__description">
            <label htmlFor="newServiceDescription">Описание</label>
            <input
              id="newServiceDescription"
              name="description"
              placeholder="Короткое пояснение для клиента"
            />
          </div>
        </div>

        {createState.status !== "idle" ? (
          <div className={createState.status === "error" ? "message-error" : "message-success"}>
            {createState.message}
          </div>
        ) : null}

        <SubmitButton>Добавить услугу</SubmitButton>
      </form>

      <div className="master-services-stack section-space">
        {services.length === 0 ? (
          <p className="empty-state">Прайс пока пуст. Добавьте первую услугу.</p>
        ) : null}
        {services.map((service) => (
          <MasterServiceRow key={service.id} service={service} />
        ))}
      </div>
    </section>
  );
}
