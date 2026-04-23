"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type OptimizedServiceImageProps = {
  alt: string;
  className?: string;
  fallbackSrc: string;
  height?: number;
  loading?: "eager" | "lazy";
  src: string | null | undefined;
  width?: number;
};

const serviceImageSizes = "(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 448px";

export function OptimizedServiceImage({
  alt,
  className,
  fallbackSrc,
  height = 670,
  loading = "lazy",
  src,
  width = 448
}: OptimizedServiceImageProps) {
  const normalizedSrc = typeof src === "string" && src.trim() ? src.trim() : fallbackSrc;
  const [currentSrc, setCurrentSrc] = useState(normalizedSrc);

  useEffect(() => {
    setCurrentSrc(normalizedSrc);
  }, [normalizedSrc]);

  return (
    <Image
      alt={alt}
      className={className}
      height={height}
      loading={loading}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
      quality={60}
      sizes={serviceImageSizes}
      src={currentSrc}
      width={width}
    />
  );
}
