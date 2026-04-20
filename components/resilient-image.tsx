"use client";

import type { ImgHTMLAttributes } from "react";
import { useEffect, useState } from "react";

type ResilientImageProps = {
  alt: string;
  className?: string;
  fallbackSrc: string;
  src: string | null | undefined;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "className" | "src">;

export function ResilientImage({
  alt,
  className,
  fallbackSrc,
  src,
  ...imgProps
}: ResilientImageProps) {
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
      {...imgProps}
    />
  );
}
