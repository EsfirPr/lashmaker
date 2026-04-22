"use client";

import { useState } from "react";

type DeferredMapEmbedProps = {
  address: string;
  src: string;
};

export function DeferredMapEmbed({ address, src }: DeferredMapEmbedProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="contact-map-frame-wrap">
      {isVisible ? (
        <iframe
          allowFullScreen
          className="contact-map-frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-popups"
          src={src}
          title={`Яндекс Карта: ${address}`}
        />
      ) : (
        <div className="contact-map-placeholder">
          <div className="contact-map-placeholder__copy">
            <span className="eyebrow">Внешний сервис</span>
            <h3>Показать карту</h3>
            <p className="muted">
              Карта загружается с сервиса Яндекс и может использовать сторонние cookie.
            </p>
          </div>
          <button className="button" onClick={() => setIsVisible(true)} type="button">
            Показать карту
          </button>
        </div>
      )}
    </div>
  );
}
