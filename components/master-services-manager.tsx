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
const optimizedServiceImageMaxWidth = 720;
const optimizedServiceImageMaxHeight = 900;
const optimizedServiceImageQuality = 0.78;
type ServiceImageVariant = "primary" | "secondary";

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

function getOptimizedServiceImageName(fileName: string) {
  const nameWithoutExtension = fileName.replace(/\.[^.]+$/, "") || "service-image";
  return `${nameWithoutExtension}.webp`;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Не удалось прочитать изображение"));
    };

    image.src = objectUrl;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", optimizedServiceImageQuality);
  });
}

async function optimizeServiceImageForUpload(file: File) {
  const image = await loadImageFromFile(file);
  const scale = Math.min(
    1,
    optimizedServiceImageMaxWidth / image.naturalWidth,
    optimizedServiceImageMaxHeight / image.naturalHeight
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", {
    alpha: true
  });

  if (!context) {
    return file;
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToWebp(canvas);

  if (!blob || blob.type !== "image/webp") {
    return file;
  }

  return new File([blob], getOptimizedServiceImageName(file.name), {
    lastModified: Date.now(),
    type: "image/webp"
  });
}

function getServiceImageEndpoint(serviceId: string, variant: ServiceImageVariant) {
  const params = new URLSearchParams();

  if (variant === "secondary") {
    params.set("variant", "secondary");
  }

  const queryString = params.toString();
  return `/api/master/services/${serviceId}/image${queryString ? `?${queryString}` : ""}`;
}

async function uploadServiceImage(
  serviceId: string,
  file: File,
  variant: ServiceImageVariant = "primary"
) {
  const optimizedFile = await optimizeServiceImageForUpload(file);

  if (optimizedFile.size > maxServiceImageSize) {
    throw new Error("После оптимизации файл всё ещё больше 5 МБ");
  }

  const formData = new FormData();
  formData.append("image", optimizedFile);

  const response = await fetch(getServiceImageEndpoint(serviceId, variant), {
    method: "POST",
    body: formData,
    credentials: "include"
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Не удалось загрузить фото");
  }
}

async function deleteServiceImage(serviceId: string, variant: ServiceImageVariant = "primary") {
  const response = await fetch(getServiceImageEndpoint(serviceId, variant), {
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
  const [secondaryImageState, setSecondaryImageState] = useState<ImageUploadState>(initialImageUploadState);
  const router = useRouter();

  async function handleServiceImageChange(
    event: ChangeEvent<HTMLInputElement>,
    variant: ServiceImageVariant,
    setState: (state: ImageUploadState) => void
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateServiceImage(file);

    if (validationError) {
      setState({
        status: "error",
        message: validationError
      });
      event.target.value = "";
      return;
    }

    setState({
      status: "loading",
      message: "Фото оптимизируется и загружается..."
    });

    try {
      await uploadServiceImage(service.id, file, variant);
      event.target.value = "";
      setState({
        status: "success",
        message: variant === "secondary" ? "Дополнительное фото обновлено" : "Фото услуги обновлено"
      });
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Не удалось загрузить фото"
      });
    }
  }

  async function handleDeleteServiceImage(
    variant: ServiceImageVariant,
    setState: (state: ImageUploadState) => void
  ) {
    setState({
      status: "loading",
      message: "Фото удаляется..."
    });

    try {
      await deleteServiceImage(service.id, variant);
      setState({
        status: "success",
        message: variant === "secondary" ? "Дополнительное фото удалено" : "Фото услуги удалено"
      });
      router.refresh();
    } catch (error) {
      setState({
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
              onChange={(event) => handleServiceImageChange(event, "primary", setImageState)}
              type="file"
            />
            <p className="helper">JPG, PNG или WEBP до 5 МБ. Перед загрузкой сжимаем в WEBP.</p>
          </div>
        </div>

        <div className="master-service-editor__media-row">
          <div className="master-service-editor__image-preview">
            {service.secondary_image_url ? (
              <ResilientImage
                alt={`Дополнительное фото услуги ${service.name}`}
                className="master-service-editor__image"
                fallbackSrc="/images/cert-placeholder.svg"
                height={180}
                src={service.secondary_image_url}
                width={240}
              />
            ) : (
              <span>Дополнительное фото</span>
            )}
          </div>

          <div className="field master-service-editor__image-field">
            <label htmlFor={`service-secondary-image-${service.id}`}>
              {service.secondary_image_url ? "Заменить дополнительное фото" : "Добавить дополнительное фото"}
            </label>
            <input
              accept="image/jpeg,image/png,image/webp"
              disabled={secondaryImageState.status === "loading"}
              id={`service-secondary-image-${service.id}`}
              onChange={(event) => handleServiceImageChange(event, "secondary", setSecondaryImageState)}
              type="file"
            />
            <p className="helper">Показывается на главной по клику. Тоже сжимаем в WEBP.</p>
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
            onClick={() => handleDeleteServiceImage("primary", setImageState)}
            type="button"
          >
            {imageState.status === "loading" ? "Обновляем..." : "Удалить фото"}
          </button>
        </div>
      ) : null}

      {service.secondary_image_url ? (
        <div className="master-service-editor__delete-image">
          <button
            className="ghost-button"
            disabled={secondaryImageState.status === "loading"}
            onClick={() => handleDeleteServiceImage("secondary", setSecondaryImageState)}
            type="button"
          >
            {secondaryImageState.status === "loading" ? "Обновляем..." : "Удалить дополнительное фото"}
          </button>
        </div>
      ) : null}

      {imageState.status !== "idle" ? (
        <div className={imageState.status === "error" ? "message-error" : "message-success"}>
          {imageState.message}
        </div>
      ) : null}

      {secondaryImageState.status !== "idle" ? (
        <div className={secondaryImageState.status === "error" ? "message-error" : "message-success"}>
          {secondaryImageState.message}
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
  const selectedCreateSecondaryImageRef = useRef<File | null>(null);
  const [createImageState, setCreateImageState] = useState<ImageUploadState>(initialImageUploadState);
  const router = useRouter();

  useEffect(() => {
    if (createState.status !== "success") {
      return;
    }

    const selectedImages: Array<{
      file: File;
      variant: ServiceImageVariant;
    }> = [];

    if (selectedCreateImageRef.current instanceof File) {
      selectedImages.push({
        file: selectedCreateImageRef.current,
        variant: "primary"
      });
    }

    if (selectedCreateSecondaryImageRef.current instanceof File) {
      selectedImages.push({
        file: selectedCreateSecondaryImageRef.current,
        variant: "secondary"
      });
    }

    if (selectedImages.length === 0 || !createState.serviceId) {
      createFormRef.current?.reset();
      selectedCreateImageRef.current = null;
      selectedCreateSecondaryImageRef.current = null;
      return;
    }

    let isActive = true;

    async function uploadSelectedCreateImage() {
      setCreateImageState({
        status: "loading",
        message: "Фото оптимизируется и загружается..."
      });

      try {
        for (const image of selectedImages) {
          await uploadServiceImage(createState.serviceId as string, image.file, image.variant);
        }

        if (!isActive) {
          return;
        }

        setCreateImageState({
          status: "success",
          message: "Услуга и фото добавлены"
        });
        createFormRef.current?.reset();
        selectedCreateImageRef.current = null;
        selectedCreateSecondaryImageRef.current = null;
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

  function handleCreateSecondaryImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    selectedCreateSecondaryImageRef.current = null;
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

    selectedCreateSecondaryImageRef.current = file;
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
          <p className="helper">Можно добавить сразу или позже. JPG, PNG или WEBP до 5 МБ, сжимаем в WEBP.</p>
        </div>

        <div className="field master-service-editor__image-field">
          <label htmlFor="newServiceSecondaryImage">Дополнительное фото услуги</label>
          <input
            accept="image/jpeg,image/png,image/webp"
            id="newServiceSecondaryImage"
            onChange={handleCreateSecondaryImageChange}
            type="file"
          />
          <p className="helper">На главной откроется по клику. Тоже сжимаем в WEBP.</p>
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
