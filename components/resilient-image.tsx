"use client";

import { useEffect, useState } from "react";

type ResilientImageProps = {
  alt: string;
  className?: string;
  fallbackSrc: string;
  src: string | null | undefined;
};

export function ResilientImage({ alt, className, fallbackSrc, src }: ResilientImageProps) {
  const normalizedSrc = typeof src === "string" && src.trim() ? src.trim() : fallbackSrc;
  const [currentSrc, setCurrentSrc] = useState(normalizedSrc);

  useEffect(() => {
    setCurrentSrc(normalizedSrc);
  }, [normalizedSrc]);

  return (
    <img
      alt={alt}
      className={className}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
      src={currentSrc}
    />
  );
}
