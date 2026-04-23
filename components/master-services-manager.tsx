"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { initialMasterFormState, type MasterFormState } from "@/app/master/dashboard/state";
import { ResilientImage } from "@/components/resilient-image";
import { SubmitButton } from "@/components/submit-button";
import {
  createMasterServiceAction,
  deleteMasterServiceAction,
  updateMasterServiceAction
} from "@/app/master/dashboard/actions";
import type { MasterService } from "@/lib/types";

type MasterServicesManagerProps = {
  services: MasterService[];
};

const priceFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0
});

const allowedServiceImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxServiceImageSize = 5 * 1024 * 1024;

type ImageUploadState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

const initialImageUploadState: ImageUploadState = {
  status: "idle",
  message: ""
};

function validateServiceImage(file: File) {
  if (!allowedServiceImageTypes.has(file.type)) {
    return "Загрузите JPG, PNG или WEBP";
  }

  if (file.size > maxServiceImageSize) {
    return "Файл должен быть не больше 5 МБ";
  }

  return null;
}

async function uploadServiceImage(serviceId: string, file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`/api/master/services/${serviceId}/image`, {
    method: "POST",
    body: formData,
    credentials: "include"
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Не удалось загрузить фото");
  }
}

async function deleteServiceImage(serviceId: string) {
  const response = await fetch(`/api/master/services/${serviceId}/image`, {
    method: "DELETE",
    credentials: "include"
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Не удалось удалить фото");
  }
}

function MasterServiceRow({ service }: { service: MasterService }) {
  const [updateState, updateAction] = useActionState(updateMasterServiceAction, initialMasterFormState);
  const [deleteState, deleteAction] = useActionState(deleteMasterServiceAction, initialMasterFormState);
  const [imageState, setImageState] = useState<ImageUploadState>(initialImageUploadState);
  const router = useRouter();

  async function handleServiceImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateServiceImage(file);

    if (validationError) {
      setImageState({
        status: "error",
        message: validationError
      });
      event.target.value = "";
      return;
    }

    setImageState({
      status: "loading",
      message: "Фото загружается..."
    });

    try {
      await uploadServiceImage(service.id, file);
      event.target.value = "";
      setImageState({
        status: "success",
        message: "Фото услуги обновлено"
      });
      router.refresh();
    } catch (error) {
      setImageState({
        status: "error",
        message: error instanceof Error ? error.message : "Не удалось загрузить фото"
      });
    }
  }

  async function handleDeleteServiceImage() {
    setImageState({
      status: "loading",
      message: "Фото удаляется..."
    });

    try {
      await deleteServiceImage(service.id);
      setImageState({
        status: "success",
        message: "Фото услуги удалено"
      });
      router.refresh();
    } catch (error) {
      setImageState({
        status: "error",
        message: error instanceof Error ? error.message : "Не удалось удалить фото"
      });
    }
  }

  return (
    <article className="master-service-editor">
      <form action={updateAction} className="master-service-editor__form">
        <input name="serviceId" type="hidden" value={service.id} />
        <div className="master-service-editor__media-row">
          <div className="master-service-editor__image-preview">
            {service.image_url ? (
              <ResilientImage
                alt={`Фото услуги ${service.name}`}
                className="master-service-editor__image"
                fallbackSrc="/images/cert-placeholder.svg"
                height={180}
                src={service.image_url}
                width={240}
              />
            ) : (
              <span>Фото услуги</span>
            )}
          </div>

          <div className="field master-service-editor__image-field">
            <label htmlFor={`service-image-${service.id}`}>
              {service.image_url ? "Заменить фото" : "Добавить фото"}
            </label>
            <input
              accept="image/jpeg,image/png,image/webp"
              disabled={imageState.status === "loading"}
              id={`service-image-${service.id}`}
              onChange={handleServiceImageChange}
              type="file"
            />
            <p className="helper">JPG, PNG или WEBP до 5 МБ.</p>
          </div>
        </div>

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

      {service.image_url ? (
        <div className="master-service-editor__delete-image">
          <button
            className="ghost-button"
            disabled={imageState.status === "loading"}
            onClick={handleDeleteServiceImage}
            type="button"
          >
            {imageState.status === "loading" ? "Обновляем..." : "Удалить фото"}
          </button>
        </div>
      ) : null}

      {imageState.status !== "idle" ? (
        <div className={imageState.status === "error" ? "message-error" : "message-success"}>
          {imageState.message}
        </div>
      ) : null}

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
  const [createState, createAction] = useActionState(createMasterServiceAction, initialMasterFormState);
  const createFormRef = useRef<HTMLFormElement>(null);
  const selectedCreateImageRef = useRef<File | null>(null);
  const [createImageState, setCreateImageState] = useState<ImageUploadState>(initialImageUploadState);
  const router = useRouter();

  useEffect(() => {
    if (createState.status !== "success") {
      return;
    }

    const selectedImage = selectedCreateImageRef.current;

    if (!selectedImage || !createState.serviceId) {
      createFormRef.current?.reset();
      selectedCreateImageRef.current = null;
      return;
    }

    let isActive = true;

    async function uploadSelectedCreateImage() {
      setCreateImageState({
        status: "loading",
        message: "Фото загружается..."
      });

      try {
        await uploadServiceImage(createState.serviceId as string, selectedImage as File);

        if (!isActive) {
          return;
        }

        setCreateImageState({
          status: "success",
          message: "Услуга и фото добавлены"
        });
        createFormRef.current?.reset();
        selectedCreateImageRef.current = null;
        router.refresh();
      } catch (error) {
        if (!isActive) {
          return;
        }

        setCreateImageState({
          status: "error",
          message: error instanceof Error ? error.message : "Услуга добавлена, но фото не загрузилось"
        });
      }
    }

    uploadSelectedCreateImage();

    return () => {
      isActive = false;
    };
  }, [createState.status, createState.serviceId, router]);

  function handleCreateImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    selectedCreateImageRef.current = null;
    setCreateImageState(initialImageUploadState);

    if (!file) {
      return;
    }

    const validationError = validateServiceImage(file);

    if (validationError) {
      setCreateImageState({
        status: "error",
        message: validationError
      });
      event.target.value = "";
      return;
    }

    selectedCreateImageRef.current = file;
  }

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
        <div className="field master-service-editor__image-field">
          <label htmlFor="newServiceImage">Фото услуги</label>
          <input
            accept="image/jpeg,image/png,image/webp"
            id="newServiceImage"
            onChange={handleCreateImageChange}
            type="file"
          />
          <p className="helper">Можно добавить сразу или позже. JPG, PNG или WEBP до 5 МБ.</p>
        </div>

        {createImageState.status !== "idle" ? (
          <div className={createImageState.status === "error" ? "message-error" : "message-success"}>
            {createImageState.message}
          </div>
        ) : null}

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
