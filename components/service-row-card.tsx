"use client";

import { useState } from "react";
import { OptimizedServiceImage } from "@/components/optimized-service-image";
import type { MasterService } from "@/lib/types";

type ServiceRowCardProps = {
  bookingHref: string;
  formattedPrice: string;
  service: MasterService;
};

export function ServiceRowCard({ bookingHref, formattedPrice, service }: ServiceRowCardProps) {
  const [isSecondaryVisible, setIsSecondaryVisible] = useState(false);
  const primaryImageUrl = service.image_url || service.secondary_image_url;
  const canToggleSecondary = Boolean(service.image_url && service.secondary_image_url);

  return (
    <article className="service-row">
      {primaryImageUrl ? (
        <button
          aria-label={
            canToggleSecondary
              ? `Показать дополнительное фото услуги ${service.name}`
              : `Фото услуги ${service.name}`
          }
          aria-pressed={canToggleSecondary ? isSecondaryVisible : undefined}
          className={`service-row__image-wrap${canToggleSecondary ? " service-row__image-wrap--interactive" : ""}${
            isSecondaryVisible ? " is-secondary-visible" : ""
          }`}
          disabled={!canToggleSecondary}
          onClick={() => {
            if (canToggleSecondary) {
              setIsSecondaryVisible((currentValue) => !currentValue);
            }
          }}
          type="button"
        >
          <OptimizedServiceImage
            alt={`Фото услуги ${service.name}`}
            className="service-row__image service-row__image--primary"
            fallbackSrc="/images/cert-placeholder.svg"
            height={800}
            loading="lazy"
            src={primaryImageUrl}
            width={640}
          />
          {service.secondary_image_url && service.image_url ? (
            <OptimizedServiceImage
              alt=""
              aria-hidden="true"
              className="service-row__image service-row__image--secondary"
              fallbackSrc="/images/cert-placeholder.svg"
              height={800}
              loading="lazy"
              src={service.secondary_image_url}
              width={640}
            />
          ) : null}
          {canToggleSecondary ? <span className="service-row__image-hint">Ещё фото</span> : null}
        </button>
      ) : null}
      <div className="service-row__content">
        <div className="service-row__top">
          <strong>{service.name}</strong>
          {service.duration ? <span className="muted">{service.duration}</span> : null}
        </div>
        {service.description ? <p className="muted">{service.description}</p> : null}
      </div>
      <div className="service-row__side">
        <strong className="service-row__price">{formattedPrice}</strong>
        <a
          className="ghost-button service-row__cta"
          href={bookingHref}
        >
          Записаться
        </a>
      </div>
    </article>
  );
}
